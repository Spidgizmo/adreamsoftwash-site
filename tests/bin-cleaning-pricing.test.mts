import assert from "node:assert/strict";
import test from "node:test";
import {
  BIN_CLEANING_PLANS,
  BIN_CLEANING_PROMOTIONS,
  BIN_CLEANING_STANDARD_SERVICE,
  ESTIMATED_TOTAL_LABEL,
  NEW25_PROMO_CODE,
  PUBLIC_BIN_CLEANING_PLANS,
  TAX_ESTIMATE_MESSAGE,
  calculateBinCleaningPrice,
  evaluateBinCleaningDiscountCombination,
  evaluateBinCleaningPromotion,
  normalizeBinCleaningPromoCode,
  resolveBinCleaningSelection,
} from "../src/lib/bin-cleaning-plans.ts";

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
    assert.deepEqual(
      expected.map(
        (_, index) => calculateBinCleaningPrice(plan, index + 1)?.subtotalCents,
      ),
      expected,
    );
  });
}

test("all four launch plans are priced and the inactive plan remains hidden", () => {
  const twiceYearly = BIN_CLEANING_PLANS.find(
    (item) => item.id === "twice-yearly",
  )!;
  assert.equal(calculateBinCleaningPrice(twiceYearly, 2)?.subtotalCents, 5000);
  assert.equal(twiceYearly.checkoutEnabled, true);
  assert.equal(
    PUBLIC_BIN_CLEANING_PLANS.some(
      (item) => item.id === "every-two-weeks",
    ),
    false,
  );
});

test("invalid bin counts are rejected", () => {
  assert.throws(
    () => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 0),
    RangeError,
  );
  assert.throws(
    () => calculateBinCleaningPrice(BIN_CLEANING_PLANS[0], 1.5),
    RangeError,
  );
});

for (const planId of [
  "monthly",
  "quarterly",
  "twice-yearly",
  "one-time",
] as const) {
  test(`${planId} selection and bin count carry into the signup preview`, () => {
    assert.deepEqual(
      resolveBinCleaningSelection({ plan: planId, bins: "4" }),
      { planId, binCount: 4 },
    );
  });
}

test("handoff selection recalculates from the central catalog", () => {
  const selection = resolveBinCleaningSelection({
    plan: "twice-yearly",
    bins: "3",
  });
  const plan = PUBLIC_BIN_CLEANING_PLANS.find(
    (item) => item.id === selection.planId,
  )!;
  assert.equal(calculateBinCleaningPrice(plan, selection.binCount)?.subtotalCents, 6000);
});

test("invalid and inactive plan values fall back to Monthly", () => {
  assert.equal(
    resolveBinCleaningSelection({ plan: "not-a-plan", bins: "2" }).planId,
    "monthly",
  );
  assert.equal(
    resolveBinCleaningSelection({ plan: "every-two-weeks", bins: "2" })
      .planId,
    "monthly",
  );
  assert.equal(resolveBinCleaningSelection({ bins: "2" }).planId, "monthly");
});

test("invalid bin values fall back to one bin", () => {
  for (const bins of [
    undefined,
    "",
    "0",
    "-1",
    "1.5",
    "2.0",
    "21",
    "999999999999999999999",
  ]) {
    assert.equal(
      resolveBinCleaningSelection({ plan: "quarterly", bins }).binCount,
      1,
    );
  }
});

test("NEW25 is the single active new-subscriber promotion", () => {
  assert.equal(NEW25_PROMO_CODE, "NEW25");
  assert.deepEqual(BIN_CLEANING_PROMOTIONS, [
    {
      code: "NEW25",
      displayName: "New Monthly subscriber first-month discount",
      status: "active",
      eligiblePlanIds: ["monthly"],
      percentOff: 25,
      appliesTo: "first-paid-cycle",
      newSubscriptionOnly: true,
      stackableWithReferral: false,
    },
  ]);
});

