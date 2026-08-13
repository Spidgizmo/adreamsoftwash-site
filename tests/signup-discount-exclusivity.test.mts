import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isPlausibleBinCleaningReferralCode,
  normalizeBinCleaningReferralCode,
} from "../src/lib/bin-cleaning-plans.ts";

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

test("referral codes are normalized without confusing them with promo codes", () => {
  assert.equal(
    normalizeBinCleaningReferralCode("  ads-abcd-2345  "),
    "ADS-ABCD-2345",
  );
  assert.equal(
    normalizeBinCleaningReferralCode(["ads-7k9m2q4x", "ignored"]),
    "ADS-7K9M2Q4X",
  );
  assert.equal(isPlausibleBinCleaningReferralCode("ADS-ABCD-2345"), true);
  assert.equal(isPlausibleBinCleaningReferralCode("bad code!"), false);
});

test("working signup accepts separate promo and referral link parameters", async () => {
  const source = await readFile(signupPagePath, "utf8");
  assert.match(source, /promo\?: string \| string\[\]/);
  assert.match(source, /ref\?: string \| string\[\]/);
  assert.match(
    source,
    /normalizeBinCleaningReferralCode\(searchParams\.ref\)/,
  );
  assert.match(source, /initialPromoCode=\{initialPromoCode\}/);
  assert.match(source, /initialReferralCode=\{initialReferralCode\}/);
  assert.match(source, /one discount type only/);
});

test("working form clears and locks the other discount type", async () => {
  const source = await readFile(signupFormPath, "utf8");
  assert.match(source, /promoCode: referral \? "" : promo/);
  assert.match(source, /referralCode: referral/);
  assert.match(source, /disabled=\{Boolean\(normalizedReferral\)\}/);
  assert.match(source, /disabled=\{Boolean\(normalizedPromo\)\}/);
  assert.match(source, /promoCode: event\.target\.value, referralCode: event\.target\.value \? ""/);
  assert.match(source, /referralCode: event\.target\.value, promoCode: event\.target\.value \? ""/);
  assert.match(source, /Use one or the other\. They never stack\./);
});

test("public calculator leaves discount entry to the signup form", async () => {
  const source = await readFile(calculatorPath, "utf8");
  assert.doesNotMatch(source, /id="promo-code"/);
  assert.doesNotMatch(source, /id="referral-code"/);
  assert.match(source, /Promo and referral codes are entered on the signup form/);
  assert.match(source, /href=\{`\/bin-cleaning\/signup\?plan=\$\{plan\.id\}&bins=\$\{binCount\}`\}/);
});
