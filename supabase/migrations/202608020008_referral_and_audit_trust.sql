-- Final trust-boundary corrections for referrals and audit history.

create or replace function public.validate_referral_claim()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  ref_address text;
begin
  if new.referrer_customer_id=new.referred_customer_id then
    new.status='rejected';
    new.rejection_reason='self_referral';
    return new;
  end if;

  select normalized_address_hash
  into ref_address
  from service_addresses
  where customer_id=new.referred_customer_id
    and is_current
  limit 1;

  if ref_address is null then
    raise exception 'Referred customer must have a current service address';
  end if;

  if exists(
    select 1 from referral_relationships r
    where r.referred_customer_id=new.referred_customer_id
      and r.status not in ('rejected','reversed')
  ) then
    new.status='rejected';
    new.rejection_reason='duplicate_active_claim';
    return new;
  end if;

  if exists(
    select 1 from referral_relationships r
    where r.referred_address_hash=ref_address
      and r.created_at>now()-interval '12 months'
      and r.status not in ('rejected','reversed')
  ) then
    new.status='rejected';
    new.rejection_reason='address_lookback';
    return new;
  end if;

  new.referred_address_hash=ref_address;
  return new;
end
$$;

drop policy if exists audit_staff_insert on public.audit_events;
