import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const signupPagePath = new URL(
  "../src/app/bin-cleaning/signup/page.tsx",
  import.meta.url,
);
const calculatorPath = new URL(
  "../src/components/BinCleaningCalculator.tsx",
  import.meta.url,
);

test("signup page advertises NEW25 and enables the promo-code calculator", async () => {
  const source = await readFile(signupPagePath, "utf8");
  assert.match(source, /Use code \{NEW25_PROMO_CODE\} for 25% off your first month/);
  assert.match(source, /enablePromoCode/);
  assert.match(source, /initialPromoCode=\{initialPromoCode\}/);
  assert.match(source, /normalizeBinCleaningPromoCode\(searchParams\.promo\)/);
});

test("signup calculator provides an apply control and first-month discount line", async () => {
  const source = await readFile(calculatorPath, "utf8");
  assert.match(source, /id="promo-code"/);
  assert.match(source, />\s*Apply code\s*</);
  assert.match(source, /First month before tax/);
  assert.match(source, /Later Monthly renewals before tax/);
  assert.match(source, /That promo code is not recognized/);
});
