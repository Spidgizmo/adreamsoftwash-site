-- Referral rewards now apply to the customer's entire eligible Monthly bin-cleaning charge.
-- Customer moves remain pending until staff confirms the new address can be served,
-- then the address transition is applied atomically without replacing customer history.

create or replace function public.current_monthly_bin_charge(p_customer_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with current_subscription as (
    select s.id, v.base_price_cents, v.bins_included, v.additional_bin_price_cents
    from public.subscriptions s
    join public.service_plan_versions v on v.id = s.service_plan_version_id
    join public.service_plans p on p.id = v.plan_id
    where s.customer_id = p_customer_id
      and p.id = 'monthly'
      and s.subscription_status = 'active'
      and s.payment_status in ('paid','test_paid')
      and s.ended_at is null
    order by s.started_at desc nulls last, s.id desc
    limit 1
  ), current_address as (
    select a.id
    from public.service_addresses a
    where a.customer_id = p_customer_id and a.is_current
    limit 1
  ), latest_configuration as (
    select c.recurring_price_cents
    from public.customer_bin_configurations c
    join current_address a on a.id = c.service_address_id
    where c.customer_id = p_customer_id
      and c.effective_service_at <= now()
      and c.recurring_price_cents is not null
    order by c.effective_service_at desc, c.created_at desc
    limit 1
  ), active_bins as (
    select count(*)::integer as bin_count
    from public.bins b
    join current_address a on a.id = b.service_address_id
    where b.active
  )
  select coalesce(
    (select recurring_price_cents from latest_configuration),
    greatest(0, coalesce(s.base_price_cents,0))
      + greatest(0, coalesce(b.bin_count,0) - greatest(0,coalesce(s.bins_included,1)))
        * greatest(0,coalesce(s.additional_bin_price_cents,0))
  )::integer
  from current_subscription s
  cross join active_bins b;
$$;

revoke all on function public.current_monthly_bin_charge(uuid) from public;
grant execute on function public.current_monthly_bin_charge(uuid) to service_role;

create or replace function public.process_mature_referral_rewards()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  relationship_record public.referral_relationships%rowtype;
  monthly_charge integer;
  next_sequence integer;
  reward_percent smallint;
  reward_cents integer;
  processed integer := 0;
begin
  for relationship_record in
    select relationship.*
    from public.referral_relationships relationship
    where relationship.status='seven_day_hold'
      and relationship.hold_until is not null
      and relationship.hold_until <= now()
    order by relationship.hold_until,relationship.id
    for update skip locked
  loop
    if not exists (
      select 1
      from public.subscriptions subscription
      join public.service_plan_versions version on version.id=subscription.service_plan_version_id
      join public.service_plans plan on plan.id=version.plan_id and plan.referral_eligible
      where subscription.customer_id=relationship_record.referred_customer_id
        and subscription.subscription_status='active'
        and subscription.payment_status in ('paid','test_paid')
    ) then
      continue;
    end if;

    monthly_charge := public.current_monthly_bin_charge(relationship_record.referrer_customer_id);
    if monthly_charge is null or monthly_charge <= 0 then continue; end if;

    perform pg_advisory_xact_lock(hashtextextended(relationship_record.referrer_customer_id::text,0));
    if exists (
      select 1 from public.referral_credits
      where referral_relationship_id=relationship_record.id
    ) then
      continue;
    end if;

    select coalesce(max(referral_sequence),0)+1
    into next_sequence
    from public.referral_credits
    where customer_id=relationship_record.referrer_customer_id;

    reward_percent := case when next_sequence=1 then 50 else 25 end;
    reward_cents := greatest(1,round(monthly_charge * reward_percent / 100.0)::integer);

    update public.referral_relationships
    set status='qualified'
    where id=relationship_record.id and status='seven_day_hold';

    insert into public.referral_credits(
      customer_id,referral_relationship_id,amount_cents,remaining_cents,status,
      earned_at,expires_at,referral_sequence,reward_percent
    ) values (
      relationship_record.referrer_customer_id,relationship_record.id,
      reward_cents,reward_cents,'issued',now(),now()+interval '1 year',
      next_sequence,reward_percent
    );

    update public.referral_relationships
    set status='credit_issued'
    where id=relationship_record.id;

    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

-- Existing issued rewards that have not been consumed are recalculated under the new
-- whole-Monthly-charge rule. Clear Stripe arming so the processor replaces any old
-- amount-specific discount on the subscription.
with corrected as (
  select
    c.id,
    greatest(1, round(public.current_monthly_bin_charge(c.customer_id) * c.reward_percent / 100.0)::integer) as corrected_cents
  from public.referral_credits c
  where c.status='issued'
    and c.remaining_cents > 0
    and c.stripe_applied_invoice_id is null
    and public.current_monthly_bin_charge(c.customer_id) is not null
)
update public.referral_credits c
set amount_cents = corrected.corrected_cents,
    remaining_cents = corrected.corrected_cents,
    stripe_coupon_id = null,
    stripe_subscription_id = null,
    stripe_armed_at = null
from corrected
where c.id = corrected.id;

create or replace function public.stripe_referral_rewards_to_arm(p_limit integer default 50)
returns table(
  credit_id uuid,
  customer_id uuid,
  amount_cents integer,
  reward_percent smallint,
  stripe_subscription_id text,
  stripe_coupon_id text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    credit.id,
    credit.customer_id,
    credit.remaining_cents,
    credit.reward_percent,
    subscription.stripe_subscription_id,
    'ADSREF-' || replace(credit.id::text,'-','') || '-' || credit.remaining_cents::text
  from public.referral_credits credit
  join lateral (
    select s.*
    from public.subscriptions s
    join public.service_plan_versions version on version.id=s.service_plan_version_id
    join public.service_plans plan on plan.id=version.plan_id
    where s.customer_id=credit.customer_id
      and plan.id='monthly'
      and s.stripe_subscription_id is not null
      and s.subscription_status='active'
      and s.payment_status in ('paid','test_paid')
      and coalesce(s.cancel_at_period_end,false)=false
      and s.ended_at is null
    order by s.started_at desc nulls last,s.id desc
    limit 1
  ) subscription on true
  where credit.status='issued'
    and credit.remaining_cents > 0
    and credit.expires_at > now()
    and not exists (
      select 1
      from public.referral_credits earlier
      where earlier.customer_id=credit.customer_id
        and earlier.status='issued'
        and earlier.remaining_cents > 0
        and earlier.expires_at > now()
        and earlier.referral_sequence < credit.referral_sequence
    )
  order by credit.earned_at,credit.id
  limit greatest(1,least(coalesce(p_limit,50),100));
$$;

create or replace function public.mark_stripe_referral_reward_armed(
  p_credit_id uuid,
  p_stripe_subscription_id text,
  p_stripe_coupon_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  credit public.referral_credits%rowtype;
begin
  select * into credit
  from public.referral_credits
  where id=p_credit_id
  for update;

  if credit.id is null then raise exception 'Referral credit was not found'; end if;
  if credit.status <> 'issued' or credit.remaining_cents <= 0 or credit.expires_at <= now() then
    raise exception 'Referral credit is not available to arm';
  end if;
  if p_stripe_subscription_id is null or p_stripe_subscription_id !~ '^sub_' then
    raise exception 'Stripe subscription id is required';
  end if;
  if p_stripe_coupon_id is null or p_stripe_coupon_id !~ '^ADSREF-[0-9a-fA-F]{32}-[0-9]{1,10}$' then
    raise exception 'Stripe referral coupon id is invalid';
  end if;
  if not exists (
    select 1
    from public.subscriptions subscription
    join public.service_plan_versions version on version.id=subscription.service_plan_version_id
    join public.service_plans plan on plan.id=version.plan_id
    where subscription.customer_id=credit.customer_id
      and subscription.stripe_subscription_id=p_stripe_subscription_id
      and plan.id='monthly'
      and subscription.subscription_status='active'
      and subscription.payment_status in ('paid','test_paid')
      and coalesce(subscription.cancel_at_period_end,false)=false
      and subscription.ended_at is null
  ) then
    raise exception 'Referral reward requires an active Monthly Stripe subscription';
  end if;

  update public.referral_credits
  set stripe_coupon_id=p_stripe_coupon_id,
      stripe_subscription_id=p_stripe_subscription_id,
      stripe_armed_at=coalesce(stripe_armed_at,now())
  where id=p_credit_id;
end;
$$;

alter table public.customer_change_requests
  drop constraint if exists customer_change_requests_request_type_check;
alter table public.customer_change_requests
  add constraint customer_change_requests_request_type_check
  check (request_type = any (array[
    'return_location'::text,
    'access_instructions'::text,
    'gate_information'::text,
    'animal_warning'::text,
    'bin_count'::text,
    'recycling_schedule'::text,
    'bin_collection_types'::text,
    'service_address_move'::text
  ]));

create or replace function public.apply_customer_service_move(
  p_request_id uuid,
  p_reviewer_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.customer_change_requests%rowtype;
  old_address public.service_addresses%rowtype;
  new_address_id uuid;
  payload jsonb;
  move_date date;
  line1 text;
  line2 text;
  city text;
  region text;
  postal_code text;
  normalized text;
  normalized_hash text;
  return_location text;
  access_instructions text;
  gate_information text;
  animal_warning text;
  trash_weekday integer;
  recycling_weekday integer;
  recycling_frequency integer;
  recycling_anchor date;
  trash_count integer;
  recycling_count integer;
  recurring_price integer;
  plan_version public.service_plan_versions%rowtype;
  new_trash_schedule_id uuid;
begin
  if not exists (
    select 1
    from public.user_profiles profile
    join public.staff_roles role on role.user_id=profile.id and role.revoked_at is null
    where profile.id=p_reviewer_id
      and profile.login_status='active'
      and role.role in ('administrator','dispatcher')
  ) then
    raise exception 'An active administrator or dispatcher must approve a service move';
  end if;

  select * into req
  from public.customer_change_requests
  where id=p_request_id
  for update;

  if req.id is null or req.request_type <> 'service_address_move' then
    raise exception 'Service move request was not found';
  end if;
  if req.status <> 'pending_staff_review' then
    raise exception 'Service move request is no longer pending';
  end if;

  payload := req.requested_value;
  line1 := nullif(trim(payload->>'line1'),'');
  line2 := nullif(trim(payload->>'line2'),'');
  city := nullif(trim(payload->>'city'),'');
  region := upper(nullif(trim(payload->>'region'),''));
  postal_code := nullif(trim(payload->>'postal_code'),'');
  move_date := nullif(payload->>'move_date','')::date;
  return_location := nullif(trim(payload->>'preferred_return_location'),'');
  access_instructions := nullif(trim(payload->>'access_instructions'),'');
  gate_information := nullif(trim(payload->>'gate_information'),'');
  animal_warning := nullif(trim(payload->>'animal_warning'),'');
  trash_weekday := nullif(payload->>'trash_weekday','')::integer;
  recycling_weekday := nullif(payload->>'recycling_weekday','')::integer;
  recycling_frequency := nullif(payload->>'recycling_frequency_weeks','')::integer;
  recycling_anchor := nullif(payload->>'recycling_anchor_collection_date','')::date;

  if line1 is null or city is null or region !~ '^[A-Z]{2}$' or postal_code is null then
    raise exception 'Move request address is incomplete';
  end if;
  if move_date is null then raise exception 'Move effective date is required'; end if;
  if move_date > current_date then
    raise exception 'A future move cannot be activated before its effective date';
  end if;
  if trash_weekday not between 1 and 5 then
    raise exception 'Trash pickup day must be Monday through Friday';
  end if;

  select * into old_address
  from public.service_addresses
  where customer_id=req.customer_id and is_current
  for update;
  if old_address.id is null then raise exception 'Customer has no current service address'; end if;

  select
    count(*) filter (where collection_stream <> 'recycling')::integer,
    count(*) filter (where collection_stream = 'recycling')::integer
  into trash_count,recycling_count
  from public.bins
  where service_address_id=old_address.id and active;

  if recycling_count > 0 then
    if recycling_weekday not between 1 and 5
       or recycling_frequency not in (1,2)
       or recycling_anchor is null
       or extract(dow from recycling_anchor)::integer <> recycling_weekday then
      raise exception 'Recycling pickup details are required for the new address';
    end if;
  end if;

  select v.* into plan_version
  from public.subscriptions s
  join public.service_plan_versions v on v.id=s.service_plan_version_id
  where s.customer_id=req.customer_id and s.ended_at is null
  order by s.started_at desc nulls last,s.id desc
  limit 1;

  if plan_version.id is not null then
    recurring_price := greatest(0,coalesce(plan_version.base_price_cents,0))
      + greatest(0,(trash_count+recycling_count)-greatest(0,coalesce(plan_version.bins_included,1)))
        * greatest(0,coalesce(plan_version.additional_bin_price_cents,0));
  end if;

  normalized := trim(regexp_replace(lower(
    line1 || '|' || coalesce(line2,'') || '|' || city || '|' || region || '|' || postal_code
  ), '\\s+', ' ', 'g'));
  normalized_hash := encode(extensions.digest(normalized,'sha256'),'hex');

  insert into public.service_addresses(
    customer_id,municipality_id,line1,line2,city,region,postal_code,
    normalized_address_hash,preferred_return_location,access_instructions,
    gate_information,animal_warning,is_test,is_current
  ) values (
    req.customer_id,null,line1,line2,city,region,postal_code,
    normalized_hash,coalesce(return_location,old_address.preferred_return_location),
    coalesce(access_instructions,old_address.access_instructions),
    coalesce(gate_information,old_address.gate_information),
    coalesce(animal_warning,old_address.animal_warning),true,false
  ) returning id into new_address_id;

  insert into public.service_address_occupancy_history(
    customer_id,service_address_id,occupancy_ended_on,end_reason,created_by
  ) values (req.customer_id,old_address.id,move_date,'moved',p_reviewer_id)
  on conflict (customer_id,service_address_id,occupancy_ended_on) do nothing;

  insert into public.service_address_occupancy_history(
    customer_id,service_address_id,occupancy_started_on,end_reason,created_by
  ) values (req.customer_id,new_address_id,move_date,null,p_reviewer_id);

  insert into public.bins(
    service_address_id,identifier,description,active,dirty_this_visit,collection_stream
  )
  select new_address_id,identifier,description,true,true,collection_stream
  from public.bins
  where service_address_id=old_address.id and active;

  insert into public.trash_pickup_schedules(
    service_address_id,weekday,source,verification_status,customer_reported_weekday,
    effective_from,holiday_shift_days,holiday_shift_status
  ) values (
    new_address_id,trash_weekday,'customer_confirmed','customer_confirmed',trash_weekday,
    move_date,0,'none'
  ) returning id into new_trash_schedule_id;

  insert into public.cleaning_day_assignments(
    pickup_schedule_id,normal_weekday,review_status
  ) values (new_trash_schedule_id,(trash_weekday+1)%7,'pending');

  if recycling_count > 0 then
    insert into public.recycling_pickup_schedules(
      service_address_id,weekday,frequency_weeks,anchor_collection_date,source,
      verification_status,effective_from,holiday_shift_days,holiday_shift_status,is_current
    ) values (
      new_address_id,recycling_weekday,recycling_frequency,recycling_anchor,
      'customer_confirmed','customer_confirmed',move_date,0,'none',true
    );
  end if;

  if plan_version.id is not null then
    insert into public.customer_bin_configurations(
      customer_id,service_address_id,trash_bin_count,recycling_bin_count,
      recurring_price_cents,effective_service_at,billing_effective_policy,
      source,source_change_request_id,changed_by,is_test
    ) values (
      req.customer_id,new_address_id,trash_count,recycling_count,
      recurring_price,now(),'next_renewal','customer_move',req.id,p_reviewer_id,true
    );
  end if;

  update public.trash_pickup_schedules
  set effective_to=move_date-1
  where service_address_id=old_address.id and effective_to is null;
  update public.recycling_pickup_schedules
  set effective_to=move_date-1,is_current=false
  where service_address_id=old_address.id and is_current;
  update public.bins set active=false where service_address_id=old_address.id and active;

  update public.service_addresses set is_current=false where id=old_address.id;
  update public.service_addresses set is_current=true where id=new_address_id;

  update public.service_visits
  set status='canceled'
  where customer_id=req.customer_id
    and scheduled_for >= move_date::timestamptz
    and status in ('scheduled','assigned','weather_delayed');

  update public.customer_change_requests
  set status='approved',reviewed_by=p_reviewer_id,reviewed_at=now()
  where id=req.id;

  return new_address_id;
end;
$$;

revoke all on function public.apply_customer_service_move(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_customer_service_move(uuid,uuid) to service_role;

-- The old per-visit customer selector is retired. Active bins are expected to be cleaned.
update public.bins set dirty_this_visit=true where active;
