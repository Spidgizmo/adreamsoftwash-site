begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select throws_like(
  $$insert into service_visits(customer_id,status,cleaning_confirmed,bins_returned)
    values('20000000-0000-4000-8000-000000000004','completed',true,true);
    set constraints enforce_visit_completion immediate$$,
  '%Completed visits require a paid-service entitlement%',
  'completed visits require an entitlement'
);

update service_visits
set status='completed',completed_at=now()
where id='80000000-0000-4000-8000-000000000001';
set constraints enforce_visit_completion immediate;

select is(
  (select status::text from cleaning_entitlements where id='b0000000-0000-4000-8000-000000000001'),
  'completed',
  'completing a visit atomically completes its entitlement'
);

select throws_like(
  $$insert into referral_credits(customer_id,referral_relationship_id,amount_cents,remaining_cents,status,earned_at,expires_at)
    values('20000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002',1000,1000,'issued','2026-08-01','2027-08-01')$$,
  '%Referral credit requires a qualified relationship%',
  'credit issuance requires a qualified referral'
);

select throws_like(
  $$set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000010',true);
    insert into service_plans(id,display_name,current_version,status,public_visible,referral_eligible)
    values('unapproved','Unapproved','test','active',true,false);
    reset role$$,
  '%row-level security%',
  'runtime catalog plan inserts are rejected'
);

select throws_like(
  $$set local role authenticated;
    select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000010',true);
    insert into service_plan_versions(plan_id,catalog_version,charge_type,effective_at)
    values('monthly','unapproved','recurring',now());
    reset role$$,
  '%row-level security%',
  'runtime catalog version inserts are rejected'
);

update user_profiles set login_status='disabled' where id='00000000-0000-4000-8000-000000000013';
select ok(
  exists(select 1 from audit_events where entity_table='user_profiles' and entity_id='00000000-0000-4000-8000-000000000013' and action='UPDATE'),
  'login-status changes are audited'
);

select throws_like(
  $$update service_visits
    set entitlement_id='b0000000-0000-4000-8000-000000000002'
    where id='80000000-0000-4000-8000-000000000001'$$,
  '%Completed visits are immutable%',
  'completed visit relationships are frozen'
);

select throws_like(
  $$insert into service_visits(customer_id,route_stop_id,assigned_technician_id)
    values(
      '20000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000013'
    )$$,
  '%Visit customer and technician must match its route stop%',
  'visit technician matches the route technician'
);

select * from finish();
rollback;
