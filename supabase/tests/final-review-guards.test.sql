begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

update service_visits
set status='completed',completed_at=now()
where id='80000000-0000-4000-8000-000000000001';
set constraints enforce_visit_completion immediate;

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
