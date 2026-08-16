-- Preserve Stripe's end-of-period cancellation state so the ADS portal can show
-- a scheduled cancellation immediately without ending already-paid service early.

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancel_at timestamptz;

create or replace function public.sync_stripe_test_subscription_state(
  p_stripe_subscription_id text,
  p_stripe_status text,
  p_cancel_at_period_end boolean default false,
  p_cancel_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_stripe_subscription_id is null or p_stripe_subscription_id !~ '^sub_' then
    raise exception 'Stripe subscription id is required';
  end if;

  update public.subscriptions subscription
  set subscription_status=case
        when p_stripe_status in ('active','trialing','past_due','unpaid','canceled','incomplete','incomplete_expired','paused')
          then p_stripe_status
        else subscription.subscription_status
      end,
      cancel_at_period_end=coalesce(p_cancel_at_period_end,false),
      cancel_at=case when coalesce(p_cancel_at_period_end,false) then p_cancel_at else null end
  where subscription.stripe_subscription_id=p_stripe_subscription_id;
end
$$;

revoke all on function public.sync_stripe_test_subscription_state(text,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.sync_stripe_test_subscription_state(text,text,boolean,timestamptz) to service_role;

create or replace function public.cancel_stripe_test_subscription(p_stripe_subscription_id text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  update public.subscriptions subscription set
    subscription_status='canceled',
    service_status='canceled',
    cancel_at_period_end=false,
    cancel_at=null,
    ended_at=coalesce(subscription.ended_at,now())
  where subscription.stripe_subscription_id=p_stripe_subscription_id;
  update public.stripe_checkout_attempts attempt set status='canceled',updated_at=now()
  where attempt.stripe_subscription_id=p_stripe_subscription_id and not attempt.livemode;
end
$$;

revoke all on function public.cancel_stripe_test_subscription(text) from public,anon,authenticated;
grant execute on function public.cancel_stripe_test_subscription(text) to service_role;
