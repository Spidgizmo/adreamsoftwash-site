-- Preserve customer bin changes and the exact service configuration used for each locked visit.
-- This is staging-safe infrastructure only; Stripe remains disabled.

create table if not exists public.customer_bin_change_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  requested_by uuid not null references public.user_profiles(id),
  old_trash_bin_count integer not null check (old_trash_bin_count between 0 and 20),
  old_recycling_bin_count integer not null check (old_recycling_bin_count between 0 and 20),
  new_trash_bin_count integer not null check (new_trash_bin_count between 0 and 20),
  new_recycling_bin_count integer not null check (new_recycling_bin_count between 0 and 20),
  old_recurring_price_cents integer check (old_recurring_price_cents is null or old_recurring_price_cents >= 0),
  new_recurring_price_cents integer check (new_recurring_price_cents is null or new_recurring_price_cents >= 0),
  recycling_weekday smallint check (recycling_weekday is null or recycling_weekday between 0 and 6),
  recycling_frequency_weeks integer check (recycling_frequency_weeks is null or recycling_frequency_weeks between 1 and 4),
  recycling_anchor_collection_date date,
  requested_at timestamptz not null default now(),
  service_effective_at timestamptz not null,
  billing_effective_policy text not null default 'next_renewal' check (billing_effective_policy = 'next_renewal'),
  locked_visit_id uuid references public.service_visits(id),
  status text not null default 'scheduled' check (status in ('scheduled','effective','rejected','superseded')),
  is_test boolean not null default true,
  check (new_trash_bin_count + new_recycling_bin_count >= 1),
  check (
    new_recycling_bin_count = 0
    or (recycling_weekday is not null and recycling_frequency_weeks is not null and (recycling_frequency_weeks = 1 or recycling_anchor_collection_date is not null))
  )
);

create table if not exists public.customer_bin_configurations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  trash_bin_count integer not null check (trash_bin_count between 0 and 20),
  recycling_bin_count integer not null check (recycling_bin_count between 0 and 20),
  recurring_price_cents integer check (recurring_price_cents is null or recurring_price_cents >= 0),
  effective_service_at timestamptz not null,
  billing_effective_policy text not null default 'next_renewal' check (billing_effective_policy in ('current','next_renewal')),
  source text not null check (source in ('migration_baseline','signup','customer_portal','staff')),
  source_change_request_id uuid references public.customer_bin_change_requests(id),
  changed_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  is_test boolean not null default true,
  check (trash_bin_count + recycling_bin_count >= 1)
);

create index if not exists customer_bin_configurations_current_idx
  on public.customer_bin_configurations(customer_id, service_address_id, effective_service_at desc, created_at desc);
create index if not exists customer_bin_changes_customer_idx
  on public.customer_bin_change_requests(customer_id, requested_at desc);

