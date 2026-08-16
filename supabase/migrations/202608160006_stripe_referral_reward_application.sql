-- Track the exact Stripe TEST discount armed for each referral reward and
-- consume at most one reward on each eligible Monthly renewal invoice.

alter table public.referral_credits
  add column if not exists stripe_coupon_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_armed_at timestamptz,
  add column if not exists stripe_applied_invoice_id text,
  add column if not exists stripe_applied_at timestamptz;

create unique index if not exists referral_credits_stripe_coupon_unique
  on public.referral_credits(stripe_coupon_id)
  where stripe_coupon_id is not null;

create unique index if not exists referral_credits_stripe_invoice_unique
  on public.referral_credits(stripe_applied_invoice_id)
  where stripe_applied_invoice_id is not null;

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
set search_path=public
as $$
  select
    credit.id,
    credit.customer_id,
    credit.remaining_cents,
    credit.reward_percent,
    subscription.stripe_subscription_id,
    coalesce(credit.stripe_coupon_id,'ADSREF-' || replace(credit.id::text,'-',''))
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
  limit greatest(1,least(coalesce(p_limit,50),100))
$$;

revoke all on function public.stripe_referral_rewards_to_arm(integer) from public,anon,authenticated;
grant execute on function public.stripe_referral_rewards_to_arm(integer) to service_role;

create or replace function public.mark_stripe_referral_reward_armed(
  p_credit_id uuid,
  p_stripe_subscription_id text,
  p_stripe_coupon_id text
)
returns void
language plpgsql
security definer
set search_path=public
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
  if p_stripe_coupon_id is null or p_stripe_coupon_id !~ '^ADSREF-[0-9a-fA-F]{32}$' then
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
end
$$;

revoke all on function public.mark_stripe_referral_reward_armed(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mark_stripe_referral_reward_armed(uuid,text,text) to service_role;

create or replace function public.apply_stripe_referral_reward_invoice(
  p_credit_id uuid,
  p_stripe_subscription_id text,
  p_stripe_invoice_id text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  credit public.referral_credits%rowtype;
begin
  select * into credit
  from public.referral_credits
  where id=p_credit_id
  for update;

  if credit.id is null then raise exception 'Referral credit was not found'; end if;
  if credit.status='applied' and credit.stripe_applied_invoice_id=p_stripe_invoice_id then return; end if;
  if credit.status <> 'issued' or credit.remaining_cents <= 0 then
    raise exception 'Referral credit is not available to apply';
  end if;
  if credit.stripe_armed_at is null
     or credit.stripe_subscription_id is distinct from p_stripe_subscription_id then
    raise exception 'Referral credit was not armed for this subscription';
  end if;
  if p_stripe_invoice_id is null or p_stripe_invoice_id !~ '^in_' then
    raise exception 'Stripe invoice id is required';
  end if;

  update public.referral_credits
  set status='applied',
      remaining_cents=0,
      stripe_applied_invoice_id=p_stripe_invoice_id,
      stripe_applied_at=now()
  where id=p_credit_id;

  update public.referral_relationships relationship
  set status='credit_applied'
  where relationship.id=credit.referral_relationship_id
    and relationship.status='credit_issued';
end
$$;

revoke all on function public.apply_stripe_referral_reward_invoice(uuid,text,text) from public,anon,authenticated;
grant execute on function public.apply_stripe_referral_reward_invoice(uuid,text,text) to service_role;
