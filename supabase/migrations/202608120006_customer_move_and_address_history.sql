-- Track move-outs separately from customer identity so an address can be reused by a legitimate new occupant.

alter table public.customers
  add column if not exists cancellation_reason text,
  add column if not exists move_out_date date,
  add column if not exists service_through_date date;

create table if not exists public.service_address_occupancy_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  occupancy_started_at timestamptz,
  occupancy_ended_on date,
  end_reason text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists service_address_occupancy_history_address_idx
  on public.service_address_occupancy_history(service_address_id, occupancy_ended_on desc);

alter table public.service_address_occupancy_history enable row level security;

create policy "staff read service address occupancy history"
  on public.service_address_occupancy_history for select
  to authenticated
  using (public.current_user_role() in ('administrator','dispatcher'));

create policy "staff manage service address occupancy history"
  on public.service_address_occupancy_history for all
  to authenticated
  using (public.current_user_role() in ('administrator','dispatcher'))
  with check (public.current_user_role() in ('administrator','dispatcher'));
