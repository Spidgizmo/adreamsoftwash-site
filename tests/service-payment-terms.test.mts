import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const termsPagePath = new URL("../src/app/bin-cleaning/terms/page.tsx", import.meta.url);
const signupPagePath = new URL("../src/app/bin-cleaning/signup/page.tsx", import.meta.url);
const setupPagePath = new URL("../src/app/bin-cleaning/setup/page.tsx", import.meta.url);
const signupFormPath = new URL("../src/components/bin-cleaning/BinCleaningSignupForm.tsx", import.meta.url);
const manualSetupPath = new URL("../src/components/bin-cleaning/ManualCustomerSetup.tsx", import.meta.url);
const signupDraftRoutePath = new URL("../src/app/api/bin-cleaning/signup-draft/route.ts", import.meta.url);

test("ADS service and payment terms are readable from both signup paths", async () => {
  const [terms, signupPage, setupPage, manualSetup] = await Promise.all([
    readFile(termsPagePath, "utf8"),
    readFile(signupPagePath, "utf8"),
    readFile(setupPagePath, "utf8"),
    readFile(manualSetupPath, "utf8"),
  ]);

  assert.match(terms, /ads-bin-cleaning-service-payment-v1/);
  assert.match(terms, /Service & Payment Terms/);
  assert.match(terms, /Cancellation/);
  assert.match(terms, /Contamination/);
  assert.match(terms, /NEW25/);
  assert.match(terms, /ONE45/);
  assert.match(signupPage, /\/bin-cleaning\/terms/);
  assert.match(setupPage, /\/bin-cleaning\/terms/);
  assert.match(manualSetup, /\/bin-cleaning\/terms/);
  assert.match(manualSetup, /I accept the ADS Bin Cleaning service and payment terms/);
});

test("online signup cannot silently pre-accept terms", async () => {
  const form = await readFile(signupFormPath, "utf8");

  assert.match(form, /termsAccepted: false/);
  assert.match(form, /termsAccepted: form\.termsAccepted/);
  assert.match(form, /if \(!form\.termsAccepted\) result\.termsAccepted/);
  assert.match(form, /setChecked\("termsAccepted"\)/);
  assert.match(form, /data-field="termsAccepted"/);
  assert.match(form, /\/bin-cleaning\/terms/);
  assert.match(form, /I accept the ADS Bin Cleaning service and payment terms/);
  assert.doesNotMatch(form, /termsAccepted: true/);
});

test("online signup records the accepted terms version", async () => {
  const route = await readFile(signupDraftRoutePath, "utf8");
  assert.match(route, /termsVersion: value\.payload\.termsAccepted \? "ads-bin-cleaning-service-payment-v1" : null/);
});
