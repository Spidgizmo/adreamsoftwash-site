-- Step 4 fictional signup intake. This does not create a paid subscription,
-- start Stripe Checkout, or accept production customer information.

create table public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  edit_token_hash text not null,
  status text not null default 'incomplete'
    check (status in ('incomplete','abandoned','submitted_unpaid')),
  full_name text,
  email text,
  phone text,
  line1 text,
  line2 text,
  city text,
  region text,
  postal_code text,
  plan_id text references public.service_plans(id),
  bin_count smallint not null default 0
    check (bin_count between 0 and 20),
  bin_streams jsonb not null default '{"trash":0,"recycling":0,"other":0}'::jsonb
    check (jsonb_typeof(bin_streams)='object'),
  trash_weekday smallint check (trash_weekday between 0 and 6),
  recycling_weekday smallint check (recycling_weekday between 0 and 6),
  recycling_frequency_weeks smallint
    check (recycling_frequency_weeks in (1,2)),
  recycling_anchor_collection_date date,
  promo_code text,
  referral_code text,
  preferred_return_location text,
  access_instructions text,
  gate_information text,
  animal_warning text,
  safety_notes text,
  email_allowed boolean not null default false,
  sms_allowed boolean not null default false,
  phone_allowed boolean not null default false,
  terms_accepted boolean not null default false,
  source_path text not null default '/bin-cleaning/signup',
  estimated_subtotal_cents integer,
  estimated_discount_cents integer not null default 0,
  estimated_first_charge_cents integer,
  discount_kind text not null default 'none'
    check (discount_kind in ('none','promotion','referral')),
  discount_status text not null default 'none'
    check (discount_status in ('none','pending','applied','invalid','ineligible')),
  form_data jsonb not null default '{}'::jsonb,
  is_test boolean not null default true check (is_test),
  last_activity_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (promo_code is null or referral_code is null),
  check (email is null or email='' or lower(email) like '%.test'),
  check (
    phone is null or phone='' or
    regexp_replace(phone,'[^0-9]','','g') ~ '^1555[0-9]{7}$'
  ),
  check (status <> 'submitted_unpaid' or submitted_at is not null)
);

create index signup_leads_status_activity_idx
  on public.signup_leads(status,last_activity_at desc);
create index signup_leads_email_idx
  on public.signup_leads(lower(email))
  where email is not null;

create table public.signup_lead_status_history (
  id uuid primary key default gen_random_uuid(),
  signup_lead_id uuid not null references public.signup_leads(id) on delete cascade,
  from_status text,
  to_status text not null,
  source text not null default 'staging_signup',
  created_at timestamptz not null default now()
);

create or replace function public.record_signup_lead_status_history()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.signup_lead_status_history(
      signup_lead_id,
      from_status,
      to_status,
      source
    ) values (
      new.id,
      case when tg_op='INSERT' then null else old.status end,
      new.status,
      coalesce(nullif(new.source_path,''),'staging_signup')
    );
  end if;
  return new;
end
$$;

revoke all on function public.record_signup_lead_status_history()
  from public, anon, authenticated;

create trigger signup_lead_status_history_trigger
after insert or update of status on public.signup_leads
for each row execute function public.record_signup_lead_status_history();

alter table public.signup_leads enable row level security;
alter table public.signup_lead_status_history enable row level security;

create policy signup_leads_staff_read
on public.signup_leads
for select
to authenticated
using (
  public.has_role('administrator') or
  public.has_role('dispatcher')
);

create policy signup_lead_history_staff_read
on public.signup_lead_status_history
for select
to authenticated
using (
  public.has_role('administrator') or
  public.has_role('dispatcher')
);

revoke all on table public.signup_leads from public, anon, authenticated;
revoke all on table public.signup_lead_status_history from public, anon, authenticated;

