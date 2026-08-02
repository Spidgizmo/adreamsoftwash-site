import assert from "node:assert/strict";
import test from "node:test";
import { BIN_CLEANING_PLANS, ESTIMATED_TOTAL_LABEL, PUBLIC_BIN_CLEANING_PLANS, TAX_ESTIMATE_MESSAGE, calculateBinCleaningPrice, resolveBinCleaningSelection } from "../src/lib/bin-cleaning-plans.ts";

const examples = {
  monthly: [2000, 2500, 3000, 3500],
  quarterly: [3500, 4000, 4500, 5000],
  "twice-yearly": [5000, 5000, 6000, 7000],
  "one-time": [6000, 6000, 7000, 8000],
} as const;

for (const [planId, expected] of Object.entries(examples)) {
  test(`${planId} approved pricing examples`, () => {
    const plan = BIN_CLEANING_PLANS.find((item) => item.id === planId);
    assert.ok(plan);
    assert.deepEqual(expected.map((_, index) => calculateBinCleaningPrice(plan, index + 1)?.subtotalCents), expected);
  });
}

test("all four launch plans are priced and the inactive plan remains hidden", () => {
  const twiceYearly = BIN_CLEANING_PLANS.find((item) => item.id === "twice-yearly")!;
  assert.equal(calculateBinCleaningPrice(twiceYearly, 2)?.subtotalCents, 5000);
  assert.equal(twiceYearly.checkoutEnabled, true);
  assert.equal(PUBLIC_BIN_CLEANING_PLANS.some((item) => item.id === "every-two-weeks"), false);
});

test("invalid bin counts are rejected", () => {
  assert.throws(() => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 0), RangeError);
  assert.throws(() => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 1.5), RangeError);
});

for (const planId of ["monthly", "quarterly", "twice-yearly", "one-time"] as const) {
  test(`${planId} selection and bin count carry into the signup preview`, () => {
    assert.deepEqual(resolveBinCleaningSelection({ plan: planId, bins: "4" }), { planId, binCount: 4 });
  });
}

test("handoff selection recalculates from the central catalog", () => {
  const selection = resolveBinCleaningSelection({ plan: "twice-yearly", bins: "3" });
  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === selection.planId)!;
  assert.equal(calculateBinCleaningPrice(plan, selection.binCount)?.subtotalCents, 6000);
});

test("invalid and inactive plan values fall back to Monthly", () => {
  assert.equal(resolveBinCleaningSelection({ plan: "not-a-plan", bins: "2" }).planId, "monthly");
  assert.equal(resolveBinCleaningSelection({ plan: "every-two-weeks", bins: "2" }).planId, "monthly");
  assert.equal(resolveBinCleaningSelection({ bins: "2" }).planId, "monthly");
});

test("invalid bin values fall back to one bin", () => {
  for (const bins of [undefined, "", "0", "-1", "1.5", "2.0", "21", "999999999999999999999"]) {
    assert.equal(resolveBinCleaningSelection({ plan: "quarterly", bins }).binCount, 1);
  }
});

test("estimate wording states how tax is calculated and labels the pre-tax total", () => {
  assert.equal(TAX_ESTIMATE_MESSAGE, "Calculated from the validated service address during checkout");
  assert.equal(ESTIMATED_TOTAL_LABEL, "Estimated total before tax");
});
