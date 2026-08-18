-- Idempotent TEST-payment activation. Successful verified Stripe events call these
-- functions through the service-role boundary. Live-mode events are rejected upstream.

create or replace function public.sync_stripe_test_checkout_session(
  p_attempt_id uuid,
  p_session_id text,
  p_customer_id text,
  p_subscription_id text default null,
  p_payment_intent_id text default null,
  p_paid boolean default false
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.stripe_checkout_attempts
  set stripe_checkout_session_id=coalesce(p_session_id,stripe_checkout_session_id),
      stripe_customer_id=coalesce(p_customer_id,stripe_customer_id),
      stripe_subscription_id=coalesce(p_subscription_id,stripe_subscription_id),
      stripe_payment_intent_id=coalesce(p_payment_intent_id,stripe_payment_intent_id),
      status=case when p_paid then 'paid' else 'complete' end,
      updated_at=now()
  where id=p_attempt_id and not livemode;
  if not found then raise exception 'Stripe test checkout attempt was not found'; end if;
end
$$;
revoke all on function public.sync_stripe_test_checkout_session(uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.sync_stripe_test_checkout_session(uuid,text,text,text,text,boolean) to service_role;

create or replace function public.activate_stripe_test_payment(
  p_attempt_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text default null,
  p_stripe_invoice_id text default null,
  p_stripe_payment_intent_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_attempt public.stripe_checkout_attempts%rowtype;
  v_lead public.signup_leads%rowtype;
  v_customer_id uuid;
  v_address_id uuid;
  v_subscription_id uuid;
  v_plan_version public.service_plan_versions%rowtype;
  v_cycle_id uuid;
  v_entitlement_id uuid;
  v_cycle_key text;
  v_cycle_end_date date;
  v_trash_count integer;
  v_recycling_count integer;
  v_i integer;
  v_ref_code public.referral_codes%rowtype;
  v_alignment text;
begin
  select a.* into v_attempt
  from public.stripe_checkout_attempts a
  where a.id=p_attempt_id
  for update;
  if v_attempt.id is null or v_attempt.livemode then raise exception 'Stripe test checkout attempt was not found'; end if;

  select l.* into v_lead from public.signup_leads l where l.id=v_attempt.signup_lead_id;
  if v_lead.id is null or v_lead.status <> 'submitted_unpaid' then raise exception 'Submitted signup lead is unavailable'; end if;
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_' then raise exception 'Stripe customer id is required'; end if;

  select p.* into v_plan_version
  from public.service_plan_versions p
  where p.plan_id=v_attempt.plan_id and p.retired_at is null
  order by p.effective_at desc limit 1;
  if v_plan_version.id is null then raise exception 'Active service plan version was not found'; end if;

  select c.id into v_customer_id
  from public.customers c
  where c.stripe_customer_id=p_stripe_customer_id
  limit 1;

  if v_customer_id is null then
    insert into public.customers(full_name,email,phone,account_status,is_residential,is_test,stripe_customer_id)
    values(v_lead.full_name,v_lead.email,v_lead.phone,'test_active',true,true,p_stripe_customer_id)
    returning id into v_customer_id;

    insert into public.service_addresses(
      customer_id,line1,line2,city,region,postal_code,normalized_address_hash,
      preferred_return_location,access_instructions,gate_information,animal_warning,accessibility_notes,is_test
    ) values(
      v_customer_id,v_lead.line1,v_lead.line2,v_lead.city,v_lead.region,v_lead.postal_code,
      encode(extensions.digest(v_attempt.address_fingerprint || ':' || v_customer_id::text,'sha256'),'hex'),
      v_lead.preferred_return_location,v_lead.access_instructions,v_lead.gate_information,v_lead.animal_warning,v_lead.safety_notes,true
    ) returning id into v_address_id;

    v_trash_count := coalesce((v_lead.bin_streams->>'trash')::integer,0);
    v_recycling_count := coalesce((v_lead.bin_streams->>'recycling')::integer,0);
    if v_trash_count > 0 then
      for v_i in 1..v_trash_count loop
        insert into public.bins(service_address_id,description,collection_stream)
        values(v_address_id,'Trash bin ' || v_i,'trash');
      end loop;
    end if;
    if v_recycling_count > 0 then
      for v_i in 1..v_recycling_count loop
        insert into public.bins(service_address_id,description,collection_stream)
        values(v_address_id,'Recycling bin ' || v_i,'recycling');
      end loop;
    end if;

    insert into public.customer_contact_preferences(customer_id,email_allowed,sms_allowed,phone_allowed)
    values(v_customer_id,v_lead.email_allowed,v_lead.sms_allowed,v_lead.phone_allowed)
    on conflict (customer_id) do update set
      email_allowed=excluded.email_allowed,
      sms_allowed=excluded.sms_allowed,
      phone_allowed=excluded.phone_allowed,
      updated_at=now();

    if v_lead.trash_weekday is not null then
      insert into public.trash_pickup_schedules(
        service_address_id,weekday,source,verification_status,effective_from
      ) values(v_address_id,v_lead.trash_weekday,'customer_confirmed','customer_confirmed',current_date);
    end if;

    if v_recycling_count > 0 and v_lead.recycling_weekday is not null
      and v_lead.recycling_frequency_weeks is not null
      and v_lead.recycling_anchor_collection_date is not null then
      insert into public.recycling_pickup_schedules(
        service_address_id,weekday,frequency_weeks,anchor_collection_date,source,verification_status,effective_from,is_current
      ) values(
        v_address_id,v_lead.recycling_weekday,v_lead.recycling_frequency_weeks,
        v_lead.recycling_anchor_collection_date,'customer_confirmed','customer_confirmed',current_date,true
      );
    end if;
  else
    select a.id into v_address_id
    from public.service_addresses a
    where a.customer_id=v_customer_id
    order by a.created_at desc limit 1;
  end if;

  v_alignment := case
    when coalesce((v_lead.bin_streams->>'recycling')::integer,0) > 0 then 'recycling_collection'
    else 'trash_collection'
  end;

  if p_stripe_subscription_id is not null then
    select s.id into v_subscription_id
    from public.subscriptions s
    where s.stripe_subscription_id=p_stripe_subscription_id
    limit 1;
  end if;

  if v_subscription_id is null then
    insert into public.subscriptions(
      customer_id,service_plan_version_id,payment_status,subscription_status,service_status,started_at,
      stripe_subscription_id,stripe_latest_invoice_id,service_alignment
    ) values(
      v_customer_id,v_plan_version.id,'test_paid',
      case when v_attempt.checkout_mode='subscription' then 'active' else 'one_time_paid' end,
      'pending',now(),p_stripe_subscription_id,p_stripe_invoice_id,v_alignment
    ) returning id into v_subscription_id;
  else
    update public.subscriptions s set
      payment_status='test_paid',
      subscription_status='active',
      service_status='pending',
      stripe_latest_invoice_id=coalesce(p_stripe_invoice_id,s.stripe_latest_invoice_id),
      service_alignment=v_alignment
    where s.id=v_subscription_id;
  end if;

  v_cycle_key := 'stripe-test:' || coalesce(p_stripe_invoice_id,p_stripe_payment_intent_id,v_attempt.id::text);
  if v_plan_version.interval_months is null then
    v_cycle_end_date := null;
  else
    v_cycle_end_date := (current_date + make_interval(months => v_plan_version.interval_months))::date - 1;
  end if;

  insert into public.paid_service_cycles(
    customer_id,subscription_id,service_plan_version_id,cycle_start,cycle_end,payment_status,
    external_payment_reference,idempotency_key,is_test,stripe_invoice_id,stripe_payment_intent_id
  ) values(
    v_customer_id,v_subscription_id,v_plan_version.id,current_date,v_cycle_end_date,'test_paid',
    coalesce(p_stripe_invoice_id,p_stripe_payment_intent_id,v_attempt.stripe_checkout_session_id),v_cycle_key,true,
    p_stripe_invoice_id,p_stripe_payment_intent_id
  ) on conflict (idempotency_key) do update set payment_status='test_paid'
  returning id into v_cycle_id;

  insert into public.cleaning_entitlements(customer_id,paid_service_cycle_id,status,idempotency_key,eligible_from)
  values(v_customer_id,v_cycle_id,'due',v_cycle_key || ':entitlement',current_date)
  on conflict (paid_service_cycle_id) do update set status=
    case
      when public.cleaning_entitlements.status in ('created','pending_payment','payment_hold') then 'due'::public.entitlement_status
      else public.cleaning_entitlements.status
    end
  returning id into v_entitlement_id;

  if v_lead.promo_code is not null and v_attempt.discount_cents > 0 then
    insert into public.promotion_redemptions(
      customer_id,signup_lead_id,stripe_checkout_attempt_id,promo_code,address_fingerprint,customer_email,amount_cents
    ) values(v_customer_id,v_lead.id,v_attempt.id,v_lead.promo_code,v_attempt.address_fingerprint,v_lead.email,v_attempt.discount_cents)
    on conflict (stripe_checkout_attempt_id) do nothing;
  end if;

  if v_lead.referral_code is not null then
    select r.* into v_ref_code
    from public.referral_codes r
    where r.code=v_lead.referral_code and r.active
    limit 1;
    if v_ref_code.id is not null and v_ref_code.customer_id <> v_customer_id then
      insert into public.referral_relationships(
        referral_code_id,referrer_customer_id,referred_customer_id,referred_address_hash,status
      ) values(v_ref_code.id,v_ref_code.customer_id,v_customer_id,v_attempt.address_fingerprint,'pending_first_service')
      on conflict (referred_customer_id) do nothing;
    end if;
  end if;

  update public.stripe_checkout_attempts a set
    stripe_customer_id=p_stripe_customer_id,
    stripe_subscription_id=coalesce(p_stripe_subscription_id,a.stripe_subscription_id),
    stripe_invoice_id=coalesce(p_stripe_invoice_id,a.stripe_invoice_id),
    stripe_payment_intent_id=coalesce(p_stripe_payment_intent_id,a.stripe_payment_intent_id),
    status='paid',updated_at=now()
  where a.id=v_attempt.id;

  return jsonb_build_object(
    'customerId',v_customer_id,
    'serviceAddressId',v_address_id,
    'subscriptionId',v_subscription_id,
    'paidServiceCycleId',v_cycle_id,
    'entitlementId',v_entitlement_id
  );
end
$$;
revoke all on function public.activate_stripe_test_payment(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.activate_stripe_test_payment(uuid,text,text,text,text) to service_role;

create or replace function public.mark_stripe_test_payment_failed(
  p_attempt_id uuid,
  p_stripe_subscription_id text default null,
  p_stripe_invoice_id text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.stripe_checkout_attempts a set
    status='payment_failed',
    stripe_invoice_id=coalesce(p_stripe_invoice_id,a.stripe_invoice_id),
    updated_at=now()
  where a.id=p_attempt_id and not a.livemode;
  if p_stripe_subscription_id is not null then
    update public.subscriptions s set
      payment_status='payment_failed',
      service_status='payment_hold',
      stripe_latest_invoice_id=coalesce(p_stripe_invoice_id,s.stripe_latest_invoice_id)
    where s.stripe_subscription_id=p_stripe_subscription_id;
  end if;
end
$$;
revoke all on function public.mark_stripe_test_payment_failed(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mark_stripe_test_payment_failed(uuid,text,text) to service_role;

create or replace function public.cancel_stripe_test_subscription(p_stripe_subscription_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.subscriptions s set
    subscription_status='canceled',
    service_status='canceled',
    ended_at=coalesce(s.ended_at,now())
  where s.stripe_subscription_id=p_stripe_subscription_id;
  update public.stripe_checkout_attempts a set status='canceled',updated_at=now()
  where a.stripe_subscription_id=p_stripe_subscription_id and not a.livemode;
end
$$;
revoke all on function public.cancel_stripe_test_subscription(text) from public,anon,authenticated;
grant execute on function public.cancel_stripe_test_subscription(text) to service_role;