test("promo code input is trimmed and case-insensitive", () => {
  assert.equal(normalizeBinCleaningPromoCode("  new25  "), "NEW25");
  assert.equal(normalizeBinCleaningPromoCode(["new25", "ignored"]), "NEW25");
});

test("NEW25 discounts the entire first Monthly charge by 25 percent", () => {
  const plan = BIN_CLEANING_PLANS.find((item) => item.id === "monthly")!;
  const price = calculateBinCleaningPrice(plan, 4)!;
  const promotion = evaluateBinCleaningPromotion("new25", plan, price.subtotalCents);

  assert.equal(price.subtotalCents, 3500);
  assert.equal(promotion.status, "applied");
  assert.equal(promotion.discountCents, 875);
  assert.equal(promotion.firstChargeSubtotalCents, 2625);
});

test("NEW25 cannot be combined with an eligible referral discount", () => {
  assert.deepEqual(evaluateBinCleaningDiscountCombination("applied", true), {
    status: "conflict",
    canProceed: false,
  });
  assert.deepEqual(evaluateBinCleaningDiscountCombination("applied", false), {
    status: "promotion-only",
    canProceed: true,
  });
  assert.deepEqual(evaluateBinCleaningDiscountCombination("empty", true), {
    status: "referral-only",
    canProceed: true,
  });
  assert.deepEqual(evaluateBinCleaningDiscountCombination("empty", false), {
    status: "none",
    canProceed: true,
  });
});

test("NEW25 does not discount Quarterly, Twice a Year, or One-Time", () => {
  for (const planId of ["quarterly", "twice-yearly", "one-time"] as const) {
    const plan = BIN_CLEANING_PLANS.find((item) => item.id === planId)!;
    const price = calculateBinCleaningPrice(plan, 2)!;
    const promotion = evaluateBinCleaningPromotion(
      NEW25_PROMO_CODE,
      plan,
      price.subtotalCents,
    );

    assert.equal(promotion.status, "ineligible");
    assert.equal(promotion.discountCents, 0);
    assert.equal(promotion.firstChargeSubtotalCents, price.subtotalCents);
  }
});

test("blank and unknown promo codes do not change the charge", () => {
  const plan = BIN_CLEANING_PLANS.find((item) => item.id === "monthly")!;

  assert.deepEqual(evaluateBinCleaningPromotion("", plan, 2000), {
    normalizedCode: "",
    status: "empty",
    promotion: null,
    discountCents: 0,
    firstChargeSubtotalCents: 2000,
  });
  assert.deepEqual(evaluateBinCleaningPromotion("NOTREAL", plan, 2000), {
    normalizedCode: "NOTREAL",
    status: "invalid",
    promotion: null,
    discountCents: 0,
    firstChargeSubtotalCents: 2000,
  });
});

test("promotion calculations reject invalid cent subtotals", () => {
  const plan = BIN_CLEANING_PLANS.find((item) => item.id === "monthly")!;
  assert.throws(
    () => evaluateBinCleaningPromotion(NEW25_PROMO_CODE, plan, -1),
    RangeError,
  );
  assert.throws(
    () => evaluateBinCleaningPromotion(NEW25_PROMO_CODE, plan, 19.5),
    RangeError,
  );
});

test("estimate wording states how tax is calculated and labels the pre-tax total", () => {
  assert.equal(
    TAX_ESTIMATE_MESSAGE,
    "Calculated from the validated service address during checkout",
  );
  assert.equal(ESTIMATED_TOTAL_LABEL, "Estimated total before tax");
});

test("public standard-service copy matches the owner-approved scope", () => {
  assert.deepEqual(BIN_CLEANING_STANDARD_SERVICE, [
    "Interior and exterior bin cleaning",
    "Chemical pre-treatment when needed",
    "Hands-on brushing",
    "Pressure washing",
    "Sanitizing and deodorizing",
    "Controlled wastewater capture and handling",
    "Before-and-after service photographs",
    "Return to your designated storage location",
  ]);
});
