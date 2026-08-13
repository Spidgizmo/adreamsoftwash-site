import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const validatorPath = new URL(
  "../src/lib/bin-cleaning/signup.ts",
  import.meta.url,
);
const apiPath = new URL(
  "../src/app/api/bin-cleaning/signup-draft/route.ts",
  import.meta.url,
);
const checkoutPath = new URL(
  "../src/app/api/bin-cleaning/checkout/route.ts",
  import.meta.url,
);
const migrationPath = new URL(
  "../supabase/migrations/202608060001_fictional_signup_intake.sql",
  import.meta.url,
);
const serverOnlyMigrationPath = new URL(
  "../supabase/migrations/202608060045_server_only_signup_rpc.sql",
  import.meta.url,
);

test("Step 4 validation covers signup data, schedules, and discount exclusivity", async () => {
  const source = await readFile(validatorPath, "utf8");

  assert.match(source, /submitted_unpaid/);
  assert.doesNotMatch(source, /fictional email addresses ending in \.test/);
  assert.doesNotMatch(source, /reserved fictional 555 phone numbers/);
  assert.match(source, /promo code and referral code cannot be combined/i);
  assert.match(source, /Recycling frequency/);
  assert.match(source, /anchor the recycling cycle/);
  assert.match(source, /preferredReturnLocation/);
  assert.match(source, /animalWarning/);
  assert.match(source, /gateInformation/);
  assert.match(source, /safetyNotes/);
});

test("signup API saves through the server-only RPC boundary and validates real referral records", async () => {
  const source = await readFile(apiPath, "utf8");

  assert.match(source, /save_fictional_signup_lead/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(source, /STRIPE_SECRET_KEY/);
  assert.match(source, /referral_codes\?select=id/);
  assert.match(source, /active=eq\.true/);
  assert.match(source, /Referral code is not recognized or is inactive\./);
  assert.match(source, /referralValidated/);
  assert.match(source, /STRIPE_INTEGRATION_MODE === "test"/);
  assert.match(source, /checkoutStarted: false/);
  assert.match(source, /amountCollectedCents: 0/);
  assert.match(source, /isStagingEnvironment/);
});

test("Stripe checkout accepts only the submitted signup identity and recomputes price server-side", async () => {
  const source = await readFile(checkoutPath, "utf8");

  assert.match(source, /prepare_stripe_test_checkout/);
  assert.match(source, /calculateBinCleaningPrice/);
  assert.match(source, /evaluateBinCleaningPromotion/);
  assert.match(source, /stripeTestConfig/);
  assert.match(source, /checkoutMode = plan\.chargeType === "recurring" \? "subscription" : "payment"/);
  assert.match(source, /Idempotency|idempotencyKey/i);
  assert.doesNotMatch(source, /input\.amount/);
  assert.doesNotMatch(source, /input\.subtotal/);
  assert.doesNotMatch(source, /input\.planId/);
  assert.doesNotMatch(source, /input\.binCount/);
});

test("database intake uses opaque token hashes, RLS, staff-only CRM reads, and server-only writes", async () => {
  const source = await readFile(migrationPath, "utf8");
  const serverOnlySource = await readFile(serverOnlyMigrationPath, "utf8");

  assert.match(source, /edit_token_hash text not null/);
  assert.match(source, /digest\(v_token,'sha256'\)/);
  assert.match(source, /enable row level security/);
  assert.match(source, /signup_leads_staff_read/);
  assert.match(source, /Promo and referral discounts cannot be combined/);
  assert.match(source, /submitted_unpaid/);
  assert.match(serverOnlySource, /from anon, authenticated/);
  assert.match(serverOnlySource, /to service_role/);
  assert.doesNotMatch(source, /stripe_customer_id/i);
  assert.doesNotMatch(source, /payment_intent/i);
});
