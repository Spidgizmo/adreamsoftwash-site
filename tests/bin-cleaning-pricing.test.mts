import assert from "node:assert/strict";
import test from "node:test";
import { BIN_CLEANING_PLANS, PUBLIC_BIN_CLEANING_PLANS, calculateBinCleaningPrice } from "../src/lib/bin-cleaning-plans.ts";

const examples = {
  monthly: [2000, 2500, 3000, 3500],
  quarterly: [4000, 5000, 6000, 7000],
  "one-time": [6000, 6000, 7000, 8000],
} as const;

for (const [planId, expected] of Object.entries(examples)) {
  test(`${planId} approved pricing examples`, () => {
    const plan = BIN_CLEANING_PLANS.find((item) => item.id === planId);
    assert.ok(plan);
    assert.deepEqual(expected.map((_, index) => calculateBinCleaningPrice(plan, index + 1)?.subtotalCents), expected);
  });
}

test("unapproved and inactive plans remain gated", () => {
  const twiceYearly = BIN_CLEANING_PLANS.find((item) => item.id === "twice-yearly")!;
  assert.equal(calculateBinCleaningPrice(twiceYearly, 2), null);
  assert.equal(twiceYearly.checkoutEnabled, false);
  assert.equal(PUBLIC_BIN_CLEANING_PLANS.some((item) => item.id === "every-two-weeks"), false);
});

test("invalid bin counts are rejected", () => {
  assert.throws(() => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 0), RangeError);
  assert.throws(() => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 1.5), RangeError);
});
