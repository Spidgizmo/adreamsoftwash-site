alter table public.customers
  add column if not exists cancellation_reason text,
  add column if not exists move_out_date date,
  add column if not exists service_through_date date;

do $$ begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'visit_status' and e.enumlabel = 'canceled'
  ) then
    alter type public.visit_status add value 'canceled';
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
  created_at timestamptz not null default now()
);

create index if not exists idx_service_address_occupancy_history_address
  on public.service_address_occupancy_history(service_address_id, occupancy_ended_on desc);
create index if not exists idx_service_address_occupancy_history_customer
  on public.service_address_occupancy_history(customer_id, occupancy_ended_on desc);
