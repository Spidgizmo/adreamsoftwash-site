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
  attempt public.stripe_checkout_attempts%rowtype;
  lead public.signup_leads%rowtype;
  customer_id uuid;
  address_id uuid;
  subscription_id uuid;
  plan_version public.service_plan_versions%rowtype;
  cycle_id uuid;
  entitlement_id uuid;
  cycle_key text;
  cycle_end_date date;
  trash_count integer;
  recycling_count integer;
  i integer;
  ref_code public.referral_codes%rowtype;
begin
  select * into attempt from public.stripe_checkout_attempts where id=p_attempt_id for update;
  if attempt.id is null or attempt.livemode then raise exception 'Stripe test checkout attempt was not found'; end if;
  select * into lead from public.signup_leads where id=attempt.signup_lead_id;
  if lead.id is null or lead.status <> 'submitted_unpaid' then raise exception 'Submitted signup lead is unavailable'; end if;
  if p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_' then raise exception 'Stripe customer id is required'; end if;

  select * into plan_version
  from public.service_plan_versions
  where plan_id=attempt.plan_id and retired_at is null
  order by effective_at desc limit 1;
  if plan_version.id is null then raise exception 'Active service plan version was not found'; end if;

  select id into customer_id from public.customers where stripe_customer_id=p_stripe_customer_id limit 1;
  if customer_id is null then
    insert into public.customers(full_name,email,phone,account_status,is_residential,is_test,stripe_customer_id)
    values(lead.full_name,lead.email,lead.phone,'test_active',true,true,p_stripe_customer_id)
    returning id into customer_id;

    insert into public.service_addresses(
      customer_id,line1,line2,city,region,postal_code,normalized_address_hash,
      preferred_return_location,access_instructions,gate_information,animal_warning,accessibility_notes,is_test
    ) values(
      customer_id,lead.line1,lead.line2,lead.city,lead.region,lead.postal_code,
      encode(extensions.digest(attempt.address_fingerprint || ':' || customer_id::text,'sha256'),'hex'),
      lead.preferred_return_location,lead.access_instructions,lead.gate_information,lead.animal_warning,lead.safety_notes,true
    ) returning id into address_id;

    trash_count := coalesce((lead.bin_streams->>'trash')::integer,0);
    recycling_count := coalesce((lead.bin_streams->>'recycling')::integer,0);
    if trash_count > 0 then
      for i in 1..trash_count loop
        insert into public.bins(service_address_id,description) values(address_id,'Trash bin ' || i);
      end loop;
    end if;
    if recycling_count > 0 then
      for i in 1..recycling_count loop
        insert into public.bins(service_address_id,description) values(address_id,'Recycling bin ' || i);
      end loop;
    end if;

    insert into public.customer_contact_preferences(customer_id,email_allowed,sms_allowed,phone_allowed)
    values(customer_id,lead.email_allowed,lead.sms_allowed,lead.phone_allowed)
    on conflict (customer_id) do update set
      email_allowed=excluded.email_allowed,sms_allowed=excluded.sms_allowed,phone_allowed=excluded.phone_allowed,updated_at=now();
  else
    select id into address_id from public.service_addresses where customer_id=customer_id order by created_at desc limit 1;
  end if;

  if p_stripe_subscription_id is not null then
    select id into subscription_id from public.subscriptions where stripe_subscription_id=p_stripe_subscription_id limit 1;
  end if;
  if subscription_id is null then
    insert into public.subscriptions(
      customer_id,service_plan_version_id,payment_status,subscription_status,service_status,started_at,
      stripe_subscription_id,stripe_latest_invoice_id
    ) values(
      customer_id,plan_version.id,'test_paid',
      case when attempt.checkout_mode='subscription' then 'active' else 'one_time_paid' end,
      'pending',now(),p_stripe_subscription_id,p_stripe_invoice_id
    ) returning id into subscription_id;
  else
    update public.subscriptions set
      payment_status='test_paid',subscription_status='active',service_status='pending',
      stripe_latest_invoice_id=coalesce(p_stripe_invoice_id,stripe_latest_invoice_id)
    where id=subscription_id;
  end if;

  cycle_key := 'stripe-test:' || coalesce(p_stripe_invoice_id,p_stripe_payment_intent_id,attempt.id::text);
  if plan_version.interval_months is null then
    cycle_end_date := null;
  else
    cycle_end_date := (current_date + make_interval(months => plan_version.interval_months))::date - 1;
  end if;

  insert into public.paid_service_cycles(
    customer_id,subscription_id,service_plan_version_id,cycle_start,cycle_end,payment_status,
    external_payment_reference,idempotency_key,is_test,stripe_invoice_id,stripe_payment_intent_id
  ) values(
    customer_id,subscription_id,plan_version.id,current_date,cycle_end_date,'test_paid',
    coalesce(p_stripe_invoice_id,p_stripe_payment_intent_id,attempt.stripe_checkout_session_id),cycle_key,true,
    p_stripe_invoice_id,p_stripe_payment_intent_id
  ) on conflict (idempotency_key) do update set payment_status='test_paid'
  returning id into cycle_id;

  insert into public.cleaning_entitlements(customer_id,paid_service_cycle_id,status,idempotency_key,eligible_from)
  values(customer_id,cycle_id,'due',cycle_key || ':entitlement',current_date)
  on conflict (paid_service_cycle_id) do update set status=
    case when public.cleaning_entitlements.status in ('created','pending_payment','payment_hold') then 'due'::public.entitlement_status else public.cleaning_entitlements.status end
  returning id into entitlement_id;

  if lead.promo_code is not null and attempt.discount_cents > 0 then
    insert into public.promotion_redemptions(
      customer_id,signup_lead_id,stripe_checkout_attempt_id,promo_code,address_fingerprint,customer_email,amount_cents
    ) values(customer_id,lead.id,attempt.id,lead.promo_code,attempt.address_fingerprint,lead.email,attempt.discount_cents)
    on conflict (stripe_checkout_attempt_id) do nothing;
  end if;

  if lead.referral_code is not null then
    select * into ref_code from public.referral_codes where code=lead.referral_code and active limit 1;
    if ref_code.id is not null and ref_code.customer_id <> customer_id then
      insert into public.referral_relationships(
        referral_code_id,referrer_customer_id,referred_customer_id,referred_address_hash,status
      ) values(ref_code.id,ref_code.customer_id,customer_id,attempt.address_fingerprint,'pending_first_service')
      on conflict (referred_customer_id) do nothing;
    end if;
  end if;

  update public.stripe_checkout_attempts set
    stripe_customer_id=p_stripe_customer_id,
    stripe_subscription_id=coalesce(p_stripe_subscription_id,stripe_subscription_id),
    stripe_invoice_id=coalesce(p_stripe_invoice_id,stripe_invoice_id),
    stripe_payment_intent_id=coalesce(p_stripe_payment_intent_id,stripe_payment_intent_id),
    status='paid',updated_at=now()
  where id=attempt.id;

  return jsonb_build_object(
    'customerId',customer_id,'subscriptionId',subscription_id,
    'paidServiceCycleId',cycle_id,'entitlementId',entitlement_id
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
  update public.stripe_checkout_attempts set
    status='payment_failed',stripe_invoice_id=coalesce(p_stripe_invoice_id,stripe_invoice_id),updated_at=now()
  where id=p_attempt_id and not livemode;
  if p_stripe_subscription_id is not null then
    update public.subscriptions set payment_status='payment_failed',service_status='payment_hold',
      stripe_latest_invoice_id=coalesce(p_stripe_invoice_id,stripe_latest_invoice_id)
    where stripe_subscription_id=p_stripe_subscription_id;
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
  update public.subscriptions set subscription_status='canceled',service_status='canceled',ended_at=coalesce(ended_at,now())
  where stripe_subscription_id=p_stripe_subscription_id;
  update public.stripe_checkout_attempts set status='canceled',updated_at=now()
  where stripe_subscription_id=p_stripe_subscription_id and not livemode;
end
$$;
revoke all on function public.cancel_stripe_test_subscription(text) from public,anon,authenticated;
grant execute on function public.cancel_stripe_test_subscription(text) to service_role;
