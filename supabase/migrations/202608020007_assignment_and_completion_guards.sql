-- Final review corrections: freeze completed work and align assignment authorization.

create or replace function public.preserve_completed_visit()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'completed' then
      raise exception 'Completed visits are immutable';
    end if;
    return old;
  end if;
  if old.status = 'completed' and new is distinct from old then
    raise exception 'Completed visits are immutable';
  end if;
  return new;
end
$$;

create or replace function public.validate_visit_relationships()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.entitlement_id is not null and not exists (
    select 1 from cleaning_entitlements e
    where e.id = new.entitlement_id
      and e.customer_id = new.customer_id
  ) then
    raise exception 'Visit customer must match its entitlement';
  end if;
  if new.route_stop_id is not null and not exists (
    select 1
    from route_stops rs
    join service_addresses a on a.id = rs.service_address_id
    join routes r on r.id = rs.route_id
    where rs.id = new.route_stop_id
      and a.customer_id = new.customer_id
      and r.technician_id is not distinct from new.assigned_technician_id
  ) then
    raise exception 'Visit customer and technician must match its route stop';
  end if;
  return new;
end
$$;

drop policy if exists address_customer_read on public.service_addresses;
create policy address_customer_read on public.service_addresses for select using(
  public.owns_customer(customer_id)
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1
    from service_visits v
    join route_stops rs on rs.id=v.route_stop_id
    where v.assigned_technician_id=auth.uid()
      and rs.service_address_id=service_addresses.id
  ))
);

drop policy if exists bins_owner_read on public.bins;
create policy bins_owner_read on public.bins for select using(
  public.owns_customer(public.customer_for_address(service_address_id))
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1
    from service_visits v
    join route_stops rs on rs.id=v.route_stop_id
    where v.assigned_technician_id=auth.uid()
      and rs.service_address_id=bins.service_address_id
  ))
);

drop policy if exists pickup_owner_staff on public.trash_pickup_schedules;
create policy pickup_owner_staff on public.trash_pickup_schedules for select using(
  public.owns_customer(public.customer_for_address(service_address_id))
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1
    from service_visits v
    join route_stops rs on rs.id=v.route_stop_id
    where v.assigned_technician_id=auth.uid()
      and rs.service_address_id=trash_pickup_schedules.service_address_id
  ))
);
