-- Close the final referral-credit display and integrity gaps.

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
  return new;
end
$$;

create trigger enforce_referral_credit_owner
before insert or update of customer_id, referral_relationship_id on public.referral_credits
for each row execute function public.enforce_referral_credit_owner();

create or replace function public.keep_rejected_referral_terminal()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status = 'rejected' and new.status <> 'rejected' then
    raise exception 'Rejected referral claims are terminal';
  end if;
  return new;
end
$$;

create trigger keep_rejected_referral_terminal
before update of status on public.referral_relationships
for each row execute function public.keep_rejected_referral_terminal();
