-- Referral lifecycle automation and durable notification outbox.
-- External email delivery remains outside Postgres; the application processes this
-- outbox idempotently so payment/referral state is never dependent on SMTP uptime.

create table if not exists public.referral_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'referred_customer_welcome',
    'referrer_joined_pending',
    'referrer_reward_qualified'
  )),
  referral_relationship_id uuid not null references public.referral_relationships(id) on delete cascade,
  recipient_customer_id uuid not null references public.customers(id) on delete cascade,
  recipient_email text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','simulated','sent','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.referral_notification_outbox enable row level security;
revoke all on public.referral_notification_outbox from public,anon,authenticated;
grant select,insert,update,delete on public.referral_notification_outbox to service_role;

create policy referral_notification_staff_read
on public.referral_notification_outbox
for select
to authenticated
using (public.has_role('administrator') or public.has_role('dispatcher'));

create or replace function public.ensure_paid_test_customer_referral_code()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.is_test and new.stripe_customer_id is not null and new.stripe_customer_id like 'cus_%' then
    perform public.ensure_customer_referral_code(new.id);
  end if;
  return new;
end
$$;

drop trigger if exists ensure_paid_test_customer_referral_code on public.customers;
create trigger ensure_paid_test_customer_referral_code
after insert or update of stripe_customer_id on public.customers
for each row execute function public.ensure_paid_test_customer_referral_code();

-- Backfill only already-paid Stripe TEST customers. Seed-only fictional customers
-- without a Stripe customer id are intentionally untouched.
do $$
declare customer_record record;
begin
  for customer_record in
    select id from public.customers
    where is_test and stripe_customer_id like 'cus_%'
  loop
    perform public.ensure_customer_referral_code(customer_record.id);
  end loop;
end
$$;

create or replace function public.queue_referral_join_notifications()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  referrer_record public.customers%rowtype;
  referred_record public.customers%rowtype;
  referred_code text;
  referrer_first_name text;
  referred_first_name text;
begin
  if new.status in ('rejected','reversed') then return new; end if;

  select * into referrer_record from public.customers where id=new.referrer_customer_id;
  select * into referred_record from public.customers where id=new.referred_customer_id;
  select code into referred_code
  from public.referral_codes
  where customer_id=new.referred_customer_id and active
  limit 1;

  referrer_first_name := split_part(trim(coalesce(referrer_record.full_name,'A friend')), ' ', 1);
  referred_first_name := split_part(trim(coalesce(referred_record.full_name,'Customer')), ' ', 1);

  insert into public.referral_notification_outbox(
    kind,referral_relationship_id,recipient_customer_id,recipient_email,payload,idempotency_key
  ) values (
    'referred_customer_welcome',new.id,new.referred_customer_id,referred_record.email,
    jsonb_build_object(
      'recipientFirstName',referred_first_name,
      'referrerFirstName',referrer_first_name,
      'referralCode',referred_code,
      'portalPath','/bin-cleaning/portal',
      'firstRewardPercent',50,
      'laterRewardPercent',25
    ),
    'referral:' || new.id::text || ':referred-welcome'
  ) on conflict (idempotency_key) do nothing;

  insert into public.referral_notification_outbox(
    kind,referral_relationship_id,recipient_customer_id,recipient_email,payload,idempotency_key
  ) values (
    'referrer_joined_pending',new.id,new.referrer_customer_id,referrer_record.email,
    jsonb_build_object(
      'recipientFirstName',referrer_first_name,
      'referredFirstName',referred_first_name,
      'portalPath','/bin-cleaning/portal',
      'holdDays',7
    ),
    'referral:' || new.id::text || ':referrer-pending'
  ) on conflict (idempotency_key) do nothing;

  return new;
end
$$;

drop trigger if exists queue_referral_join_notifications on public.referral_relationships;
create trigger queue_referral_join_notifications
after insert on public.referral_relationships
for each row execute function public.queue_referral_join_notifications();

create or replace function public.begin_referral_hold_after_first_service()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  update public.referral_relationships relationship
  set status='seven_day_hold',
      hold_until=coalesce(new.completed_at,now()) + interval '7 days'
  where relationship.referred_customer_id=new.customer_id
    and relationship.status='pending_first_service'
    and exists (
      select 1
      from public.cleaning_entitlements entitlement
      join public.paid_service_cycles cycle
        on cycle.id=entitlement.paid_service_cycle_id
       and cycle.customer_id=new.customer_id
       and cycle.payment_status='test_paid'
      join public.service_plan_versions version on version.id=cycle.service_plan_version_id
      join public.service_plans plan on plan.id=version.plan_id and plan.referral_eligible
      where entitlement.id=new.entitlement_id
        and entitlement.customer_id=new.customer_id
    );

  return new;
end
$$;

drop trigger if exists begin_referral_hold_after_first_service on public.service_visits;
create trigger begin_referral_hold_after_first_service
after update of status on public.service_visits
for each row execute function public.begin_referral_hold_after_first_service();

create or replace function public.queue_qualified_referral_notification()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  referrer_record public.customers%rowtype;
  referred_record public.customers%rowtype;
  credit_record public.referral_credits%rowtype;
begin
  if new.status <> 'credit_issued' or old.status='credit_issued' then return new; end if;

  select * into referrer_record from public.customers where id=new.referrer_customer_id;
  select * into referred_record from public.customers where id=new.referred_customer_id;
  select * into credit_record
  from public.referral_credits
  where referral_relationship_id=new.id
  order by earned_at desc
  limit 1;

  if credit_record.id is null then return new; end if;

  insert into public.referral_notification_outbox(
    kind,referral_relationship_id,recipient_customer_id,recipient_email,payload,idempotency_key
  ) values (
    'referrer_reward_qualified',new.id,new.referrer_customer_id,referrer_record.email,
    jsonb_build_object(
      'recipientFirstName',split_part(trim(coalesce(referrer_record.full_name,'Customer')), ' ', 1),
      'referredFirstName',split_part(trim(coalesce(referred_record.full_name,'Your referral')), ' ', 1),
      'rewardPercent',credit_record.reward_percent,
      'rewardSequence',credit_record.referral_sequence,
      'portalPath','/bin-cleaning/portal'
    ),
    'referral:' || new.id::text || ':referrer-qualified'
  ) on conflict (idempotency_key) do nothing;

  return new;
end
$$;

drop trigger if exists queue_qualified_referral_notification on public.referral_relationships;
create trigger queue_qualified_referral_notification
after update of status on public.referral_relationships
for each row execute function public.queue_qualified_referral_notification();

create or replace function public.process_mature_referral_rewards()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  relationship_record public.referral_relationships%rowtype;
  base_price integer;
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
    -- The referred customer must still have an active referral-eligible recurring
    -- subscription when the hold matures. The referrer must have an active Monthly
    -- plan to receive an invoice credit.
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

    select version.base_price_cents
    into base_price
    from public.subscriptions subscription
    join public.service_plan_versions version on version.id=subscription.service_plan_version_id
    join public.service_plans plan on plan.id=version.plan_id
    where subscription.customer_id=relationship_record.referrer_customer_id
      and subscription.subscription_status='active'
      and subscription.payment_status in ('paid','test_paid')
      and plan.id='monthly'
    order by subscription.started_at desc
    limit 1;

    if base_price is null or base_price <= 0 then continue; end if;

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
    reward_cents := greatest(1,round(base_price * reward_percent / 100.0)::integer);

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
end
$$;

revoke all on function public.process_mature_referral_rewards() from public,anon,authenticated;
grant execute on function public.process_mature_referral_rewards() to service_role;
