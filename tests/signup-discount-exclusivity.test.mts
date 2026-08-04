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

test("signup accepts separate promo and referral link parameters", async () => {
  const source = await readFile(signupPagePath, "utf8");
  assert.match(source, /promo\?: string \| string\[\]/);
  assert.match(source, /ref\?: string \| string\[\]/);
  assert.match(
    source,
    /normalizeBinCleaningReferralCode\(searchParams\.ref\)/,
  );
  assert.match(source, /enableReferralCode/);
  assert.match(source, /initialReferralCode=\{initialReferralCode\}/);
});

test("applying one code clears and locks the other discount type", async () => {
  const source = await readFile(calculatorPath, "utf8");
  assert.match(source, /id="promo-code"/);
  assert.match(source, /id="referral-code"/);
  assert.match(source, /setReferralEntry\(""\)/);
  assert.match(source, /setSubmittedReferralCode\(""\)/);
  assert.match(source, /setPromoEntry\(""\)/);
  assert.match(source, /setSubmittedPromoCode\(""\)/);
  assert.match(source, /disabled=\{hasSubmittedReferral\}/);
  assert.match(source, /disabled=\{hasAppliedPromotion\}/);
  assert.match(source, /Remove promo code/);
  assert.match(source, /Remove referral code/);
  assert.match(source, /cannot be combined on the same signup/);
});
