import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manualFormPath = new URL("../src/app/bin-cleaning/crm/customers/new/ManualCustomerForm.tsx", import.meta.url);
const manualRoutePath = new URL("../src/app/api/bin-cleaning/crm/manual-customer/route.ts", import.meta.url);
const reissueRoutePath = new URL("../src/app/api/bin-cleaning/crm/manual-customer/setup-link/route.ts", import.meta.url);
const reissuePanelPath = new URL("../src/components/bin-cleaning/ManualSetupLinkPanel.tsx", import.meta.url);
const signupDetailPath = new URL("../src/app/bin-cleaning/crm/signups/[id]/page.tsx", import.meta.url);
const bootstrapPath = new URL("../src/app/api/bin-cleaning/manual-setup/bootstrap/route.ts", import.meta.url);
const finalizePath = new URL("../src/app/api/bin-cleaning/manual-setup/finalize/route.ts", import.meta.url);
const setupComponentPath = new URL("../src/components/bin-cleaning/ManualCustomerSetup.tsx", import.meta.url);
const setupPagePath = new URL("../src/app/bin-cleaning/setup/page.tsx", import.meta.url);

test("staff-created intake stays incomplete until the customer accepts terms and prepares payment", async () => {
  const route = await readFile(manualRoutePath, "utf8");
  assert.match(route, /const editToken = randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(route, /createHash\("sha256"\)\.update\(editToken\)\.digest\("hex"\)/);
  assert.match(route, /status: "incomplete"/);
  assert.match(route, /email_allowed: false/);
  assert.match(route, /sms_allowed: false/);
  assert.match(route, /phone_allowed: false/);
  assert.match(route, /terms_accepted: false/);
  assert.match(route, /\/bin-cleaning\/setup#/);
  assert.match(route, /setupUrl/);
  assert.doesNotMatch(route, /status: "submitted_unpaid"/);
});

test("manual CRM exposes email text copy and open actions without collecting card data", async () => {
  const form = await readFile(manualFormPath, "utf8");
  assert.match(form, /Send setup\/payment link by EMAIL/);
  assert.match(form, /Send setup\/payment link by TEXT/);
  assert.match(form, /Copy setup\/payment link/);
  assert.match(form, /Open customer setup link/);
  assert.match(form, /navigator\.clipboard\.writeText\(savedSetup\.setupUrl\)/);
  assert.match(form, /Staff never types or stores card details/);
});

test("staff can reissue an incomplete manual setup link from signup detail without unlocking submitted records", async () => {
  const [route, panel, detail] = await Promise.all([
    readFile(reissueRoutePath, "utf8"),
    readFile(reissuePanelPath, "utf8"),
    readFile(signupDetailPath, "utf8"),
  ]);
  assert.match(route, /\["administrator", "dispatcher"\]/);
  assert.match(route, /lead\.form_data\?\.manual_intake !== true/);
  assert.match(route, /lead\.status !== "incomplete"/);
  assert.match(route, /submitted and converted signup records remain locked/i);
  assert.match(route, /randomBytes\(32\)\.toString\("hex"\)/);
  assert.match(route, /edit_token_hash: editTokenHash/);
  assert.match(route, /\/bin-cleaning\/setup#/);
  assert.match(panel, /Issue \/ reissue secure setup link/);
  assert.match(panel, /Reissuing rotates the credential/);
  assert.match(panel, /Send setup\/payment link by EMAIL/);
  assert.match(panel, /Send setup\/payment link by TEXT/);
  assert.match(panel, /Copy setup\/payment link/);
  assert.match(detail, /lead\.form_data\?\.manual_intake === true/);
  assert.match(detail, /lead\.status === "incomplete"/);
  assert.match(detail, /Customer setup finished — payment pending/);
});

test("secure setup credential stays in URL fragment and is verified server-side", async () => {
  const [bootstrap, component, page] = await Promise.all([
    readFile(bootstrapPath, "utf8"),
    readFile(setupComponentPath, "utf8"),
    readFile(setupPagePath, "utf8"),
  ]);
  assert.match(component, /window\.location\.hash/);
  assert.match(component, /window\.history\.replaceState\(null, "", window\.location\.pathname\)/);
  assert.match(component, /\/api\/bin-cleaning\/manual-setup\/bootstrap/);
  assert.match(bootstrap, /timingSafeEqual/);
  assert.match(bootstrap, /manual_intake !== true|manualIntake/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  assert.match(page, /referrer: "no-referrer"/);
});

test("customer creates portal identity, accepts required terms, then starts existing Stripe checkout", async () => {
  const [component, finalize] = await Promise.all([
    readFile(setupComponentPath, "utf8"),
    readFile(finalizePath, "utf8"),
  ]);
  const accountCall = component.indexOf('fetch("/api/bin-cleaning/signup-account"');
  const finalizeCall = component.indexOf('fetch("/api/bin-cleaning/manual-setup/finalize"');
  const checkoutCall = component.indexOf('fetch("/api/bin-cleaning/checkout"');
  assert.ok(accountCall >= 0);
  assert.ok(finalizeCall > accountCall);
  assert.ok(checkoutCall >= 0);
  assert.match(component, /I accept the ADS Bin Cleaning service and payment terms/);
  assert.match(component, /portalPasswordErrors\(password\)/);
  assert.match(finalize, /if \(!lead\.auth_user_id\)/);
  assert.match(finalize, /status: "submitted_unpaid"/);
  assert.match(finalize, /terms_accepted: true/);
  assert.match(finalize, /terms_version: "ads-bin-cleaning-service-payment-v1"/);
});

test("manual setup preserves payment security boundary", async () => {
  const component = await readFile(setupComponentPath, "utf8");
  assert.match(component, /No card information is stored here/);
  assert.match(component, /verified Stripe TEST webhook/);
  assert.doesNotMatch(component, /card_number|cardNumber|payment_method_data\[card/);
});
