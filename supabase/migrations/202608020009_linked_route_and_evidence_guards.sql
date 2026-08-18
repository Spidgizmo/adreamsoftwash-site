-- Preserve linked route integrity, completion evidence, and exact current-address invariants.

create or replace function public.guard_linked_route_stop()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from service_visits v where v.route_stop_id=old.id)
     and (
       new.route_id is distinct from old.route_id
       or new.service_address_id is distinct from old.service_address_id
     )
  then
    raise exception 'Linked route stop relationships are immutable';
  end if;
  return new;
end
$$;
create trigger preserve_linked_route_stop
before update on public.route_stops
for each row execute function public.guard_linked_route_stop();

create or replace function public.guard_linked_route_technician()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.technician_id is distinct from old.technician_id
     and exists(
       select 1
       from route_stops rs
       join service_visits v on v.route_stop_id=rs.id
       where rs.route_id=old.id
     )
  then
    raise exception 'Technician on a route with linked visits is immutable';
  end if;
  return new;
end
$$;
create trigger preserve_linked_route_technician
before update on public.routes
for each row execute function public.guard_linked_route_technician();

create or replace function public.freeze_completed_visit_evidence()
returns trigger language plpgsql set search_path=public as $$
declare
  target_visit uuid;
begin
  target_visit := case when tg_op='DELETE' then old.service_visit_id else new.service_visit_id end;
  if exists(
    select 1 from service_visits v
    where v.id=target_visit and v.status='completed'
  ) then
    raise exception 'Evidence for completed visits is immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;
create trigger preserve_completed_visit_photographs
before insert or update or delete on public.visit_photographs
for each row execute function public.freeze_completed_visit_evidence();

create or replace function public.require_one_current_address()
returns trigger language plpgsql set search_path=public as $$
declare
  affected_customer uuid;
begin
  affected_customer := case when tg_op='DELETE' then old.customer_id else new.customer_id end;
  if exists(select 1 from customers c where c.id=affected_customer)
     and (select count(*) from service_addresses a where a.customer_id=affected_customer and a.is_current) <> 1
  then
    raise exception 'Customer must have exactly one current service address';
  end if;
  if tg_op='UPDATE' and old.customer_id is distinct from new.customer_id
     and exists(select 1 from customers c where c.id=old.customer_id)
     and (select count(*) from service_addresses a where a.customer_id=old.customer_id and a.is_current) <> 1
  then
    raise exception 'Customer must have exactly one current service address';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;
create constraint trigger service_addresses_require_current
after insert or update or delete on public.service_addresses
deferrable initially deferred
for each row execute function public.require_one_current_address();

drop policy if exists cleaning_owner_staff on public.cleaning_day_assignments;
create policy cleaning_owner_staff on public.cleaning_day_assignments for select using(
  exists(
    select 1
    from trash_pickup_schedules p
    where p.id=pickup_schedule_id
      and (
        public.owns_customer(public.customer_for_address(p.service_address_id))
        or public.has_role('administrator')
        or public.has_role('dispatcher')
        or (
          public.has_role('field_technician')
          and exists(
            select 1
            from service_visits v
            join route_stops rs on rs.id=v.route_stop_id
            where v.assigned_technician_id=auth.uid()
              and rs.service_address_id=p.service_address_id
          )
        )
      )
  )
);