create table if not exists public.service_visit_configuration_snapshots (
  service_visit_id uuid primary key references public.service_visits(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  service_address_id uuid not null references public.service_addresses(id) on delete cascade,
  bin_configuration_id uuid references public.customer_bin_configurations(id),
  trash_bin_count integer not null check (trash_bin_count between 0 and 20),
  recycling_bin_count integer not null check (recycling_bin_count between 0 and 20),
  recurring_price_cents integer check (recurring_price_cents is null or recurring_price_cents >= 0),
  preferred_return_location text,
  access_instructions text,
  gate_information text,
  animal_warning text,
  trash_pickup_weekday smallint check (trash_pickup_weekday is null or trash_pickup_weekday between 0 and 6),
  recycling_pickup_weekday smallint check (recycling_pickup_weekday is null or recycling_pickup_weekday between 0 and 6),
  recycling_frequency_weeks integer,
  recycling_anchor_collection_date date,
  locked_at timestamptz not null default now(),
  lock_reason text not null default 'route_assignment',
  is_test boolean not null default true,
  check (trash_bin_count + recycling_bin_count >= 1)
);

-- Establish a baseline for existing fictional customers without rewriting any historic visit.
insert into public.customer_bin_configurations (
  customer_id, service_address_id, trash_bin_count, recycling_bin_count,
  recurring_price_cents, effective_service_at, billing_effective_policy, source, is_test
)
select
  a.customer_id,
  a.id,
  greatest(0, count(b.id) filter (where lower(coalesce(b.description,'')) not like '%recycl%'))::integer,
  greatest(0, count(b.id) filter (where lower(coalesce(b.description,'')) like '%recycl%'))::integer,
  case
    when v.id is null then null
    else coalesce(v.base_price_cents,0) + greatest(0, count(b.id)::integer - coalesce(v.bins_included,1)) * coalesce(v.additional_bin_price_cents,0)
  end,
  now(),
  'current',
  'migration_baseline',
  c.is_test
from public.customers c
join public.service_addresses a on a.customer_id=c.id and a.is_current
left join public.bins b on b.service_address_id=a.id and b.active
left join lateral (
  select spv.id, spv.base_price_cents, spv.additional_bin_price_cents, spv.bins_included
  from public.subscriptions s
  join public.service_plan_versions spv on spv.id=s.service_plan_version_id
  where s.customer_id=c.id and s.ended_at is null
  order by s.started_at desc nulls last
  limit 1
) v on true
where c.is_test
  and not exists (select 1 from public.customer_bin_configurations cfg where cfg.customer_id=c.id and cfg.service_address_id=a.id)
group by c.id, c.is_test, a.id, a.customer_id, v.id, v.base_price_cents, v.additional_bin_price_cents, v.bins_included
having count(b.id) > 0;

create or replace function public.prevent_visit_snapshot_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Locked service visit configuration snapshots are immutable';
end
$$;

drop trigger if exists service_visit_snapshot_immutable on public.service_visit_configuration_snapshots;
create trigger service_visit_snapshot_immutable
before update or delete on public.service_visit_configuration_snapshots
for each row execute function public.prevent_visit_snapshot_mutation();

create or replace function public.lock_service_visit_configuration()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  address_record public.service_addresses%rowtype;
  config_record public.customer_bin_configurations%rowtype;
  trash_day smallint;
  recycling_day smallint;
  recycling_frequency integer;
  recycling_anchor date;
begin
  if new.route_stop_id is null or new.status not in ('assigned','en_route','arrived','before_photo_complete','cleaning_in_progress','after_photo_complete','bins_returned','completed') then
    return new;
  end if;
  if exists (select 1 from public.service_visit_configuration_snapshots s where s.service_visit_id=new.id) then
    return new;
  end if;

  select a.* into address_record
  from public.route_stops rs
  join public.service_addresses a on a.id=rs.service_address_id
  where rs.id=new.route_stop_id and a.customer_id=new.customer_id;
  if address_record.id is null then return new; end if;

  select * into config_record
  from public.customer_bin_configurations cfg
  where cfg.customer_id=new.customer_id
    and cfg.service_address_id=address_record.id
    and cfg.effective_service_at <= now()
  order by cfg.effective_service_at desc, cfg.created_at desc
  limit 1;
  if config_record.id is null then return new; end if;

  select weekday into trash_day
  from public.trash_pickup_schedules
  where service_address_id=address_record.id and (effective_to is null or effective_to >= current_date)
  order by effective_from desc limit 1;

  select weekday, frequency_weeks, anchor_collection_date
    into recycling_day, recycling_frequency, recycling_anchor
  from public.recycling_pickup_schedules
  where service_address_id=address_record.id and is_current
  order by created_at desc limit 1;

  insert into public.service_visit_configuration_snapshots (
    service_visit_id, customer_id, service_address_id, bin_configuration_id,
    trash_bin_count, recycling_bin_count, recurring_price_cents,
    preferred_return_location, access_instructions, gate_information, animal_warning,
    trash_pickup_weekday, recycling_pickup_weekday, recycling_frequency_weeks,
    recycling_anchor_collection_date, lock_reason, is_test
  ) values (
    new.id, new.customer_id, address_record.id, config_record.id,
    config_record.trash_bin_count, config_record.recycling_bin_count, config_record.recurring_price_cents,
    address_record.preferred_return_location, address_record.access_instructions,
    address_record.gate_information, address_record.animal_warning,
    trash_day, recycling_day, recycling_frequency, recycling_anchor,
    'route_assignment', new.is_test
  ) on conflict (service_visit_id) do nothing;
  return new;
end
$$;

drop trigger if exists lock_service_visit_configuration on public.service_visits;
create trigger lock_service_visit_configuration
after insert or update of status, route_stop_id on public.service_visits
for each row execute function public.lock_service_visit_configuration();

alter table public.customer_bin_change_requests enable row level security;
alter table public.customer_bin_configurations enable row level security;
alter table public.service_visit_configuration_snapshots enable row level security;

create policy bin_change_owner_read on public.customer_bin_change_requests for select
  using (public.owns_customer(customer_id));
create policy bin_change_owner_insert on public.customer_bin_change_requests for insert
  with check (public.owns_customer(customer_id) and requested_by=auth.uid());
create policy bin_change_staff_manage on public.customer_bin_change_requests for all
  using (public.has_role('administrator') or public.has_role('dispatcher'))
  with check (public.has_role('administrator') or public.has_role('dispatcher'));

create policy bin_config_owner_read on public.customer_bin_configurations for select
  using (public.owns_customer(customer_id));
create policy bin_config_owner_insert on public.customer_bin_configurations for insert
  with check (public.owns_customer(customer_id) and source='customer_portal' and changed_by=auth.uid());
create policy bin_config_staff_manage on public.customer_bin_configurations for all
  using (public.has_role('administrator') or public.has_role('dispatcher'))
  with check (public.has_role('administrator') or public.has_role('dispatcher'));

create policy visit_snapshot_owner_read on public.service_visit_configuration_snapshots for select
  using (public.owns_customer(customer_id));
create policy visit_snapshot_staff_read on public.service_visit_configuration_snapshots for select
  using (public.has_role('administrator') or public.has_role('dispatcher') or exists (
    select 1 from public.service_visits v where v.id=service_visit_id and v.assigned_technician_id=auth.uid()
  ));

revoke update, delete on public.service_visit_configuration_snapshots from authenticated;

grant select, insert on public.customer_bin_change_requests to authenticated;
grant select, insert on public.customer_bin_configurations to authenticated;
grant select on public.service_visit_configuration_snapshots to authenticated;
