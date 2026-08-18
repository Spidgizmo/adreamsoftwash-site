import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  runStep3SimulatorProbe,
  simulateAddressValidation,
  simulateNotification,
  simulateTaxReview,
} from "../src/lib/bin-cleaning/test-integration-simulators.ts";

const integrationPath = new URL(
  "../src/lib/bin-cleaning/test-integrations.ts",
  import.meta.url,
);
const routePath = new URL(
  "../src/app/api/bin-cleaning/test-integrations/route.ts",
  import.meta.url,
);
const verifierPath = new URL(
  "../scripts/verify-hosted-staging.mjs",
  import.meta.url,
);
const workflowPath = new URL(
  "../.github/workflows/staging-smoke-verification.yml",
  import.meta.url,
);
const envPath = new URL("../.env.example", import.meta.url);

test("protected integration credentials are not named as browser-public values", async () => {
  const env = await readFile(envPath, "utf8");

  assert.match(env, /ADDRESS_VALIDATION_API_KEY=/);
  assert.match(env, /TAX_PROVIDER_API_KEY=/);
  assert.match(env, /TEST_EMAIL_API_KEY=/);
  assert.match(env, /TEST_SMS_API_KEY=/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_ADDRESS_VALIDATION_API_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_TAX_PROVIDER_API_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_TEST_EMAIL_API_KEY/);
  assert.doesNotMatch(env, /NEXT_PUBLIC_TEST_SMS_API_KEY/);
});

test("safe simulators remain required while Stripe test checkout defaults disabled", async () => {
  const [integration, env] = await Promise.all([
    readFile(integrationPath, "utf8"),
    readFile(envPath, "utf8"),
  ]);

  assert.match(integration, /validateStep3IntegrationConfiguration/);
  assert.match(integration, /Step 3 requires ADDRESS_VALIDATION_MODE=simulator/);
  assert.match(integration, /Step 3 requires TAX_CALCULATION_MODE=simulator/);
  assert.match(integration, /Step 3 requires NOTIFICATION_MODE=simulator/);
  assert.match(integration, /STRIPE_INTEGRATION_MODE must be disabled or test/);
  assert.match(env, /STRIPE_INTEGRATION_MODE=disabled/);
  assert.match(env, /Stripe TEST MODE ONLY/);
  assert.match(env, /server refuses sk_live_ credentials/);
  assert.match(env, /STRIPE_TEST_COUPON_NEW25=/);
  assert.match(env, /STRIPE_TEST_COUPON_REFERRAL50=/);
  assert.match(env, /STRIPE_TEST_COUPON_ONE45=/);
});

test("simulators execute with fictional results and no external delivery", () => {
  const address = simulateAddressValidation({
    line1: "123 Fictional Avenue",
    city: "Toledo",
    region: "OH",
    postalCode: "43604",
  });
  const tax = simulateTaxReview();
  const email = simulateNotification({
    channel: "email",
    fictionalRecipient: "simulator@example.test",
    subject: "Fictional test",
    body: "Nothing is delivered.",
  });
  const probe = runStep3SimulatorProbe();

  assert.equal(address.outcome, "eligible-test-address");
  assert.equal(address.provider, "safe-simulator");
  assert.equal(tax.taxCents, null);
  assert.equal(tax.outcome, "staff-review-required");
  assert.equal(email.delivered, false);
  assert.equal(probe.notifications.sms.delivered, false);
  assert.match(probe.notifications.sms.fictionalRecipient, /555/);
  assert.throws(
    () =>
      simulateNotification({
        channel: "email",
        fictionalRecipient: "real@example.com",
        body: "Blocked",
      }),
    /fictional \.test email addresses/,
  );
});

test("staging integration response executes probes and remains redacted", async () => {
  const route = await readFile(routePath, "utf8");

  assert.match(route, /validateStep3IntegrationConfiguration/);
  assert.match(route, /runStep3SimulatorProbe/);
  assert.match(route, /sensitiveValuesReturned: false/);
  assert.match(route, /messagesDelivered: false/);
  assert.match(route, /stripeCheckoutEnabled: false/);
  assert.match(route, /Cache-Control/);
  assert.doesNotMatch(route, /configured:/);
  assert.doesNotMatch(route, /STRIPE_SECRET_KEY/);
  assert.doesNotMatch(route, /ADDRESS_VALIDATION_API_KEY/);
  assert.doesNotMatch(route, /TAX_PROVIDER_API_KEY/);
  assert.doesNotMatch(route, /TEST_EMAIL_API_KEY/);
  assert.doesNotMatch(route, /TEST_SMS_API_KEY/);
});

test("staging workflow verifies the Vercel Preview and supports protected deployments", async () => {
  const [verifier, workflow] = await Promise.all([
    readFile(verifierPath, "utf8"),
    readFile(workflowPath, "utf8"),
  ]);

  assert.match(verifier, /deployments\?sha=/);
  assert.match(verifier, /api\/bin-cleaning\/test-integrations/);
  assert.match(verifier, /VERCEL_AUTOMATION_BYPASS_SECRET/);
  assert.match(verifier, /deployment protection/i);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /deployments: read/);
  assert.match(workflow, /EXPECTED_COMMIT_SHA/);
  assert.match(workflow, /npm test/);
});
