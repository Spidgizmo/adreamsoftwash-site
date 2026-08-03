-- Close the final entitlement, referral, catalog, and login-audit gaps.

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
    set status='completed', completed_at=coalesce(new.completed_at,now())
    where id=new.entitlement_id;
  end if;
  return new;
end
$$;

create or replace function public.enforce_referral_credit_owner()
returns trigger language plpgsql set search_path=public as $$
begin
  if not exists (
    select 1 from public.referral_relationships relationship
    where relationship.id = new.referral_relationship_id
      and relationship.referrer_customer_id = new.customer_id
  ) then
    raise exception 'Referral credit customer must match the relationship referrer';
  end if;
  if not exists (
    select 1 from public.referral_relationships relationship
    where relationship.id = new.referral_relationship_id
      and relationship.status in ('qualified','credit_issued','credit_applied')
  ) then
    raise exception 'Referral credit requires a qualified relationship';
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
