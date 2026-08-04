-- Provision one permanent, readable referral code for each real customer account.
-- Test seed customers remain explicit so fictional fixtures stay deterministic.

create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path=public
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  random_bytes bytea := extensions.gen_random_bytes(8);
  token text := '';
begin
  for byte_index in 0..7 loop
    token := token || substr(
      alphabet,
      (get_byte(random_bytes,byte_index) % length(alphabet)) + 1,
      1
    );
  end loop;

  return 'ADS-' || substr(token,1,4) || '-' || substr(token,5,4);
end
$$;

revoke all on function public.generate_referral_code() from public, anon, authenticated;
grant execute on function public.generate_referral_code() to service_role;

alter table public.referral_codes
  alter column code set default public.generate_referral_code();

create or replace function public.ensure_customer_referral_code(
  target_customer_id uuid
)
returns table(code text, share_url text)
language plpgsql
security definer
set search_path=public
as $$
declare
  existing_code text;
  existing_share_url text;
begin
  if not exists(
    select 1 from public.customers customer
    where customer.id=target_customer_id
  ) then
    raise exception 'Customer does not exist';
  end if;

  loop
    select referral.code, referral.share_url
    into existing_code, existing_share_url
    from public.referral_codes referral
    where referral.customer_id=target_customer_id;

    if existing_code is not null then
      return query select existing_code, existing_share_url;
      return;
    end if;

    begin
      insert into public.referral_codes(customer_id)
      values(target_customer_id)
      returning referral_codes.code, referral_codes.share_url
      into existing_code, existing_share_url;

      return query select existing_code, existing_share_url;
      return;
    exception
      when unique_violation then
        -- A code collision retries; a concurrent insert for this customer
        -- returns the already-created permanent code on the next loop.
        null;
    end;
  end loop;
end
$$;

revoke all on function public.ensure_customer_referral_code(uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_customer_referral_code(uuid)
  to service_role;

create or replace function public.provision_customer_referral_code()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if not new.is_test then
    perform public.ensure_customer_referral_code(new.id);
  end if;
  return new;
end
$$;

revoke all on function public.provision_customer_referral_code()
  from public, anon, authenticated;

drop trigger if exists provision_customer_referral_code
  on public.customers;
create trigger provision_customer_referral_code
after insert on public.customers
for each row execute function public.provision_customer_referral_code();

-- Safe idempotent backfill for any real customers created before this migration.
do $$
declare
  customer_record record;
begin
  for customer_record in
    select id from public.customers where not is_test
  loop
    perform public.ensure_customer_referral_code(customer_record.id);
  end loop;
end
$$;
