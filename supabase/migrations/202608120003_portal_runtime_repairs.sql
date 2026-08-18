-- Repair staging portal activity tracking and server-only bin-change writes.
-- Stripe remains disabled; this migration changes no payment behavior.

-- record_my_portal_activity is SECURITY DEFINER. The customer self-update guard
-- must not block a trusted postgres-owned function from stamping activity.
create or replace function public.guard_customer_self_update()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if current_user <> 'postgres'
     and old.user_id = auth.uid()
     and not public.has_role('administrator')
     and not public.has_role('dispatcher')
     and (to_jsonb(new) - 'phone') is distinct from (to_jsonb(old) - 'phone')
  then
    raise exception 'Customers may update only their phone number';
  end if;
  return new;
end
$$;

-- These tables were added after the original API-role grant migration.
-- The portal route performs ownership checks with the authenticated session,
-- then uses the service role for the atomic history/configuration writes.
grant select, insert, update on public.customer_bin_change_requests to service_role;
grant select, insert, update on public.customer_bin_configurations to service_role;
grant select, insert on public.service_visit_configuration_snapshots to service_role;
