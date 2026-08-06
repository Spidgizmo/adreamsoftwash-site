begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table(
  'public',
  'signup_leads',
  'Step 4 stores incomplete, abandoned, and submitted unpaid signups'
);
select has_table(
  'public',
  'signup_lead_status_history',
  'signup status transitions are retained for CRM review'
);
select has_function(
  'public',
  'save_fictional_signup_lead',
  array['jsonb','uuid','text','text'],
  'anonymous staging signup writes use a protected RPC'
);
select has_column(
  'public',
  'signup_leads',
  'edit_token_hash',
  'only a hash of the browser edit token is stored'
);

create temporary table step4_created as
select public.save_fictional_signup_lead(
  '{
    "fictionalDataConfirmed":true,
    "fullName":"Avery Fictional",
    "email":"avery.signup@example.test",
    "phone":"+1 (555) 010-0123",
    "line1":"123 Fictional Avenue",
    "city":"Toledo",
    "region":"OH",
    "postalCode":"43604",
    "binStreams":{"trash":1,"recycling":0,"other":0},
    "sourcePath":"/bin-cleaning/signup",
    "estimate":{"discountCents":0,"discountKind":"none","discountStatus":"none"}
  }'::jsonb
) as result;

select is(
  (select result->>'status' from step4_created),
  'incomplete',
  'an incomplete fictional signup is saved'
);
select ok(
  length((select result->>'editToken' from step4_created)) >= 32,
  'the browser receives a strong opaque edit token'
);
select is(
  (select count(*)::integer from public.signup_leads),
  1,
  'the protected RPC created exactly one CRM signup lead'
);
select is(
  (select count(*)::integer from public.signup_lead_status_history),
  1,
  'initial signup status is recorded in history'
);

select throws_like(
  format(
    $$select public.save_fictional_signup_lead(
      '{"fictionalDataConfirmed":true}'::jsonb,
      %L::uuid,
      '00000000000000000000000000000000',
      'abandoned'
    )$$,
    (select result->>'id' from step4_created)
  ),
  '%Signup lead or edit token is not valid%',
  'a guessed lead id cannot be edited without the opaque token'
);

select throws_like(
  $$select public.save_fictional_signup_lead(
    '{
      "fictionalDataConfirmed":true,
      "planId":"monthly",
      "promoCode":"NEW25",
      "referralCode":"ADS-ABCD-2345",
      "binStreams":{"trash":1,"recycling":0,"other":0}
    }'::jsonb
  )$$,
  '%Promo and referral discounts cannot be combined%',
  'promo and referral stacking is blocked in the database'
);

select throws_like(
  $$select public.save_fictional_signup_lead(
    '{
      "fictionalDataConfirmed":true,
      "email":"real@example.com",
      "binStreams":{"trash":0,"recycling":0,"other":0}
    }'::jsonb
  )$$,
  '%Staging email must end in .test%',
  'real-looking email addresses are rejected from staging storage'
);

select throws_like(
  $$select public.save_fictional_signup_lead(
    '{
      "fictionalDataConfirmed":true,
      "fullName":"Recycling Test",
      "email":"recycling@example.test",
      "phone":"+1 555 010 0124",
      "line1":"124 Fictional Avenue",
      "city":"Toledo",
      "region":"OH",
      "postalCode":"43604",
      "planId":"monthly",
      "binStreams":{"trash":1,"recycling":1,"other":0},
      "trashWeekday":1,
      "recyclingWeekday":1,
      "recyclingFrequencyWeeks":2,
      "preferredReturnLocation":"Side gate",
      "termsAccepted":true,
      "estimate":{"subtotalCents":2500,"discountCents":0,"firstChargeCents":2500,"discountKind":"none","discountStatus":"none"}
    }'::jsonb,
    null,
    null,
    'submitted_unpaid'
  )$$,
  '%Recycling bins require weekday, frequency, and anchor date%',
  'every-other-week recycling cannot submit without an anchor date'
);

select lives_ok(
  format(
    $$select public.save_fictional_signup_lead(
      '{
        "fictionalDataConfirmed":true,
        "fullName":"Avery Fictional",
        "email":"avery.signup@example.test",
        "phone":"+1 (555) 010-0123",
        "line1":"123 Fictional Avenue",
        "city":"Toledo",
        "region":"OH",
        "postalCode":"43604",
        "planId":"monthly",
        "binStreams":{"trash":1,"recycling":1,"other":0},
        "trashWeekday":1,
        "recyclingWeekday":1,
        "recyclingFrequencyWeeks":2,
        "recyclingAnchorCollectionDate":"2026-08-03",
        "preferredReturnLocation":"Inside the side gate",
        "accessInstructions":"Gate is unlocked in this fictional test.",
        "animalWarning":"Fictional dog remains indoors.",
        "emailAllowed":true,
        "smsAllowed":true,
        "termsAccepted":true,
        "sourcePath":"/bin-cleaning/signup",
        "estimate":{"subtotalCents":2500,"discountCents":0,"firstChargeCents":2500,"discountKind":"none","discountStatus":"none"}
      }'::jsonb,
      %L::uuid,
      %L,
      'submitted_unpaid'
    )$$,
    (select result->>'id' from step4_created),
    (select result->>'editToken' from step4_created)
  ),
  'a complete fictional signup is stored as submitted but unpaid'
);

select is(
  (select status from public.signup_leads limit 1),
  'submitted_unpaid',
  'Step 4 stops at submitted unpaid status'
);
select ok(
  (select submitted_at is not null from public.signup_leads limit 1),
  'submitted unpaid signup records its submission time'
);
select is(
  (select count(*)::integer from public.signup_lead_status_history),
  2,
  'the incomplete to submitted unpaid transition is auditable'
);

select * from finish();
rollback;
