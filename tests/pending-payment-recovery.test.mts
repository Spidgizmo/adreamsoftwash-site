import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const loginRoutePath = new URL("../src/app/api/bin-cleaning/auth/login/route.ts", import.meta.url);
const loginPagePath = new URL("../src/app/bin-cleaning/login/page.tsx", import.meta.url);
const checkoutRoutePath = new URL("../src/app/api/bin-cleaning/checkout/route.ts", import.meta.url);
const completePaymentPath = new URL("../src/app/bin-cleaning/complete-payment/page.tsx", import.meta.url);
const resumeButtonPath = new URL("../src/components/bin-cleaning/ResumePaymentButton.tsx", import.meta.url);
const reminderOutboxPath = new URL("../src/lib/bin-cleaning/payment-reminder-outbox.ts", import.meta.url);
const reminderMigrationPath = new URL("../supabase/migrations/20260817160057_pending_signup_payment_reminders.sql", import.meta.url);
const recoveryMigrationPath = new URL("../supabase/migrations/20260817160434_pending_payment_recovery_rpc.sql", import.meta.url);
const immutableMigrationPath = new URL("../supabase/migrations/202608110900_lock_submitted_signup_records.sql", import.meta.url);
const processorRoutePath = new URL("../src/app/api/bin-cleaning/referrals/process/route.ts", import.meta.url);
const vercelConfigPath = new URL("../vercel.json", import.meta.url);

test("a submitted unpaid Auth identity can sign back in without becoming an active portal customer", async () => {
  const [route, page] = await Promise.all([
    readFile(loginRoutePath, "utf8"),
    readFile(loginPagePath, "utf8"),
  ]);
  assert.match(route, /authenticatedUserFromToken/);
  assert.match(route, /status=eq\.submitted_unpaid/);
  assert.match(route, /auth_user_id=eq\./);
  assert.match(route, /\/bin-cleaning\/complete-payment/);
  assert.match(page, /Left Stripe before paying\?/);
  assert.match(page, /payment === "required"/);
  assert.match(page, /continue secure payment/);
});

test("payment recovery reuses an open Stripe TEST session and never grants portal access", async () => {
  const [checkout, page, button] = await Promise.all([
    readFile(checkoutRoutePath, "utf8"),
    readFile(completePaymentPath, "utf8"),
    readFile(resumeButtonPath, "utf8"),
  ]);
  assert.match(checkout, /resumePendingPayment/);
  assert.match(checkout, /stripeGet<StripeSessionLookup>/);
  assert.match(checkout, /session\.status === "open"/);
  assert.match(checkout, /session\.payment_status === "unpaid"/);
  assert.match(checkout, /checkoutUrl: session\.url/);
  assert.match(button, /resumePendingPayment: true/);
  assert.match(page, /Your signup is saved — payment is still due/);
  assert.match(page, /signed Stripe webhook and trusted database state verify payment/);
  assert.doesNotMatch(page, /status: "active"|login_status: "active"/);
});

test("expired checkout recovery uses an Auth-owned trusted RPC without mutating immutable submitted signup data", async () => {
  const [checkout, recoveryMigration, immutableMigration] = await Promise.all([
    readFile(checkoutRoutePath, "utf8"),
    readFile(recoveryMigrationPath, "utf8"),
    readFile(immutableMigrationPath, "utf8"),
  ]);
  assert.match(immutableMigration, /Submitted signup records are immutable/);
  assert.match(checkout, /rpc\/prepare_stripe_test_checkout_for_auth/);
  assert.match(checkout, /p_auth_user_id: authenticatedUser\.id/);
  assert.doesNotMatch(checkout, /edit_token_hash: editTokenHash/);
  assert.match(recoveryMigration, /auth_user_id=p_auth_user_id/);
  assert.match(recoveryMigration, /lead\.status <> 'submitted_unpaid'/);
  assert.match(recoveryMigration, /is_test=true/);
  assert.match(recoveryMigration, /grant execute on function public\.prepare_stripe_test_checkout_for_auth\(uuid,uuid\) to service_role/);
  assert.match(recoveryMigration, /revoke all on function public\.prepare_stripe_test_checkout_for_auth\(uuid,uuid\) from public,anon,authenticated/);
});

test("abandoned checkout queues one idempotent reminder and conversion cancels it", async () => {
  const [checkout, outbox, migration] = await Promise.all([
    readFile(checkoutRoutePath, "utf8"),
    readFile(reminderOutboxPath, "utf8"),
    readFile(reminderMigrationPath, "utf8"),
  ]);
  assert.match(checkout, /queuePendingPaymentReminder\(lead\.id\)/);
  assert.match(outbox, /signup-payment:\$\{lead\.id\}:1h:email/);
  assert.match(outbox, /60 \* 60 \* 1000/);
  assert.match(outbox, /resolution=ignore-duplicates/);
  assert.match(outbox, /\/bin-cleaning\/login\?payment=required/);
  assert.match(outbox, /must remain in simulator mode/);
  assert.match(migration, /idempotency_key text not null unique/);
  assert.match(migration, /new\.status = 'converted'/);
  assert.match(migration, /status = 'canceled'/);
});

test("scheduled processor handles payment reminders with the existing protected cron boundary", async () => {
  const [processor, vercel] = await Promise.all([
    readFile(processorRoutePath, "utf8"),
    readFile(vercelConfigPath, "utf8"),
  ]);
  assert.match(processor, /processSignupPaymentReminderOutbox/);
  assert.match(processor, /paymentReminders/);
  assert.match(processor, /CRON_SECRET/);
  assert.match(vercel, /17 \* \* \* \*/);
});
