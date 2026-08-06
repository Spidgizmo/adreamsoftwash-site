import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const integrationPath = new URL(
  "../src/lib/bin-cleaning/test-integrations.ts",
  import.meta.url,
);
const routePath = new URL(
  "../src/app/api/bin-cleaning/test-integrations/route.ts",
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

test("Step 3 defaults to safe simulators and keeps Stripe disabled until Step 8", async () => {
  const [integration, env] = await Promise.all([
    readFile(integrationPath, "utf8"),
    readFile(envPath, "utf8"),
  ]);

  assert.match(integration, /ADDRESS_VALIDATION_MODE[\s\S]*"simulator"/);
  assert.match(integration, /TAX_CALCULATION_MODE[\s\S]*"simulator"/);
  assert.match(integration, /NOTIFICATION_MODE[\s\S]*"simulator"/);
  assert.match(env, /STRIPE_INTEGRATION_MODE=disabled/);
  assert.match(env, /Step 8 is the first checkout step/);
});

test("simulators cannot send messages or invent authoritative tax", async () => {
  const integration = await readFile(integrationPath, "utf8");

  assert.match(integration, /delivered: false/);
  assert.match(integration, /taxCents: null/);
  assert.match(integration, /does not invent a live taxability decision or tax rate/);
  assert.match(integration, /fictional \.test email addresses/);
  assert.match(integration, /reserved 555 test phone numbers/);
});

test("staging integration health response is redacted", async () => {
  const route = await readFile(routePath, "utf8");

  assert.match(route, /secretValuesReturned: false/);
  assert.match(route, /notificationSimulatorDeliversMessages: false/);
  assert.match(route, /stripeCheckoutEnabled: false/);
  assert.doesNotMatch(route, /STRIPE_SECRET_KEY/);
  assert.doesNotMatch(route, /ADDRESS_VALIDATION_API_KEY/);
  assert.doesNotMatch(route, /TAX_PROVIDER_API_KEY/);
  assert.doesNotMatch(route, /TEST_EMAIL_API_KEY/);
  assert.doesNotMatch(route, /TEST_SMS_API_KEY/);
});
