import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { verifyStripeSignature } from "../src/lib/stripe/server.ts";

const serverPath = new URL("../src/lib/stripe/server.ts", import.meta.url);
const checkoutPath = new URL("../src/app/api/bin-cleaning/checkout/route.ts", import.meta.url);
const webhookPath = new URL("../src/app/api/stripe/bin-cleaning/webhook/route.ts", import.meta.url);
const formPath = new URL("../src/components/bin-cleaning/BinCleaningSignupForm.tsx", import.meta.url);
const successPath = new URL("../src/app/bin-cleaning/signup/payment-success/page.tsx", import.meta.url);

function withStripeTestEnv<T>(fn: () => T): T {
  const before = {
    mode: process.env.STRIPE_INTEGRATION_MODE,
    key: process.env.STRIPE_SECRET_KEY,
    webhook: process.env.STRIPE_WEBHOOK_SECRET,
  };
  process.env.STRIPE_INTEGRATION_MODE = "test";
  process.env.STRIPE_SECRET_KEY = "sk_test_unit";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_secret";
  try {
    return fn();
  } finally {
    if (before.mode === undefined) delete process.env.STRIPE_INTEGRATION_MODE; else process.env.STRIPE_INTEGRATION_MODE = before.mode;
    if (before.key === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = before.key;
    if (before.webhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET; else process.env.STRIPE_WEBHOOK_SECRET = before.webhook;
  }
}

test("Stripe webhook signature verification uses raw body HMAC, v1, timing safety, and timestamp tolerance", () => {
  withStripeTestEnv(() => {
    const body = JSON.stringify({ id: "evt_test_unit", livemode: false });
    const timestamp = 1_800_000_000;
    const signature = createHmac("sha256", "whsec_unit_secret")
      .update(`${timestamp}.${body}`, "utf8")
      .digest("hex");

    assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, timestamp), true);
    assert.equal(verifyStripeSignature(`${body}x`, `t=${timestamp},v1=${signature}`, timestamp), false);
    assert.equal(verifyStripeSignature(body, `t=${timestamp - 301},v1=${signature}`, timestamp), false);
    assert.equal(verifyStripeSignature(body, null, timestamp), false);
  });
});

test("Stripe TEST server boundary rejects live keys and never exposes secret credentials", async () => {
  const source = await readFile(serverPath, "utf8");
  assert.match(source, /mode !== "test"/);
  assert.match(source, /startsWith\("sk_test_"\)/);
  assert.match(source, /startsWith\("whsec_"\)/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /SIGNATURE_TOLERANCE_SECONDS = 300/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_STRIPE_SECRET/);
});

test("checkout uses trusted lead identity, canonical pricing, and Stripe idempotency", async () => {
  const source = await readFile(checkoutPath, "utf8");
  assert.match(source, /prepare_stripe_test_checkout/);
  assert.match(source, /calculateBinCleaningPrice/);
  assert.match(source, /evaluateBinCleaningPromotion/);
  assert.match(source, /stripe_checkout_attempts/);
  assert.match(source, /Idempotency|idempotencyKey/i);
  assert.match(source, /subscription_data\[metadata\]/);
  assert.match(source, /payment_intent_data\[metadata\]/);
  assert.match(source, /session\.livemode/);
  assert.doesNotMatch(source, /input\.amount/);
  assert.doesNotMatch(source, /input\.planId/);
  assert.doesNotMatch(source, /input\.binCount/);
});

test("webhook reads raw body before parsing, rejects live events, and claims event ids once", async () => {
  const source = await readFile(webhookPath, "utf8");
  const rawIndex = source.indexOf("await request.text()");
  const parseIndex = source.indexOf("JSON.parse(rawBody)");
  assert.ok(rawIndex >= 0 && parseIndex > rawIndex);
  assert.match(source, /verifyStripeSignature/);
  assert.match(source, /event\.livemode/);
  assert.match(source, /claim_stripe_test_webhook_event/);
  assert.match(source, /duplicate: true/);
  assert.match(source, /invoice\.paid/);
  assert.match(source, /invoice\.payment_failed/);
  assert.match(source, /customer\.subscription\.deleted/);
});

test("referral preview requires authoritative validation and return page does not trust redirect", async () => {
  const [form, success] = await Promise.all([readFile(formPath, "utf8"), readFile(successPath, "utf8")]);
  assert.match(form, /validatedReferralCode/);
  assert.match(form, /normalizedReferral === validatedReferralCode/);
  assert.match(form, /Referral code is not applied until the server verifies it/);
  assert.match(form, /\/api\/bin-cleaning\/checkout/);
  assert.match(success, /does not trust the redirect as proof of payment/);
  assert.match(success, /StripeTestPaymentStatus/);
});
