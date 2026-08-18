-- Final evidence and attribution immutability corrections.

create or replace function public.freeze_completed_visit_exception()
returns trigger language plpgsql set search_path=public as $$
declare
  target_visit uuid;
begin
  target_visit := case when tg_op='DELETE' then old.service_visit_id else new.service_visit_id end;
  if exists(
    select 1 from service_visits v
    where v.id=target_visit and v.status='completed'
  ) then
    raise exception 'Exceptions for completed visits are immutable';
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;
create trigger preserve_completed_visit_exceptions
before insert or update or delete on public.service_exceptions
for each row execute function public.freeze_completed_visit_exception();

create or replace function public.freeze_referral_attribution()
returns trigger language plpgsql as $$
begin
  if new.referral_code_id is distinct from old.referral_code_id
     or new.referrer_customer_id is distinct from old.referrer_customer_id
     or new.referred_customer_id is distinct from old.referred_customer_id
     or new.referred_address_hash is distinct from old.referred_address_hash
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Referral attribution is immutable';
  end if;
  return new;
end
$$;
create trigger preserve_referral_attribution
before update on public.referral_relationships
for each row execute function public.freeze_referral_attribution();

drop policy if exists change_request_owner_insert on public.customer_change_requests;
create policy change_request_owner_insert
on public.customer_change_requests
for insert
with check(
  public.owns_customer(customer_id)
  and requested_by=auth.uid()
  and status='pending_staff_review'
  and reviewed_by is null
  and reviewed_at is null
  and rejection_reason is null
);
