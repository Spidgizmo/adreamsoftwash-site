import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPagePath = new URL(
  "../src/app/bin-cleaning/page.tsx",
  import.meta.url,
);
const signupPagePath = new URL(
  "../src/app/bin-cleaning/signup/page.tsx",
  import.meta.url,
);
const calculatorPath = new URL(
  "../src/components/BinCleaningCalculator.tsx",
  import.meta.url,
);

test("public page advertises ONE45 and deep-links the eligible selection", async () => {
  const source = await readFile(publicPagePath, "utf8");
  assert.match(source, /One-Time Cleaning for 2 bins: \$45/);
  assert.match(source, /One\s+successful use per customer/);
  assert.match(source, /Established customers and future/);
  assert.match(source, /This offer does not\s+expire/);
  assert.doesNotMatch(source, /September 1, 2026/);
  assert.match(source, /promo=\$\{ONE45_PROMO_CODE\}/);
  assert.match(source, /<BinCleaningCalculator enablePromoCode \/>/);
});

test("signup page advertises NEW25 and ONE45 and enables promo entry", async () => {
  const source = await readFile(signupPagePath, "utf8");
  assert.match(source, /Use code \{NEW25_PROMO_CODE\} for 25% off your first month/);
  assert.match(source, /Use code \{ONE45_PROMO_CODE\} for a \$45 One-Time Cleaning of 2/);
  assert.match(source, /One successful use per customer/);
  assert.match(source, /does not expire/);
  assert.doesNotMatch(source, /September 1, 2026/);
  assert.match(source, /enablePromoCode/);
  assert.match(source, /initialPromoCode=\{initialPromoCode\}/);
  assert.match(source, /normalizeBinCleaningPromoCode\(searchParams\.promo\)/);
});

test("signup calculator provides ONE45 and NEW25 preview behavior", async () => {
  const source = await readFile(calculatorPath, "utf8");
  assert.match(source, /id="promo-code"/);
  assert.match(source, />\s*Apply promo\s*</);
  assert.match(source, /First month before tax/);
  assert.match(source, /Later Monthly renewals before tax/);
  assert.match(source, /Promotional total before tax/);
  assert.match(source, /one-time two-bin cleaning for \$45 before tax/);
  assert.match(source, /One successful ONE45 redemption per/);
  assert.match(source, /Established customers pay the regular price/);
  assert.match(source, /That promo code is not recognized/);
  assert.match(source, /cannot be combined on the same signup/);
  assert.match(source, /another promotion cannot be added/);
});
