import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isValidPortalPassword,
  portalPasswordErrors,
} from "../src/lib/bin-cleaning/password-policy.ts";

const formPath = new URL("../src/components/bin-cleaning/BinCleaningSignupForm.tsx", import.meta.url);
const accountRoutePath = new URL("../src/app/api/bin-cleaning/signup-account/route.ts", import.meta.url);
const authProvisioningPath = new URL("../src/lib/bin-cleaning/test-auth-provisioning.ts", import.meta.url);
const loginRoutePath = new URL("../src/app/api/bin-cleaning/auth/login/route.ts", import.meta.url);
const appShellPath = new URL("../src/components/bin-cleaning/AppShell.tsx", import.meta.url);
const billingActionsPath = new URL("../src/components/bin-cleaning/CustomerBillingActions.tsx", import.meta.url);
const ledgerPath = new URL("../src/components/bin-cleaning/ReferralLedger.tsx", import.meta.url);
const notificationPath = new URL("../src/lib/bin-cleaning/referral-notification-outbox.ts", import.meta.url);
const signupIdentityMigrationPath = new URL("../supabase/migrations/202608160003_signup_portal_identity.sql", import.meta.url);
const referralLifecycleMigrationPath = new URL("../supabase/migrations/202608160004_referral_lifecycle_notifications.sql", import.meta.url);
const referralPaymentMigrationPath = new URL("../supabase/migrations/202608170002_referrals_qualify_on_payment_and_signup_conversion.sql", import.meta.url);

test("customer portal password policy is 8+ with upper, lower, and special character", () => {
  assert.equal(isValidPortalPassword("Abcdefg!"), true);
  assert.equal(isValidPortalPassword("ABCDEFG!"), false);
  assert.equal(isValidPortalPassword("abcdefg!"), false);
  assert.equal(isValidPortalPassword("Abcdefgh"), false);
  assert.equal(isValidPortalPassword("Abc!"), false);
  assert.deepEqual(portalPasswordErrors("Abcdefg!"), []);
});

test("signup prepares a disabled portal identity before locking the lead and starting Stripe", async () => {
  const [form, accountRoute, migration] = await Promise.all([
    readFile(formPath, "utf8"),
    readFile(accountRoutePath, "utf8"),
    readFile(signupIdentityMigrationPath, "utf8"),
  ]);

  assert.match(form, /Create your customer portal sign-in/);
  assert.match(form, /preparePortalAccount/);
  assert.match(form, /saveDraft\("incomplete"\)/);
  assert.match(form, /await preparePortalAccount\(\)/);
  assert.match(form, /saveDraft\("submitted_unpaid"\)/);
  assert.match(form, /startCheckout/);
  assert.doesNotMatch(form, /password:\s*form\.password[\s\S]*sourcePath:/);
  assert.match(accountRoute, /login_status:\s*"pending_payment"/);
  assert.match(accountRoute, /timingSafeEqual/);
  assert.match(accountRoute, /portalPasswordErrors/);
  assert.match(migration, /auth_user_id uuid references auth\.users/);
  assert.match(migration, /Customer portal identity must be prepared before checkout/);
});

test("verified payment activates the same signup identity and login uses the shared password policy", async () => {
  const [provisioning, login] = await Promise.all([
    readFile(authProvisioningPath, "utf8"),
    readFile(loginRoutePath, "utf8"),
  ]);
  assert.match(provisioning, /preparedSignupIdentity/);
  assert.match(provisioning, /login_status:\s*"active"/);
  assert.match(provisioning, /customers\?id=eq/);
  assert.match(login, /isValidPortalPassword/);
  assert.doesNotMatch(login, /password\.length\s*<\s*12/);
});

test("customer portal exposes payment, cancellation/resume, and a detailed referral ledger", async () => {
  const [shell, billingActions, ledger] = await Promise.all([
    readFile(appShellPath, "utf8"),
    readFile(billingActionsPath, "utf8"),
    readFile(ledgerPath, "utf8"),
  ]);
  assert.match(shell, /<CustomerBillingActions \/>/);
  assert.match(shell, /<ReferralLedger \/>/);
  assert.match(billingActions, /Update payment method/);
  assert.match(billingActions, /Cancel service/);
  assert.match(billingActions, /Resume service/);
  assert.match(billingActions, /\/api\/bin-cleaning\/billing-portal/);
  assert.match(ledger, /Submitted, unpaid/);
  assert.match(ledger, /Paid \/ processing/);
  assert.match(ledger, /Qualified/);
  assert.match(ledger, /Rewards waiting/);
  assert.match(ledger, /Rewards used/);
  assert.match(ledger, /successfully pays/);
  assert.match(ledger, /rejected[\s\S]*reversed/);
});

test("referral lifecycle qualifies on successful payment, queues tiered rewards, and creates idempotent notifications", async () => {
  const [originalLifecycle, paymentLifecycle, notifications] = await Promise.all([
    readFile(referralLifecycleMigrationPath, "utf8"),
    readFile(referralPaymentMigrationPath, "utf8"),
    readFile(notificationPath, "utf8"),
  ]);
  assert.match(paymentLifecycle, /issue_referral_reward_after_paid_activation/);
  assert.match(paymentLifecycle, /hold_until=now\(\)/);
  assert.match(paymentLifecycle, /drop trigger if exists begin_referral_hold_after_first_service/);
  assert.match(paymentLifecycle, /status='converted'/);
  assert.match(paymentLifecycle, /duplicate_active_claim/);
  assert.match(originalLifecycle, /process_mature_referral_rewards/);
  assert.match(originalLifecycle, /case when next_sequence=1 then 50 else 25 end/);
  assert.match(originalLifecycle, /idempotency_key text not null unique/);
  assert.match(originalLifecycle, /referred_customer_welcome/);
  assert.match(originalLifecycle, /referrer_joined_pending/);
  assert.match(originalLifecycle, /referrer_reward_qualified/);
  assert.match(notifications, /thanks you for subscribing/);
  assert.match(notifications, /one eligible Monthly base cleaning/);
  assert.match(notifications, /one qualified referral reward per eligible Monthly invoice/);
  assert.match(notifications, /payment was confirmed/);
  assert.match(notifications, /do not have to wait for their first cleaning/);
  assert.match(notifications, /Hosted test referral notifications must remain in simulator mode/);
});