grant select (
  id,status,full_name,email,phone,line1,line2,city,region,postal_code,
  plan_id,bin_count,bin_streams,trash_weekday,recycling_weekday,
  recycling_frequency_weeks,recycling_anchor_collection_date,promo_code,
  referral_code,preferred_return_location,access_instructions,
  gate_information,animal_warning,safety_notes,email_allowed,sms_allowed,
  phone_allowed,terms_accepted,source_path,estimated_subtotal_cents,
  estimated_discount_cents,estimated_first_charge_cents,discount_kind,
  discount_status,is_test,last_activity_at,submitted_at,created_at,updated_at
) on public.signup_leads to authenticated;

grant select (
  id,signup_lead_id,from_status,to_status,source,created_at
) on public.signup_lead_status_history to authenticated;

grant all on table public.signup_leads to service_role;
grant all on table public.signup_lead_status_history to service_role;

create or replace function public.save_fictional_signup_lead(
  p_payload jsonb,
  p_lead_id uuid default null,
  p_edit_token text default null,
  p_status text default 'incomplete'
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions
as $$
declare
  v_id uuid;
  v_token text;
  v_existing_status text;
  v_effective_status text;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  v_full_name text := nullif(left(trim(coalesce(p_payload->>'fullName','')),120),'');
  v_email text := nullif(lower(left(trim(coalesce(p_payload->>'email','')),254)),'');
  v_phone text := nullif(left(trim(coalesce(p_payload->>'phone','')),40),'');
  v_line1 text := nullif(left(trim(coalesce(p_payload->>'line1','')),160),'');
  v_line2 text := nullif(left(trim(coalesce(p_payload->>'line2','')),120),'');
  v_city text := nullif(left(trim(coalesce(p_payload->>'city','')),100),'');
  v_region text := nullif(upper(left(trim(coalesce(p_payload->>'region','')),40)),'');
  v_postal_code text := nullif(left(trim(coalesce(p_payload->>'postalCode','')),10),'');
  v_plan_id text := nullif(left(trim(coalesce(p_payload->>'planId','')),40),'');
  v_trash_count smallint := coalesce(nullif(p_payload#>>'{binStreams,trash}','')::smallint,0);
  v_recycling_count smallint := coalesce(nullif(p_payload#>>'{binStreams,recycling}','')::smallint,0);
  v_other_count smallint := coalesce(nullif(p_payload#>>'{binStreams,other}','')::smallint,0);
  v_bin_count smallint;
  v_trash_weekday smallint := nullif(p_payload->>'trashWeekday','')::smallint;
  v_recycling_weekday smallint := nullif(p_payload->>'recyclingWeekday','')::smallint;
  v_recycling_frequency smallint := nullif(p_payload->>'recyclingFrequencyWeeks','')::smallint;
  v_recycling_anchor date := nullif(p_payload->>'recyclingAnchorCollectionDate','')::date;
  v_promo_code text := nullif(upper(regexp_replace(trim(coalesce(p_payload->>'promoCode','')),'\s+','','g')),'');
  v_referral_code text := nullif(upper(regexp_replace(trim(coalesce(p_payload->>'referralCode','')),'\s+','','g')),'');
  v_return_location text := nullif(left(trim(coalesce(p_payload->>'preferredReturnLocation','')),300),'');
  v_access text := nullif(left(trim(coalesce(p_payload->>'accessInstructions','')),1000),'');
  v_gate text := nullif(left(trim(coalesce(p_payload->>'gateInformation','')),500),'');
  v_animal text := nullif(left(trim(coalesce(p_payload->>'animalWarning','')),500),'');
  v_safety text := nullif(left(trim(coalesce(p_payload->>'safetyNotes','')),1000),'');
  v_source_path text := coalesce(nullif(left(trim(coalesce(p_payload->>'sourcePath','')),200),''),'/bin-cleaning/signup');
  v_fictional_confirmed boolean := coalesce((p_payload->>'fictionalDataConfirmed')::boolean,false);
  v_terms_accepted boolean := coalesce((p_payload->>'termsAccepted')::boolean,false);
  v_email_allowed boolean := coalesce((p_payload->>'emailAllowed')::boolean,false);
  v_sms_allowed boolean := coalesce((p_payload->>'smsAllowed')::boolean,false);
  v_phone_allowed boolean := coalesce((p_payload->>'phoneAllowed')::boolean,false);
  v_subtotal integer := nullif(p_payload#>>'{estimate,subtotalCents}','')::integer;
  v_discount integer := coalesce(nullif(p_payload#>>'{estimate,discountCents}','')::integer,0);
  v_first_charge integer := nullif(p_payload#>>'{estimate,firstChargeCents}','')::integer;
  v_discount_kind text := coalesce(nullif(p_payload#>>'{estimate,discountKind}',''),'none');
  v_discount_status text := coalesce(nullif(p_payload#>>'{estimate,discountStatus}',''),'none');
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Signup payload must be a JSON object';
  end if;
  if p_status not in ('incomplete','abandoned','submitted_unpaid') then
    raise exception 'Signup status is not valid';
  end if;
  if not v_fictional_confirmed then
    raise exception 'Only confirmed fictional staging data may be saved';
  end if;
  if v_email is not null and v_email not like '%.test' then
    raise exception 'Staging email must end in .test';
  end if;
  if v_phone is not null and regexp_replace(v_phone,'[^0-9]','','g') !~ '^1555[0-9]{7}$' then
    raise exception 'Staging phone must be a reserved 555 number';
  end if;
  if v_plan_id is not null and v_plan_id not in ('monthly','quarterly','twice-yearly','one-time') then
    raise exception 'Service plan is not available';
  end if;
  if least(v_trash_count,v_recycling_count,v_other_count) < 0 then
    raise exception 'Bin counts cannot be negative';
  end if;
  v_bin_count := v_trash_count + v_recycling_count + v_other_count;
  if v_bin_count > 20 then
    raise exception 'Total bin count cannot exceed 20';
  end if;
  if v_trash_weekday is not null and v_trash_weekday not between 0 and 6 then
    raise exception 'Trash weekday is not valid';
  end if;
  if v_recycling_weekday is not null and v_recycling_weekday not between 0 and 6 then
    raise exception 'Recycling weekday is not valid';
  end if;
  if v_recycling_frequency is not null and v_recycling_frequency not in (1,2) then
    raise exception 'Recycling frequency must be weekly or every other week';
  end if;
  if v_recycling_anchor is not null and v_recycling_weekday is not null and
     extract(dow from v_recycling_anchor)::smallint <> v_recycling_weekday then
    raise exception 'Recycling anchor date must fall on the selected weekday';
  end if;
  if v_promo_code is not null and v_referral_code is not null then
    raise exception 'Promo and referral discounts cannot be combined';
  end if;
  if v_referral_code is not null and v_plan_id is distinct from 'monthly' then
    raise exception 'Referral codes require the Monthly plan';
  end if;
  if v_discount_kind not in ('none','promotion','referral') or
     v_discount_status not in ('none','pending','applied','invalid','ineligible') then
    raise exception 'Discount summary is not valid';
  end if;

  if p_status='submitted_unpaid' then
    if v_full_name is null or v_email is null or v_phone is null or
       v_line1 is null or v_city is null or v_region is null or
       v_postal_code is null or v_plan_id is null or v_bin_count < 1 or
       v_trash_weekday is null or v_return_location is null or not v_terms_accepted then
      raise exception 'Submitted unpaid signup is missing required fields';
    end if;
    if v_recycling_count > 0 and (
      v_recycling_weekday is null or
      v_recycling_frequency is null or
      v_recycling_anchor is null
    ) then
      raise exception 'Recycling bins require weekday, frequency, and anchor date';
    end if;
  end if;

  if p_lead_id is null then
    if p_edit_token is not null then
      raise exception 'Edit token cannot be supplied for a new signup';
    end if;
    v_token := encode(extensions.gen_random_bytes(24),'hex');
    insert into public.signup_leads(
      edit_token_hash,status,full_name,email,phone,line1,line2,city,region,
      postal_code,plan_id,bin_count,bin_streams,trash_weekday,
      recycling_weekday,recycling_frequency_weeks,
      recycling_anchor_collection_date,promo_code,referral_code,
      preferred_return_location,access_instructions,gate_information,
      animal_warning,safety_notes,email_allowed,sms_allowed,phone_allowed,
      terms_accepted,source_path,estimated_subtotal_cents,
      estimated_discount_cents,estimated_first_charge_cents,discount_kind,
      discount_status,form_data,submitted_at
    ) values (
      encode(extensions.digest(v_token,'sha256'),'hex'),p_status,v_full_name,
      v_email,v_phone,v_line1,v_line2,v_city,v_region,v_postal_code,v_plan_id,
      v_bin_count,jsonb_build_object('trash',v_trash_count,'recycling',v_recycling_count,'other',v_other_count),
      v_trash_weekday,v_recycling_weekday,v_recycling_frequency,
      v_recycling_anchor,v_promo_code,v_referral_code,v_return_location,
      v_access,v_gate,v_animal,v_safety,v_email_allowed,v_sms_allowed,
      v_phone_allowed,v_terms_accepted,v_source_path,v_subtotal,v_discount,
      v_first_charge,v_discount_kind,v_discount_status,p_payload,
      case when p_status='submitted_unpaid' then now() else null end
    ) returning id,created_at,updated_at into v_id,v_created_at,v_updated_at;
  else
    if p_edit_token is null or length(p_edit_token) < 32 then
      raise exception 'A valid edit token is required';
    end if;
    select status into v_existing_status
    from public.signup_leads
    where id=p_lead_id
      and edit_token_hash=encode(extensions.digest(p_edit_token,'sha256'),'hex');
    if v_existing_status is null then
      raise exception 'Signup lead or edit token is not valid';
    end if;
    v_effective_status := case
      when v_existing_status='submitted_unpaid' then 'submitted_unpaid'
      else p_status
    end;
    update public.signup_leads set
      status=v_effective_status,
      full_name=v_full_name,
      email=v_email,
      phone=v_phone,
      line1=v_line1,
      line2=v_line2,
      city=v_city,
      region=v_region,
      postal_code=v_postal_code,
      plan_id=v_plan_id,
      bin_count=v_bin_count,
      bin_streams=jsonb_build_object('trash',v_trash_count,'recycling',v_recycling_count,'other',v_other_count),
      trash_weekday=v_trash_weekday,
      recycling_weekday=v_recycling_weekday,
      recycling_frequency_weeks=v_recycling_frequency,
      recycling_anchor_collection_date=v_recycling_anchor,
      promo_code=v_promo_code,
      referral_code=v_referral_code,
      preferred_return_location=v_return_location,
      access_instructions=v_access,
      gate_information=v_gate,
      animal_warning=v_animal,
      safety_notes=v_safety,
      email_allowed=v_email_allowed,
      sms_allowed=v_sms_allowed,
      phone_allowed=v_phone_allowed,
      terms_accepted=v_terms_accepted,
      source_path=v_source_path,
      estimated_subtotal_cents=v_subtotal,
      estimated_discount_cents=v_discount,
      estimated_first_charge_cents=v_first_charge,
      discount_kind=v_discount_kind,
      discount_status=v_discount_status,
      form_data=p_payload,
      last_activity_at=now(),
      submitted_at=case
        when v_effective_status='submitted_unpaid' then coalesce(submitted_at,now())
        else null
      end,
      updated_at=now()
    where id=p_lead_id
    returning id,created_at,updated_at
    into v_id,v_created_at,v_updated_at;
    v_token := p_edit_token;
    p_status := v_effective_status;
  end if;

  return jsonb_build_object(
    'id',v_id,
    'editToken',v_token,
    'status',p_status,
    'createdAt',v_created_at,
    'updatedAt',v_updated_at
  );
end
$$;

revoke all on function public.save_fictional_signup_lead(jsonb,uuid,text,text)
  from public;
grant execute on function public.save_fictional_signup_lead(jsonb,uuid,text,text)
  to anon, authenticated, service_role;

comment on table public.signup_leads is
  'Fictional staging signup records only. Step 4 stops before Stripe Checkout.';
comment on function public.save_fictional_signup_lead(jsonb,uuid,text,text) is
  'Creates or updates a fictional staging signup through an opaque edit token; never accepts payment.';
