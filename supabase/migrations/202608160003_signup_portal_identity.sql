-- A signup prepares its Supabase Auth identity before Stripe Checkout, but that
-- identity remains login-disabled until a verified paid event activates the customer.
-- Passwords are never stored in application tables.

alter table public.signup_leads
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists signup_leads_auth_user_id_unique
  on public.signup_leads(auth_user_id)
  where auth_user_id is not null;

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
  if lead.auth_user_id is null then raise exception 'Customer portal identity must be prepared before checkout'; end if;
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
