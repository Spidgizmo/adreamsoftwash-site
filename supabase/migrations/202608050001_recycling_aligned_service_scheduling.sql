-- Align any service that includes a recycling cart to an actual recycling collection.

alter table public.bins
  add column collection_stream text not null default 'trash'
  check (collection_stream in ('trash','recycling','other'));

alter table public.subscriptions
  add column service_alignment text not null default 'trash_collection'
  check (service_alignment in (
    'trash_collection',
    'recycling_collection',
    'staff_review_required'
  ));

create table public.recycling_pickup_schedules (
  id uuid primary key default gen_random_uuid(),
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  frequency_weeks smallint not null default 2 check (frequency_weeks between 1 and 4),
  anchor_collection_date date not null,
  source public.pickup_source not null default 'unverified',
  verification_status text not null default 'unverified',
  effective_from date not null,
  effective_to date,
  holiday_shift_days integer not null default 0 check (holiday_shift_days >= 0),
  holiday_shift_status text not null default 'none',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create unique index recycling_pickup_one_current_per_address
  on public.recycling_pickup_schedules(service_address_id)
  where is_current;

create or replace function public.validate_recycling_schedule_anchor()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if extract(dow from new.anchor_collection_date)::integer <> new.weekday then
    raise exception 'Recycling anchor date must fall on the selected recycling weekday';
  end if;
  return new;
end
$$;

create trigger validate_recycling_schedule_anchor
before insert or update of weekday, anchor_collection_date
on public.recycling_pickup_schedules
for each row execute function public.validate_recycling_schedule_anchor();

alter table public.recycling_pickup_schedules enable row level security;

grant select, insert, update, delete
  on public.recycling_pickup_schedules
  to authenticated;

create policy recycling_schedule_owner_staff
on public.recycling_pickup_schedules
for select
using (
  public.owns_customer(public.customer_for_address(service_address_id))
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (
    public.has_role('field_technician')
    and exists (
      select 1
      from public.service_visits visit
      join public.route_stops stop on stop.id=visit.route_stop_id
      where visit.assigned_technician_id=auth.uid()
        and stop.service_address_id=recycling_pickup_schedules.service_address_id
    )
  )
);

create policy recycling_schedule_staff_manage
on public.recycling_pickup_schedules
for all
using (public.has_role('administrator') or public.has_role('dispatcher'))
with check (public.has_role('administrator') or public.has_role('dispatcher'));

create trigger audit_recycling_pickup_schedules
after insert or update or delete on public.recycling_pickup_schedules
for each row execute function public.audit_protected_mutation();

alter table public.customer_change_requests
  drop constraint if exists customer_change_requests_request_type_check;

alter table public.customer_change_requests
  add constraint customer_change_requests_request_type_check
  check (request_type in (
    'return_location',
    'access_instructions',
    'gate_information',
    'animal_warning',
    'bin_count',
    'recycling_schedule',
    'bin_collection_types'
  ));

revoke all on function public.validate_recycling_schedule_anchor()
  from public, anon, authenticated;
