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
const signupFormPath = new URL(
  "../src/components/bin-cleaning/BinCleaningSignupForm.tsx",
  import.meta.url,
);
const calculatorPath = new URL(
  "../src/components/BinCleaningCalculator.tsx",
  import.meta.url,
);

test("public page advertises nonexpiring ONE45 and deep-links the eligible selection", async () => {
  const source = await readFile(publicPagePath, "utf8");
  assert.match(source, /One-Time Cleaning for 2 bins: \$45/);
  assert.match(source, /One\s+successful use per customer/);
  assert.match(source, /Established customers and future/);
  assert.match(source, /This offer does not\s+expire/);
  assert.doesNotMatch(source, /September 1, 2026/);
  assert.match(source, /promo=\$\{ONE45_PROMO_CODE\}/);
  assert.match(source, /<BinCleaningCalculator \/>/);
});

test("working signup preserves approved NEW25 and nonexpiring ONE45 copy", async () => {
  const [page, form] = await Promise.all([
    readFile(signupPagePath, "utf8"),
    readFile(signupFormPath, "utf8"),
  ]);

  assert.match(page, /Use code <strong>\{NEW25_PROMO_CODE\}<\/strong> for 25% off your first month/);
  assert.match(page, /Use code <strong>\{ONE45_PROMO_CODE\}<\/strong> for a \$45 One-Time Cleaning of 2/);
  assert.match(page, /One successful use per customer/);
  assert.match(page, /does not expire/);
  assert.doesNotMatch(page, /September 1, 2026/);
  assert.match(page, /<BinCleaningSignupForm/);
  assert.match(page, /initialPromoCode=\{initialPromoCode\}/);
  assert.match(page, /normalizeBinCleaningPromoCode\(searchParams\.promo\)/);
  assert.match(form, /Promo code/);
  assert.match(form, /Estimated first charge before tax/);
});

test("public calculator keeps promo preview on the signup form", async () => {
  const source = await readFile(calculatorPath, "utf8");
  assert.doesNotMatch(source, /id="promo-code"/);
  assert.doesNotMatch(source, />\s*Apply promo\s*</);
  assert.match(source, /Promo and referral codes are entered on the signup form/);
  assert.match(source, /Your estimate/);
  assert.match(source, /Subtotal/);
  assert.match(source, /ESTIMATED_TOTAL_LABEL/);
});
