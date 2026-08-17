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
set search_path = public
as $$
begin
  update public.stripe_checkout_attempts
  set stripe_checkout_session_id = coalesce(p_session_id, stripe_checkout_session_id),
      stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_subscription_id, stripe_subscription_id),
      stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
      status = case
        when p_paid then 'paid'
        when status = 'paid' then 'paid'
        else 'complete'
      end,
      updated_at = now()
  where id = p_attempt_id and not livemode;

  if not found then
    raise exception 'Stripe test checkout attempt was not found';
  end if;
end
$$;

-- Repair any recurring TEST checkout that was already activated and paid but was
-- later downgraded to "complete" by a concurrent checkout.session.completed event.
update public.stripe_checkout_attempts a
set status = 'paid', updated_at = now()
from public.signup_leads sl
join public.customers c on c.user_id = sl.auth_user_id
where a.signup_lead_id = sl.id
  and a.status = 'complete'
  and not a.livemode
  and sl.status = 'converted'
  and c.account_status = 'test_active'
  and exists (
    select 1
    from public.subscriptions s
    where s.customer_id = c.id
      and s.payment_status = 'test_paid'
  );
