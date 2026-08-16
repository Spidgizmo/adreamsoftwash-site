import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = new URL(
  "../supabase/migrations/202608160006_stripe_referral_reward_application.sql",
  import.meta.url,
);
const helperPath = new URL(
  "../src/lib/bin-cleaning/stripe-referral-rewards.ts",
  import.meta.url,
);
const webhookPath = new URL(
  "../src/app/api/stripe/bin-cleaning/webhook/route.ts",
  import.meta.url,
);
const stripeServerPath = new URL("../src/lib/stripe/server.ts", import.meta.url);
const processorPath = new URL(
  "../src/app/api/bin-cleaning/referrals/process/route.ts",
  import.meta.url,
);

test("referral credits track the Stripe coupon, subscription, and paid invoice", async () => {
  const migration = await readFile(migrationPath, "utf8");
  assert.match(migration, /stripe_coupon_id text/);
  assert.match(migration, /stripe_subscription_id text/);
  assert.match(migration, /stripe_armed_at timestamptz/);
  assert.match(migration, /stripe_applied_invoice_id text/);
  assert.match(migration, /stripe_referral_rewards_to_arm/);
  assert.match(migration, /mark_stripe_referral_reward_armed/);
  assert.match(migration, /apply_stripe_referral_reward_invoice/);
  assert.match(migration, /status='applied'/);
  assert.match(migration, /remaining_cents=0/);
  assert.match(migration, /status='credit_applied'/);
});

test("matured rewards become deterministic one-time Stripe subscription discounts", async () => {
  const [helper, processor] = await Promise.all([
    readFile(helperPath, "utf8"),
    readFile(processorPath, "utf8"),
  ]);
  assert.match(helper, /duration:\s*"once"/);
  assert.match(helper, /amount_off:\s*reward\.amount_cents/);
  assert.match(helper, /currency:\s*"usd"/);
  assert.match(helper, /discounts\[0\]\[coupon\]/);
  assert.match(helper, /metadata\[ads_referral_credit_id\]/);
  assert.match(helper, /ads-referral-credit:\$\{reward\.credit_id\}:coupon/);
  assert.match(helper, /ads-referral-credit:\$\{reward\.credit_id\}:subscription/);
  assert.match(processor, /armAvailableStripeReferralRewards\(50\)/);
});

test("paid renewal verifies and consumes exactly the armed referral reward", async () => {
  const webhook = await readFile(webhookPath, "utf8");
  assert.match(webhook, /invoiceReferralCreditId/);
  assert.match(webhook, /ads_referral_credit_id/);
  assert.match(webhook, /trustedReferralCredit/);
  assert.match(webhook, /expectedCents = Math\.max\(0, expectedCents - Math\.min\(credit\.remaining_cents, expectedCents\)\)/);
  assert.match(webhook, /apply_stripe_referral_reward_invoice/);
  assert.match(webhook, /clearStripeReferralRewardState/);
  assert.match(webhook, /armAvailableStripeReferralRewards\(20\)/);
});

test("Stripe form encoding can send empty strings so consumed discounts and metadata can be cleared", async () => {
  const [server, helper] = await Promise.all([
    readFile(stripeServerPath, "utf8"),
    readFile(helperPath, "utf8"),
  ]);
  assert.match(server, /value === undefined \|\| value === null/);
  assert.doesNotMatch(server, /value === ""/);
  assert.match(helper, /discounts:\s*""/);
  assert.match(helper, /metadata\[ads_referral_credit_id\]\]:\s*""/);
});
