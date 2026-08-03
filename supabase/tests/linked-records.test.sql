begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select throws_like(
  $$update route_stops
    set service_address_id='30000000-0000-4000-8000-000000000002'
    where id='70000000-0000-4000-8000-000000000001'$$,
  '%Linked route stop relationships are immutable%',
  'linked route stops cannot move to another customer address'
);

select throws_like(
  $$update routes
    set technician_id='00000000-0000-4000-8000-000000000013'
    where id='60000000-0000-4000-8000-000000000001'$$,
  '%Technician on a route with linked visits is immutable%',
  'routes with linked visits cannot change technicians'
);

update service_visits
set status='completed',completed_at=now()
where id='80000000-0000-4000-8000-000000000001';
set constraints enforce_visit_completion immediate;

select throws_like(
  $$delete from visit_photographs
    where service_visit_id='80000000-0000-4000-8000-000000000001'
      and kind='before'$$,
  '%Evidence for completed visits is immutable%',
  'completed visit photographs cannot be deleted'
);

select throws_like(
  $$update service_addresses
    set is_current=false
    where id='30000000-0000-4000-8000-000000000001';
    set constraints service_addresses_require_current immediate$$,
  '%Customer must have exactly one current service address%',
  'customers retain exactly one current address'
);

select * from finish();
rollback;
