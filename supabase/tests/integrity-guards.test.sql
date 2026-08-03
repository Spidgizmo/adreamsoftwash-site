begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select throws_like(
  $$insert into service_addresses(customer_id,line1,city,region,postal_code,normalized_address_hash,is_current)
    values('20000000-0000-4000-8000-000000000001','11 New Current Street','Test Township','OH','00000','test-current-duplicate',true)$$,
  '%duplicate key value%',
  'a customer can have only one current service address'
);

select throws_like(
  $$insert into staff_roles(user_id,role,granted_by)
    values('00000000-0000-4000-8000-000000000011','field_technician','00000000-0000-4000-8000-000000000010')$$,
  '%duplicate key value%',
  'a user can have only one active staff role'
);

select throws_like(
  $$update service_plan_versions set base_price_cents=1 where plan_id='monthly'$$,
  '%Service plan versions are immutable%',
  'published catalog versions cannot be rewritten'
);

update service_visits
set status='completed',completed_at=now()
where id='80000000-0000-4000-8000-000000000001';
set constraints enforce_visit_completion immediate;
select throws_like(
  $$update service_visits set status='assigned' where id='80000000-0000-4000-8000-000000000001'$$,
  '%Completed visits are immutable%',
  'completed visits cannot be reopened'
);

select throws_like(
  $$insert into paid_service_cycles(customer_id,subscription_id,service_plan_version_id,cycle_start,idempotency_key)
    values(
      '20000000-0000-4000-8000-000000000002',
      (select id from subscriptions where customer_id='20000000-0000-4000-8000-000000000001'),
      (select id from service_plan_versions where plan_id='monthly'),
      '2026-09-01','mismatched-cycle'
    )$$,
  '%Paid cycle customer and plan must match its subscription%',
  'paid cycles match their subscription customer and plan'
);

select throws_like(
  $$insert into cleaning_entitlements(customer_id,paid_service_cycle_id,idempotency_key)
    values('20000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','mismatched-entitlement')$$,
  '%Entitlement customer must match its paid service cycle%',
  'entitlements match their paid cycle customer'
);

select throws_like(
  $$insert into service_visits(customer_id,entitlement_id)
    values('20000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001')$$,
  '%Visit customer must match its entitlement%',
  'visits match their entitlement customer'
);

select throws_like(
  $$insert into service_visits(customer_id,route_stop_id)
    values('20000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001')$$,
  '%Visit customer and technician must match its route stop%',
  'visits match their route-stop customer'
);

select throws_like(
  $$insert into customer_change_requests(customer_id,service_address_id,request_type,requested_value,requested_by)
    values('20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','return_location','{"value":"wrong"}','00000000-0000-4000-8000-000000000002')$$,
  '%Change request address must be the customer current address%',
  'change requests match the customer current address'
);

select throws_like(
  $$insert into referral_relationships(referral_code_id,referrer_customer_id,referred_customer_id,referred_address_hash)
    values('90000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004','test-hash-4')$$,
  '%Referral code must belong to the referrer%',
  'referral codes match their owning referrer'
);

select throws_like(
  $$update referral_relationships
    set referrer_customer_id='20000000-0000-4000-8000-000000000002'
    where id='91000000-0000-4000-8000-000000000001'$$,
  '%Referral attribution is immutable%',
  'referral attribution cannot be rewritten'
);

select * from finish();
rollback;
