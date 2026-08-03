-- Close the final entitlement, referral, catalog, and login-audit gaps.

create or replace function public.stamp_visit_completion()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end
$$;

drop trigger if exists stamp_visit_completion on public.service_visits;
create trigger stamp_visit_completion
before insert or update of status on public.service_visits
for each row execute function public.stamp_visit_completion();

create or replace function public.validate_visit_completion()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare entitlement_state public.entitlement_status;
begin
  if new.status = 'completed' then
    if new.entitlement_id is null then
      raise exception 'Completed visits require a paid-service entitlement';
    end if;

    select status into entitlement_state
    from public.cleaning_entitlements
    where id = new.entitlement_id
      and customer_id = new.customer_id
    for update;

    if entitlement_state is null or entitlement_state not in ('due','scheduled') then
      raise exception 'Completed visits require an eligible entitlement';
    end if;

    if not new.cleaning_confirmed
       or not exists(select 1 from public.visit_photographs p where p.service_visit_id=new.id and p.kind='before')
       or not exists(select 1 from public.visit_photographs p where p.service_visit_id=new.id and p.kind='after')
       or (not new.bins_returned and not exists(
         select 1 from public.service_exceptions e
         where e.service_visit_id=new.id
           and e.authorized_return_exception
           and e.status='authorized'
       ))
    then
      raise exception 'Completion requires before/after photos, cleaning, and bin return or authorized exception';
    end if;

    update public.cleaning_entitlements
    set status='completed', completed_at=new.completed_at
    where id=new.entitlement_id;
  end if;
  return new;
end
$$;

create or replace function public.enforce_referral_credit_owner()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  relationship_record public.referral_relationships%rowtype;
begin
  select * into relationship_record
  from public.referral_relationships relationship
  where relationship.id = new.referral_relationship_id;

  if relationship_record.id is null
     or relationship_record.referrer_customer_id <> new.customer_id
  then
    raise exception 'Referral credit customer must match the relationship referrer';
  end if;

  if relationship_record.status not in ('qualified','credit_issued','credit_applied') then
    raise exception 'Referral credit requires a qualified relationship';
  end if;

  if relationship_record.hold_until is null
     or relationship_record.hold_until > now()
     or not exists (
       select 1
       from public.customers referred
       join public.cleaning_entitlements entitlement
         on entitlement.customer_id = referred.id
        and entitlement.status = 'completed'
       join public.paid_service_cycles cycle
         on cycle.id = entitlement.paid_service_cycle_id
        and cycle.customer_id = referred.id
        and cycle.payment_status = 'test_paid'
       join public.service_plan_versions version
         on version.id = cycle.service_plan_version_id
       join public.service_plans plan
         on plan.id = version.plan_id
        and plan.referral_eligible
       join public.service_visits visit
         on visit.entitlement_id = entitlement.id
        and visit.customer_id = referred.id
        and visit.status = 'completed'
        and visit.completed_at is not null
       where referred.id = relationship_record.referred_customer_id
         and referred.is_residential
     )
  then
    raise exception 'Referral credit requires an eligible completed paid monthly service after the hold';
  end if;

  return new;
end
$$;

drop trigger if exists service_plans_are_immutable on public.service_plans;
create trigger service_plans_are_immutable
before update or delete on public.service_plans
for each row execute function public.prevent_catalog_plan_mutation();

drop trigger if exists service_plan_versions_are_immutable on public.service_plan_versions;
create trigger service_plan_versions_are_immutable
before update or delete on public.service_plan_versions
for each row execute function public.prevent_catalog_version_mutation();

-- Seed/generator migrations run as the database owner. Authenticated runtime
-- administrators retain read access but have no INSERT policy for catalog rows.
drop policy if exists catalog_admin_manage on public.service_plans;
drop policy if exists catalog_versions_admin_manage on public.service_plan_versions;

create trigger audit_user_profiles
after insert or update or delete on public.user_profiles
for each row execute function public.audit_protected_mutation();
