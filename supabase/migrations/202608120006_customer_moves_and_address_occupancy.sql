alter table public.customers
  add column if not exists cancellation_reason text,
  add column if not exists move_out_date date,
  add column if not exists service_through_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'customers_cancellation_reason_check'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
      add constraint customers_cancellation_reason_check
      check (cancellation_reason is null or cancellation_reason in ('moved','price','service_issue','no_longer_needed','other'));
  end if;
end $$;

create table if not exists public.service_address_occupancy_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  occupancy_started_on date,
  occupancy_ended_on date,
  end_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (customer_id, service_address_id, occupancy_ended_on)
);

create index if not exists service_address_occupancy_history_address_idx
  on public.service_address_occupancy_history(service_address_id, occupancy_ended_on desc);

create index if not exists service_addresses_normalized_address_hash_idx
  on public.service_addresses(normalized_address_hash)
  where normalized_address_hash is not null;

alter table public.service_address_occupancy_history enable row level security;

revoke all on table public.service_address_occupancy_history from anon, authenticated;
grant select, insert, update on table public.service_address_occupancy_history to service_role;

do $$
begin
  if exists (select 1 from pg_type where typname = 'visit_status') then
    alter type public.visit_status add value if not exists 'canceled';
  end if;
end $$;
