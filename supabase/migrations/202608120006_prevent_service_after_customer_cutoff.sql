create or replace function public.prevent_service_after_customer_cutoff()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cutoff date;
begin
  select c.service_through_date
    into cutoff
  from public.customers c
  where c.id = new.customer_id;

  if cutoff is not null
     and new.status <> 'canceled'::public.visit_status
     and new.scheduled_for::date > cutoff then
    raise exception 'Service visit cannot be scheduled after customer service-through date %', cutoff;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_service_after_customer_cutoff on public.service_visits;
create trigger trg_prevent_service_after_customer_cutoff
before insert or update of customer_id, scheduled_for, status on public.service_visits
for each row execute function public.prevent_service_after_customer_cutoff();
