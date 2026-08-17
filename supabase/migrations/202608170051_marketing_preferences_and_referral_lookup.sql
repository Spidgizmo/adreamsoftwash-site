grant select on table public.referral_codes to service_role;

alter table public.customer_contact_preferences
  add column if not exists marketing_allowed boolean not null default false,
  add column if not exists marketing_consent_version text,
  add column if not exists marketing_updated_at timestamptz not null default now();

create or replace function public.seed_customer_marketing_preference_from_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_version text;
begin
  if new.marketing_consent_version is not null then
    return new;
  end if;

  select
    case
      when l.form_data ? 'marketingAllowed' then coalesce((l.form_data->>'marketingAllowed')::boolean, false)
      else false
    end,
    nullif(l.form_data->>'marketingConsentVersion', '')
  into v_allowed, v_version
  from public.customers c
  join public.stripe_checkout_attempts a
    on a.stripe_customer_id = c.stripe_customer_id
   and not a.livemode
  join public.signup_leads l on l.id = a.signup_lead_id
  where c.id = new.customer_id
  order by a.updated_at desc nulls last, a.created_at desc
  limit 1;

  new.marketing_allowed := coalesce(v_allowed, false);
  new.marketing_consent_version := v_version;
  new.marketing_updated_at := now();
  return new;
end;
$$;

revoke all on function public.seed_customer_marketing_preference_from_signup() from public;

create or replace function public.track_customer_marketing_preference_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.marketing_allowed is distinct from old.marketing_allowed then
    new.marketing_updated_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.track_customer_marketing_preference_change() from public;

drop trigger if exists seed_customer_marketing_preference_from_signup on public.customer_contact_preferences;
create trigger seed_customer_marketing_preference_from_signup
before insert on public.customer_contact_preferences
for each row execute function public.seed_customer_marketing_preference_from_signup();

drop trigger if exists track_customer_marketing_preference_change on public.customer_contact_preferences;
create trigger track_customer_marketing_preference_change
before update on public.customer_contact_preferences
for each row execute function public.track_customer_marketing_preference_change();

with ranked as (
  select
    c.id as customer_id,
    case
      when l.form_data ? 'marketingAllowed' then coalesce((l.form_data->>'marketingAllowed')::boolean, false)
      else false
    end as marketing_allowed,
    nullif(l.form_data->>'marketingConsentVersion', '') as marketing_consent_version,
    row_number() over (
      partition by c.id
      order by a.updated_at desc nulls last, a.created_at desc
    ) as rn
  from public.customers c
  join public.stripe_checkout_attempts a
    on a.stripe_customer_id = c.stripe_customer_id
   and not a.livemode
  join public.signup_leads l on l.id = a.signup_lead_id
)
update public.customer_contact_preferences p
set
  marketing_allowed = r.marketing_allowed,
  marketing_consent_version = r.marketing_consent_version,
  marketing_updated_at = now()
from ranked r
where r.rn = 1
  and r.customer_id = p.customer_id;
