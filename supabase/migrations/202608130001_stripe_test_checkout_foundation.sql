-- Stripe TEST-mode checkout foundation. This migration intentionally does not
-- enable live payments and stores only Stripe object identifiers, never card data.

create table public.stripe_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  signup_lead_id uuid not null references public.signup_leads(id),
  stripe_checkout_session_id text unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  checkout_mode text not null check (checkout_mode in ('payment','subscription')),
  status text not null default 'preparing'
    check (status in ('preparing','open','complete','paid','expired','payment_failed','canceled')),
  plan_id text not null references public.service_plans(id),
  bin_count smallint not null check (bin_count between 1 and 20),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  first_charge_cents integer not null check (first_charge_cents >= 0),
  discount_kind text not null check (discount_kind in ('none','promotion','referral')),
  promo_code text,
  referral_code text,
  address_fingerprint text not null,
  idempotency_key text not null unique,
  livemode boolean not null default false check (not livemode),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (promo_code is null or referral_code is null),
  check (discount_cents <= subtotal_cents),
  check (first_charge_cents = subtotal_cents - discount_cents)
);

create table public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_object_id text,
  livemode boolean not null check (not livemode),
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  signup_lead_id uuid not null references public.signup_leads(id),
  stripe_checkout_attempt_id uuid not null unique references public.stripe_checkout_attempts(id),
  promo_code text not null check (promo_code in ('NEW25','ONE45')),
  address_fingerprint text not null,
  customer_email text not null,
  amount_cents integer not null check (amount_cents > 0),
  successful_at timestamptz not null default now()
);

create unique index one_successful_promo_per_customer_code
  on public.promotion_redemptions(customer_id,promo_code);
create index promotion_redemptions_address_code_idx
  on public.promotion_redemptions(address_fingerprint,promo_code);
create index promotion_redemptions_email_code_idx
  on public.promotion_redemptions(lower(customer_email),promo_code);
create index stripe_checkout_attempts_lead_idx
  on public.stripe_checkout_attempts(signup_lead_id,created_at desc);
