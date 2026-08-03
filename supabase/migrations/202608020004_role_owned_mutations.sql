-- Restrict direct PostgREST mutations to role-owned fields and approval boundaries.

create or replace function public.guard_customer_self_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.user_id = auth.uid()
     and not public.has_role('administrator')
     and not public.has_role('dispatcher')
     and (to_jsonb(new) - 'phone') is distinct from (to_jsonb(old) - 'phone')
  then
    raise exception 'Customers may update only their phone number';
  end if;
  return new;
end
$$;

create trigger restrict_customer_self_update
before update on public.customers
for each row execute function public.guard_customer_self_update();

create or replace function public.guard_technician_visit_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.assigned_technician_id = auth.uid()
     and not public.has_role('administrator')
     and not public.has_role('dispatcher')
     and (to_jsonb(new) - array['status','cleaning_confirmed','bins_returned','completed_at'])
         is distinct from
         (to_jsonb(old) - array['status','cleaning_confirmed','bins_returned','completed_at'])
  then
    raise exception 'Technicians may update only visit progress fields';
  end if;
  return new;
end
$$;

create trigger restrict_technician_visit_update
before update on public.service_visits
for each row execute function public.guard_technician_visit_update();

drop policy if exists exceptions_staff_manage on public.service_exceptions;

create policy exceptions_tech_insert
on public.service_exceptions
for insert
with check (
  public.visit_is_assigned(service_visit_id)
  and recorded_by = auth.uid()
  and authorized_return_exception = false
  and status = 'open'
);

create policy exceptions_admin_dispatch_manage
on public.service_exceptions
for all
using (public.has_role('administrator') or public.has_role('dispatcher'))
with check (public.has_role('administrator') or public.has_role('dispatcher'));
