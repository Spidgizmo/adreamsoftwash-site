alter table public.signup_leads drop constraint if exists signup_leads_status_check;
alter table public.signup_leads add constraint signup_leads_status_check check (status = any (array['incomplete'::text,'abandoned'::text,'submitted_unpaid'::text,'converted'::text]));

create or replace function public.prevent_submitted_signup_mutation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if old.status = 'submitted_unpaid' then
    if new.status='converted'
       and (to_jsonb(new) - 'status' - 'updated_at' - 'last_activity_at')
         = (to_jsonb(old) - 'status' - 'updated_at' - 'last_activity_at')
    then return new; end if;
    raise exception 'Submitted signup records are immutable';
  end if;
  return new;
end
$$;

create or replace function public.validate_referral_claim()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare ref_address text;
begin
  if new.referrer_customer_id=new.referred_customer_id then
    new.status='rejected'; new.rejection_reason='self_referral'; return new;
  end if;
  select normalized_address_hash into ref_address from service_addresses where customer_id=new.referred_customer_id and is_current limit 1;
  if ref_address is null then raise exception 'Referred customer must have a current service address'; end if;
  if exists(select 1 from referral_relationships r where r.referred_customer_id=new.referred_customer_id and r.status not in ('rejected','reversed')) then return null; end if;
  if exists(select 1 from referral_relationships r where r.referred_address_hash=ref_address and r.created_at>now()-interval '12 months' and r.status not in ('rejected','reversed')) then
    new.status='rejected'; new.rejection_reason='address_lookback'; return new;
  end if;
  new.referred_address_hash=ref_address; return new;
end
$$;

create or replace function public.enforce_referral_credit_owner()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare relationship_record public.referral_relationships%rowtype;
begin
  select * into relationship_record from public.referral_relationships relationship where relationship.id=new.referral_relationship_id;
  if relationship_record.id is null or relationship_record.referrer_customer_id<>new.customer_id then
    raise exception 'Referral credit customer must match the relationship referrer';
  end if;
  if relationship_record.status not in ('qualified','credit_issued','credit_applied') then
    raise exception 'Referral credit requires a qualified relationship';
  end if;
  if relationship_record.hold_until is null or relationship_record.hold_until>now() or not exists (
    select 1
    from public.customers referred
    join public.subscriptions subscription on subscription.customer_id=referred.id
    join public.service_plan_versions version on version.id=subscription.service_plan_version_id
    join public.service_plans plan on plan.id=version.plan_id and plan.referral_eligible
    where referred.id=relationship_record.referred_customer_id
      and referred.is_residential
      and subscription.subscription_status='active'
      and subscription.payment_status in ('paid','test_paid')
  ) then
    raise exception 'Referral credit requires an eligible paid active referred customer';
  end if;
  return new;
end
$$;

create or replace function public.mark_signup_converted_after_paid_checkout()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status <> 'paid' or old.status = 'paid' then return new; end if;
  update public.signup_leads set status='converted',updated_at=now(),last_activity_at=now() where id=new.signup_lead_id and status='submitted_unpaid';
  return new;
end
$$;

drop trigger if exists mark_signup_converted_after_paid_checkout on public.stripe_checkout_attempts;
create trigger mark_signup_converted_after_paid_checkout after update of status on public.stripe_checkout_attempts for each row execute function public.mark_signup_converted_after_paid_checkout();

do $$
declare
  v_oid oid;
  v_def text;
  v_old text := 'if v_lead.id is null or v_lead.status <> ''submitted_unpaid'' then raise exception ''Submitted signup lead is unavailable''; end if;';
  v_new text := 'if v_lead.id is null or v_lead.status not in (''submitted_unpaid'',''converted'') then raise exception ''Submitted signup lead is unavailable''; end if;';
begin
  select p.oid into v_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='activate_stripe_test_payment' limit 1;
  if v_oid is null then raise exception 'activate_stripe_test_payment not found'; end if;
  select pg_get_functiondef(v_oid) into v_def;
  if position(v_old in v_def)=0 then raise exception 'activate_stripe_test_payment status guard not found'; end if;
  execute replace(v_def,v_old,v_new);
end $$;

create or replace function public.issue_referral_reward_after_paid_activation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status not in ('pending_first_service','pending_successful_payment') then return new; end if;
  if exists (
    select 1 from public.subscriptions s
    join public.service_plan_versions v on v.id=s.service_plan_version_id
    join public.service_plans p on p.id=v.plan_id and p.referral_eligible
    where s.customer_id=new.referred_customer_id and s.subscription_status='active' and s.payment_status in ('paid','test_paid')
  ) then
    update public.referral_relationships set status='seven_day_hold',hold_until=now() where id=new.id and status in ('pending_first_service','pending_successful_payment');
    perform public.process_mature_referral_rewards();
  end if;
  return new;
end
$$;

drop trigger if exists issue_referral_reward_after_paid_activation on public.referral_relationships;
create trigger issue_referral_reward_after_paid_activation after insert on public.referral_relationships for each row execute function public.issue_referral_reward_after_paid_activation();

drop trigger if exists begin_referral_hold_after_first_service on public.service_visits;

delete from public.referral_relationships rejected
where rejected.status='rejected' and rejected.rejection_reason='duplicate_active_claim'
  and exists(select 1 from public.referral_relationships active where active.referred_customer_id=rejected.referred_customer_id and active.id<>rejected.id and active.status not in ('rejected','reversed'));

update public.signup_leads l set status='converted',updated_at=now(),last_activity_at=now()
where l.status='submitted_unpaid' and exists(select 1 from public.stripe_checkout_attempts a where a.signup_lead_id=l.id and a.status='paid');

update public.referral_relationships r set status='seven_day_hold',hold_until=now()
where r.status in ('pending_first_service','pending_successful_payment')
  and exists(select 1 from public.subscriptions s join public.service_plan_versions v on v.id=s.service_plan_version_id join public.service_plans p on p.id=v.plan_id and p.referral_eligible where s.customer_id=r.referred_customer_id and s.subscription_status='active' and s.payment_status in ('paid','test_paid'));

select public.process_mature_referral_rewards();