create index stripe_checkout_attempts_subscription_idx
  on public.stripe_checkout_attempts(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.customers add column if not exists stripe_customer_id text;
create unique index if not exists customers_stripe_customer_id_unique
  on public.customers(stripe_customer_id) where stripe_customer_id is not null;
alter table public.subscriptions add column if not exists stripe_subscription_id text;
alter table public.subscriptions add column if not exists stripe_latest_invoice_id text;
create unique index if not exists subscriptions_stripe_subscription_id_unique
  on public.subscriptions(stripe_subscription_id) where stripe_subscription_id is not null;
alter table public.paid_service_cycles add column if not exists stripe_invoice_id text;
alter table public.paid_service_cycles add column if not exists stripe_payment_intent_id text;
create unique index if not exists paid_service_cycles_stripe_invoice_unique
  on public.paid_service_cycles(stripe_invoice_id) where stripe_invoice_id is not null;
create unique index if not exists paid_service_cycles_stripe_payment_intent_unique
  on public.paid_service_cycles(stripe_payment_intent_id) where stripe_payment_intent_id is not null;

alter table public.stripe_checkout_attempts enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.promotion_redemptions enable row level security;

create policy stripe_attempts_staff_read on public.stripe_checkout_attempts
for select to authenticated using (
  public.has_role('administrator') or public.has_role('dispatcher')
);
create policy stripe_events_admin_read on public.stripe_webhook_events
for select to authenticated using (public.has_role('administrator'));
create policy promo_redemptions_staff_read on public.promotion_redemptions
for select to authenticated using (
  public.has_role('administrator') or public.has_role('dispatcher') or public.owns_customer(customer_id)
);

grant select on public.stripe_checkout_attempts to authenticated;
grant select on public.stripe_webhook_events to authenticated;
grant select on public.promotion_redemptions to authenticated;
grant all on public.stripe_checkout_attempts to service_role;
grant all on public.stripe_webhook_events to service_role;
grant all on public.promotion_redemptions to service_role;
grant select,update on public.customers to service_role;
grant select,insert,update on public.subscriptions to service_role;
grant select,insert,update on public.paid_service_cycles to service_role;
grant select,insert,update on public.cleaning_entitlements to service_role;

create or replace function public.prepare_stripe_test_checkout(
  p_lead_id uuid,
  p_edit_token text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  lead public.signup_leads%rowtype;
  address_key text;
  prior_promo boolean := false;
begin
  if p_edit_token is null or length(p_edit_token) < 32 then
    raise exception 'A valid signup edit token is required';
  end if;

  select * into lead
  from public.signup_leads
  where id=p_lead_id
    and edit_token_hash=encode(extensions.digest(p_edit_token,'sha256'),'hex')
  for update;

  if lead.id is null then raise exception 'Signup lead or edit token is not valid'; end if;
  if lead.status <> 'submitted_unpaid' then raise exception 'Signup must be submitted before checkout'; end if;
  if not lead.email_allowed or not lead.sms_allowed or not lead.phone_allowed or not lead.terms_accepted then
    raise exception 'Required service permissions and terms must be accepted';
  end if;
  if lead.plan_id is null or lead.bin_count < 1 then raise exception 'Signup pricing selection is incomplete'; end if;
  if lead.promo_code is not null and lead.referral_code is not null then raise exception 'Promo and referral discounts cannot be combined'; end if;

  address_key := encode(extensions.digest(
    lower(regexp_replace(coalesce(lead.line1,'') || '|' || coalesce(lead.line2,'') || '|' ||
      coalesce(lead.city,'') || '|' || coalesce(lead.region,'') || '|' || coalesce(lead.postal_code,''),
      '[^a-zA-Z0-9]+','','g')),
    'sha256'
  ),'hex');

  if lead.promo_code is not null then
    select exists(
      select 1 from public.promotion_redemptions r
      where r.promo_code=lead.promo_code
        and (r.address_fingerprint=address_key or lower(r.customer_email)=lower(lead.email))
    ) into prior_promo;
    if prior_promo then raise exception 'Promotion has already been successfully redeemed by this customer or service address'; end if;
  end if;

  if lead.referral_code is not null and not exists(
    select 1 from public.referral_codes r where r.code=lead.referral_code and r.active
  ) then
    raise exception 'Referral code is not recognized or is inactive';
  end if;

  return jsonb_build_object(
    'id',lead.id,
    'fullName',lead.full_name,
    'email',lead.email,
    'phone',lead.phone,
    'line1',lead.line1,
    'line2',lead.line2,
    'city',lead.city,
    'region',lead.region,
    'postalCode',lead.postal_code,
    'planId',lead.plan_id,
    'binCount',lead.bin_count,
    'binStreams',lead.bin_streams,
    'promoCode',lead.promo_code,
    'referralCode',lead.referral_code,
    'preferredReturnLocation',lead.preferred_return_location,
    'accessInstructions',lead.access_instructions,
    'gateInformation',lead.gate_information,
    'animalWarning',lead.animal_warning,
    'safetyNotes',lead.safety_notes,
    'trashWeekday',lead.trash_weekday,
    'recyclingWeekday',lead.recycling_weekday,
    'recyclingFrequencyWeeks',lead.recycling_frequency_weeks,
    'recyclingAnchorCollectionDate',lead.recycling_anchor_collection_date,
    'addressFingerprint',address_key
  );
end
$$;

revoke all on function public.prepare_stripe_test_checkout(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_stripe_test_checkout(uuid,text) to service_role;

create or replace function public.claim_stripe_test_webhook_event(
  p_event_id text,
  p_event_type text,
  p_object_id text,
  p_livemode boolean
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_livemode then raise exception 'Live Stripe events are blocked by the test integration'; end if;
  insert into public.stripe_webhook_events(stripe_event_id,event_type,stripe_object_id,livemode)
  values(p_event_id,p_event_type,p_object_id,false)
  on conflict (stripe_event_id) do nothing;
  return found;
end
$$;
revoke all on function public.claim_stripe_test_webhook_event(text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.claim_stripe_test_webhook_event(text,text,text,boolean) to service_role;

create or replace function public.finish_stripe_test_webhook_event(
  p_event_id text,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_status not in ('processed','ignored','failed') then raise exception 'Invalid webhook processing status'; end if;
  update public.stripe_webhook_events
  set processing_status=p_status,error_message=left(p_error,500),processed_at=now()
  where stripe_event_id=p_event_id;
end
$$;
revoke all on function public.finish_stripe_test_webhook_event(text,text,text) from public,anon,authenticated;
grant execute on function public.finish_stripe_test_webhook_event(text,text,text) to service_role;
