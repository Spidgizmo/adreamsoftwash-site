-- Close final evidence, catalog, history, and customer-address integrity gaps.

create or replace function public.freeze_completed_visit_evidence()
returns trigger language plpgsql set search_path=public as $$
begin
  if (tg_op in ('UPDATE','DELETE') and exists(
        select 1 from service_visits v
        where v.id=old.service_visit_id and v.status='completed'
      ))
     or (tg_op in ('INSERT','UPDATE') and exists(
        select 1 from service_visits v
        where v.id=new.service_visit_id and v.status='completed'
      ))
  then
    raise exception 'Evidence for completed visits is immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;

create or replace function public.freeze_completed_visit_exception()
returns trigger language plpgsql set search_path=public as $$
begin
  if (tg_op in ('UPDATE','DELETE') and exists(
        select 1 from service_visits v
        where v.id=old.service_visit_id and v.status='completed'
      ))
     or (tg_op in ('INSERT','UPDATE') and exists(
        select 1 from service_visits v
        where v.id=new.service_visit_id and v.status='completed'
      ))
  then
    raise exception 'Exceptions for completed visits are immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;

create or replace function public.prevent_catalog_plan_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Service plans are canonical and immutable at runtime';
end
$$;
create trigger service_plans_are_immutable
before update or delete on public.service_plans
for each row execute function public.prevent_catalog_plan_mutation();

drop policy if exists visit_history_staff_insert on public.visit_status_history;

create or replace function public.record_visit_status_transition()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.status is distinct from old.status then
    insert into visit_status_history(
      service_visit_id,from_status,to_status,actor_id
    ) values(
      new.id,old.status,new.status,auth.uid()
    );
  end if;
  return new;
end
$$;
create trigger record_visit_status_change
after update of status on public.service_visits
for each row execute function public.record_visit_status_transition();

create or replace function public.require_customer_current_address()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from customers c where c.id=new.id)
     and (select count(*) from service_addresses a where a.customer_id=new.id and a.is_current) <> 1
  then
    raise exception 'Customer must have exactly one current service address';
  end if;
  return new;
end
$$;
create constraint trigger customer_requires_current_address
after insert or update of user_id on public.customers
deferrable initially deferred
for each row execute function public.require_customer_current_address();
