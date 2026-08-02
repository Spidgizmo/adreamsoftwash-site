-- Paid-service entitlement foundation and text-safe audit keys.
create type public.entitlement_status as enum ('created','pending_payment','due','scheduled','payment_hold','moved_to_next_eligible_zone_run','completed','skipped','refused','canceled','expired');
create table public.paid_service_cycles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  subscription_id uuid references public.subscriptions(id),
  service_plan_version_id uuid not null references public.service_plan_versions(id),
  cycle_start date not null,
  cycle_end date,
  payment_status text not null default 'test_pending',
  external_payment_reference text,
  idempotency_key text not null unique,
  is_test boolean not null default true,
  created_at timestamptz not null default now(),
  check (cycle_end is null or cycle_end >= cycle_start)
);
create table public.cleaning_entitlements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  paid_service_cycle_id uuid not null unique references public.paid_service_cycles(id),
  status public.entitlement_status not null default 'created',
  idempotency_key text not null unique,
  eligible_from date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.service_visits add column entitlement_id uuid references public.cleaning_entitlements(id);
create unique index one_completed_visit_per_entitlement on public.service_visits(entitlement_id) where status='completed' and entitlement_id is not null;
alter table public.paid_service_cycles enable row level security;
alter table public.cleaning_entitlements enable row level security;
create policy paid_cycles_owner_read on public.paid_service_cycles for select using(public.owns_customer(customer_id) or public.has_role('administrator'));
create policy paid_cycles_admin_manage on public.paid_service_cycles for all using(public.has_role('administrator')) with check(public.has_role('administrator'));
create policy entitlements_owner_read on public.cleaning_entitlements for select using(public.owns_customer(customer_id) or public.has_role('administrator') or public.has_role('dispatcher'));
create policy entitlements_admin_manage on public.cleaning_entitlements for all using(public.has_role('administrator')) with check(public.has_role('administrator'));

alter table public.audit_events add column entity_key text;
create or replace function public.audit_protected_mutation() returns trigger language plpgsql security definer set search_path=public as $$
declare key_text text; key_uuid uuid;
begin
  key_text := coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id');
  if key_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then key_uuid := key_text::uuid; end if;
  insert into audit_events(actor_id,action,entity_table,entity_id,entity_key,before_data,after_data)
  values(auth.uid(),tg_op,tg_table_name,key_uuid,key_text,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger audit_paid_service_cycles after insert or update or delete on public.paid_service_cycles for each row execute function public.audit_protected_mutation();
create trigger audit_cleaning_entitlements after insert or update or delete on public.cleaning_entitlements for each row execute function public.audit_protected_mutation();
