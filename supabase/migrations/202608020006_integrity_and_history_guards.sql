-- Close remaining authorization, history, and cross-record consistency gaps.

-- Model one explicit current service address while preserving address history.
alter table public.service_addresses add column is_current boolean;
with ranked as (
  select id, row_number() over (partition by customer_id order by created_at desc, id desc) as position
  from public.service_addresses
)
update public.service_addresses a
set is_current = (ranked.position = 1)
from ranked
where ranked.id = a.id;
alter table public.service_addresses alter column is_current set default true;
alter table public.service_addresses alter column is_current set not null;
create unique index service_addresses_one_current_per_customer
  on public.service_addresses(customer_id)
  where is_current;

-- The application has one effective staff role at a time; revoked history is retained.
create unique index staff_roles_one_active_role_per_user
  on public.staff_roles(user_id)
  where revoked_at is null;

-- Self-service profile and bin edits are limited to fields owned by the portal.
create or replace function public.guard_profile_self_update()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.id = auth.uid()
     and not public.has_role('administrator')
     and not public.has_role('dispatcher')
     and (to_jsonb(new) - array['display_name','phone'])
         is distinct from
         (to_jsonb(old) - array['display_name','phone'])
  then
    raise exception 'Customers may update only their display name and phone';
  end if;
  return new;
end
$$;
create trigger restrict_profile_self_update
before update on public.user_profiles
for each row execute function public.guard_profile_self_update();

create or replace function public.guard_customer_bin_update()
returns trigger language plpgsql set search_path=public as $$
begin
  if public.owns_customer(public.customer_for_address(old.service_address_id))
     and not public.has_role('administrator')
     and not public.has_role('dispatcher')
     and (to_jsonb(new) - 'dirty_this_visit')
         is distinct from
         (to_jsonb(old) - 'dirty_this_visit')
  then
    raise exception 'Customers may update only the dirty-this-visit flag';
  end if;
  return new;
end
$$;
create trigger restrict_customer_bin_update
before update on public.bins
for each row execute function public.guard_customer_bin_update();

-- Published catalog-version rows and completed visits are immutable history.
create or replace function public.prevent_catalog_version_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Service plan versions are immutable; insert a new version';
end
$$;
create trigger service_plan_versions_are_immutable
before update or delete on public.service_plan_versions
for each row execute function public.prevent_catalog_version_mutation();

create or replace function public.preserve_completed_visit()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'completed' then
      raise exception 'Completed visits are immutable';
    end if;
    return old;
  end if;
  if old.status = 'completed' and new.status <> 'completed' then
    raise exception 'Completed visits cannot return to an earlier status';
  end if;
  return new;
end
$$;
create trigger preserve_completed_visit_history
before update or delete on public.service_visits
for each row execute function public.preserve_completed_visit();

-- Every cross-record relationship must belong to the same customer.
create or replace function public.validate_paid_cycle_customer()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.subscription_id is not null and not exists (
    select 1 from subscriptions s
    where s.id = new.subscription_id
      and s.customer_id = new.customer_id
      and s.service_plan_version_id = new.service_plan_version_id
  ) then
    raise exception 'Paid cycle customer and plan must match its subscription';
  end if;
  return new;
end
$$;
create trigger paid_cycle_customer_consistency
before insert or update on public.paid_service_cycles
for each row execute function public.validate_paid_cycle_customer();

create or replace function public.validate_entitlement_customer()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists (
    select 1 from paid_service_cycles c
    where c.id = new.paid_service_cycle_id
      and c.customer_id = new.customer_id
  ) then
    raise exception 'Entitlement customer must match its paid service cycle';
  end if;
  return new;
end
$$;
create trigger entitlement_customer_consistency
before insert or update on public.cleaning_entitlements
for each row execute function public.validate_entitlement_customer();

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
    where rs.id = new.route_stop_id
      and a.customer_id = new.customer_id
  ) then
    raise exception 'Visit customer must match its route stop address';
  end if;
  return new;
end
$$;
create trigger visit_relationship_consistency
before insert or update on public.service_visits
for each row execute function public.validate_visit_relationships();

create or replace function public.validate_change_request_address()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.service_address_id is not null and not exists (
    select 1 from service_addresses a
    where a.id = new.service_address_id
      and a.customer_id = new.customer_id
      and a.is_current
  ) then
    raise exception 'Change request address must be the customer current address';
  end if;
  return new;
end
$$;
create trigger change_request_address_consistency
before insert or update on public.customer_change_requests
for each row execute function public.validate_change_request_address();

create or replace function public.validate_referral_code_owner()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists (
    select 1 from referral_codes c
    where c.id = new.referral_code_id
      and c.customer_id = new.referrer_customer_id
  ) then
    raise exception 'Referral code must belong to the referrer';
  end if;
  return new;
end
$$;
create trigger referral_code_owner_consistency
before insert or update on public.referral_relationships
for each row execute function public.validate_referral_code_owner();

-- Assignment-based access also requires an active technician role.
create or replace function public.visit_is_assigned(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.has_role('field_technician') and exists(
    select 1 from service_visits
    where id=target and assigned_technician_id=auth.uid()
  )
$$;

drop policy if exists customer_assigned_tech_read on public.customers;
create policy customer_assigned_tech_read on public.customers for select using(
  public.has_role('field_technician') and exists(
    select 1 from public.service_visits v
    where v.customer_id=customers.id and v.assigned_technician_id=auth.uid()
  )
);

drop policy if exists address_customer_read on public.service_addresses;
create policy address_customer_read on public.service_addresses for select using(
  public.owns_customer(customer_id)
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1 from service_visits v
    where v.assigned_technician_id=auth.uid() and v.customer_id=service_addresses.customer_id
  ))
);

drop policy if exists bins_owner_read on public.bins;
create policy bins_owner_read on public.bins for select using(
  public.owns_customer(public.customer_for_address(service_address_id))
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1 from service_visits v
    join service_addresses a on a.customer_id=v.customer_id
    where a.id=bins.service_address_id and v.assigned_technician_id=auth.uid()
  ))
);

drop policy if exists visits_owner_read on public.service_visits;
create policy visits_owner_read on public.service_visits for select using(
  public.owns_customer(customer_id)
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and assigned_technician_id=auth.uid())
);

drop policy if exists visits_tech_update on public.service_visits;
create policy visits_tech_update on public.service_visits for update using(
  public.has_role('field_technician') and assigned_technician_id=auth.uid()
) with check(
  public.has_role('field_technician') and assigned_technician_id=auth.uid()
);

drop policy if exists route_tech_read on public.routes;
create policy route_tech_read on public.routes for select using(
  public.has_role('field_technician') and technician_id=auth.uid()
);

drop policy if exists stops_tech_read on public.route_stops;
create policy stops_tech_read on public.route_stops for select using(
  public.has_role('field_technician') and exists(
    select 1 from routes r where r.id=route_id and r.technician_id=auth.uid()
  )
);

drop policy if exists pickup_owner_staff on public.trash_pickup_schedules;
create policy pickup_owner_staff on public.trash_pickup_schedules for select using(
  public.owns_customer(public.customer_for_address(service_address_id))
  or public.has_role('administrator')
  or public.has_role('dispatcher')
  or (public.has_role('field_technician') and exists(
    select 1 from service_visits v
    where v.customer_id=public.customer_for_address(service_address_id)
      and v.assigned_technician_id=auth.uid()
  ))
);
