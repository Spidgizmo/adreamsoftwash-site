-- Close disabled-login, scheduling-audit, and referral-history trust gaps.

create or replace function public.login_is_active()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from user_profiles where id=auth.uid() and login_status='active')
$$;

create or replace function public.has_role(requested public.app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select public.login_is_active() and exists(
    select 1 from staff_roles where user_id=auth.uid() and role=requested and revoked_at is null
  )
$$;

create or replace function public.owns_customer(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.login_is_active() and exists(
    select 1 from customers where id=target and user_id=auth.uid()
  )
$$;

create or replace function public.visit_is_assigned(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.login_is_active() and exists(
    select 1 from service_visits where id=target and assigned_technician_id=auth.uid()
  )
$$;

create trigger audit_trash_pickup_schedules
after insert or update or delete on public.trash_pickup_schedules
for each row execute function public.audit_protected_mutation();

create trigger audit_cleaning_day_assignments
after insert or update or delete on public.cleaning_day_assignments
for each row execute function public.audit_protected_mutation();

drop policy if exists referral_history_admin on public.referral_status_history;

create or replace function public.record_referral_status_transition()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    insert into referral_status_history(
      referral_relationship_id,from_status,to_status,actor_id,reason
    ) values(new.id,old.status,new.status,auth.uid(),new.rejection_reason);
  end if;
  return new;
end
$$;

create trigger record_referral_status_change
after update of status on public.referral_relationships
for each row execute function public.record_referral_status_transition();
