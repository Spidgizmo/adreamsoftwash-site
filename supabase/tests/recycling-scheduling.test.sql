begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_column(
  'public',
  'bins',
  'collection_stream',
  'bins identify trash, recycling, or other collection streams'
);

select has_column(
  'public',
  'subscriptions',
  'service_alignment',
  'subscriptions record which collection schedule controls service'
);

select has_table(
  'public',
  'recycling_pickup_schedules',
  'recycling schedules are stored separately from weekly trash pickup'
);

insert into public.recycling_pickup_schedules(
  service_address_id,
  weekday,
  frequency_weeks,
  anchor_collection_date,
  source,
  verification_status,
  effective_from
) values (
  '30000000-0000-4000-8000-000000000001',
  1,
  2,
  '2026-08-03',
  'customer_confirmed',
  'customer_confirmed',
  '2026-08-03'
);

select is(
  (
    select frequency_weeks
    from public.recycling_pickup_schedules
    where service_address_id='30000000-0000-4000-8000-000000000001'
      and is_current
  ),
  2::smallint,
  'an every-other-week recycling cadence is retained'
);

select throws_like(
  $$insert into public.recycling_pickup_schedules(
      service_address_id,weekday,frequency_weeks,anchor_collection_date,effective_from
    ) values (
      '30000000-0000-4000-8000-000000000002',
      1,
      2,
      '2026-08-04',
      '2026-08-04'
    )$$,
  '%anchor date must fall on the selected recycling weekday%',
  'the alternating-week anchor must match the selected weekday'
);

select lives_ok(
  $$insert into public.customer_change_requests(
      customer_id,
      service_address_id,
      request_type,
      requested_value,
      requested_by
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      'recycling_schedule',
      '{"weekday":1,"frequency_weeks":2,"next_collection_date":"2026-08-17"}',
      '00000000-0000-4000-8000-000000000001'
    )$$,
  'customers can request a recycling schedule correction for staff review'
);

select * from finish();
rollback;
