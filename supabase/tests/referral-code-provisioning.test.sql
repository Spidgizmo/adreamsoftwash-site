begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000010',true);
select set_config('request.jwt.claim.role','authenticated',true);

insert into public.customers(
  id,full_name,email,account_status,is_test
) values (
  '23000000-0000-4000-8000-000000000001',
  'Automatic Referral One — FICTIONAL',
  'automatic-one@example.test',
  'test_pending',
  false
);

select ok(
  exists(
    select 1 from public.referral_codes
    where customer_id='23000000-0000-4000-8000-000000000001'
  ),
  'a real customer receives a referral code when the account is created'
);

select ok(
  (select code ~ '^ADS-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'
   from public.referral_codes
   where customer_id='23000000-0000-4000-8000-000000000001'),
  'new referral codes use the readable ADS-XXXX-XXXX format'
);

select is(
  (select count(*)::integer from public.referral_codes
   where customer_id='23000000-0000-4000-8000-000000000001'),
  1,
  'each customer has exactly one permanent referral code'
);

insert into public.customers(
  id,full_name,email,account_status,is_test
) values (
  '23000000-0000-4000-8000-000000000002',
  'Automatic Referral Two — FICTIONAL',
  'automatic-two@example.test',
  'test_pending',
  false
);

select isnt(
  (select code from public.referral_codes
   where customer_id='23000000-0000-4000-8000-000000000001'),
  (select code from public.referral_codes
   where customer_id='23000000-0000-4000-8000-000000000002'),
  'different customers receive different referral codes'
);

reset role;
set local role service_role;

select lives_ok(
  $$select * from public.ensure_customer_referral_code('20000000-0000-4000-8000-000000000002')$$,
  'the trusted signup service can provision a missing code idempotently'
);

select is(
  (select count(*)::integer from public.referral_codes
   where customer_id='20000000-0000-4000-8000-000000000002'),
  1,
  'trusted provisioning creates only one code'
);

select is(
  (select code from public.ensure_customer_referral_code('20000000-0000-4000-8000-000000000002')),
  (select code from public.referral_codes
   where customer_id='20000000-0000-4000-8000-000000000002'),
  'repeated provisioning returns the same permanent code'
);

select * from finish();
rollback;
