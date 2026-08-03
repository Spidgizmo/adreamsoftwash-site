-- Relationship validation must see protected linked rows for authorized visit updates.
create or replace function public.validate_visit_relationships()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
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
