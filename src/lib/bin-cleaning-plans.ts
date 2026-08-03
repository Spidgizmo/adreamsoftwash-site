import catalog from "./bin-cleaning-catalog.json" with { type: "json" };

export type PlanId =
  | "monthly"
  | "quarterly"
  | "twice-yearly"
  | "one-time"
  | "every-two-weeks";

export type ServicePlan = Readonly<{
  id: PlanId;
  catalogVersion: "2026-08-02-approved-pricing";
  name: string;
  description: string;
  status: "active" | "future";
  publiclyVisible: boolean;
  chargeType: "recurring" | "one-time";
  intervalMonths: number | null;
  basePriceCents: number | null;
  additionalBinPriceCents: number | null;
  binsIncluded: number | null;
  referralEligible: boolean;
  checkoutEnabled: boolean;
  priceLines: readonly [string, string];
  billingLabel: string;
}>;

export const BIN_CLEANING_CATALOG_VERSION =
  "2026-08-02-approved-pricing" as const;

export const BIN_CLEANING_PLANS =
  catalog as unknown as readonly ServicePlan[];

export const PUBLIC_BIN_CLEANING_PLANS = BIN_CLEANING_PLANS.filter(
  (plan) => plan.publiclyVisible,
);
export const DEFAULT_BIN_CLEANING_PLAN_ID: PlanId = "monthly";
export const MIN_BIN_COUNT = 1;
export const MAX_BIN_COUNT = 20;
export const TAX_ESTIMATE_MESSAGE =
  "Calculated from the validated service address during checkout";
export const ESTIMATED_TOTAL_LABEL = "Estimated total before tax";
export const BIN_CLEANING_STANDARD_SERVICE = [
  "Interior and exterior bin cleaning",
  "Chemical pre-treatment when needed",
  "Hands-on brushing",
  "Pressure washing",
  "Sanitizing and deodorizing",
  "Controlled wastewater capture and handling",
  "Before-and-after service photographs",
  "Return to your designated storage location",
] as const;

export const NEW25_PROMO_CODE = "NEW25" as const;

export const BIN_CLEANING_PROMOTIONS = [
  {
    code: NEW25_PROMO_CODE,
    displayName: "New Monthly subscriber first-month discount",
    status: "active",
    eligiblePlanIds: ["monthly"],
    percentOff: 25,
    appliesTo: "first-paid-cycle",
    newSubscriptionOnly: true,
    stackableWithReferral: false,
  },
] as const;

export type BinCleaningPromotion =
  (typeof BIN_CLEANING_PROMOTIONS)[number];

export type BinCleaningPromotionEvaluation = Readonly<{
  normalizedCode: string;
  status: "empty" | "invalid" | "ineligible" | "applied";
  promotion: BinCleaningPromotion | null;
  discountCents: number;
  firstChargeSubtotalCents: number;
}>;

export type BinCleaningDiscountCombinationEvaluation = Readonly<{
  status: "none" | "promotion-only" | "referral-only" | "conflict";
  canProceed: boolean;
}>;

export type BinCleaningSelection = Readonly<{
  planId: PlanId;
  binCount: number;
}>;

export function resolveBinCleaningSelection(
  values: Readonly<{
    plan?: string | string[];
    bins?: string | string[];
  }>,
): BinCleaningSelection {
  const requestedPlan = Array.isArray(values.plan)
    ? values.plan[0]
    : values.plan;
  const publicPlan = PUBLIC_BIN_CLEANING_PLANS.find(
    (plan) => plan.id === requestedPlan,
  );
  const requestedBins = Array.isArray(values.bins)
    ? values.bins[0]
    : values.bins;
  const parsedBins =
    requestedBins === undefined || !/^\d+$/.test(requestedBins)
      ? Number.NaN
      : Number(requestedBins);
  const binCount =
    Number.isSafeInteger(parsedBins) &&
    parsedBins >= MIN_BIN_COUNT &&
    parsedBins <= MAX_BIN_COUNT
      ? parsedBins
      : MIN_BIN_COUNT;

  return {
    planId: publicPlan?.id ?? DEFAULT_BIN_CLEANING_PLAN_ID,
    binCount,
  };
}

export function normalizeBinCleaningPromoCode(
  value: string | string[] | undefined,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return (candidate ?? "").trim().toUpperCase().slice(0, 32);
}

export type PriceBreakdown = Readonly<{
  basePriceCents: number;
  additionalBinCount: number;
  additionalBinChargesCents: number;
  subtotalCents: number;
}>;

export function calculateBinCleaningPrice(
  plan: ServicePlan,
  binCount: number,
): PriceBreakdown | null {
  if (!Number.isInteger(binCount) || binCount < 1) {
    throw new RangeError("Bin count must be a positive integer.");
  }
  if (
    plan.basePriceCents === null ||
    plan.additionalBinPriceCents === null ||
    plan.binsIncluded === null
  ) {
    return null;
  }
  const additionalBinCount = Math.max(0, binCount - plan.binsIncluded);
  const additionalBinChargesCents =
    additionalBinCount * plan.additionalBinPriceCents;
  return {
    basePriceCents: plan.basePriceCents,
    additionalBinCount,
    additionalBinChargesCents,
    subtotalCents: plan.basePriceCents + additionalBinChargesCents,
  };
}

export function evaluateBinCleaningPromotion(
  rawCode: string | string[] | undefined,
  plan: ServicePlan,
  subtotalCents: number,
): BinCleaningPromotionEvaluation {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError("Subtotal must be a nonnegative integer number of cents.");
  }

  const normalizedCode = normalizeBinCleaningPromoCode(rawCode);
  if (!normalizedCode) {
    return {
      normalizedCode,
      status: "empty",
      promotion: null,
      discountCents: 0,
      firstChargeSubtotalCents: subtotalCents,
    };
  }

  const promotion = BIN_CLEANING_PROMOTIONS.find(
    (item) => item.status === "active" && item.code === normalizedCode,
  );
  if (!promotion) {
    return {
      normalizedCode,
      status: "invalid",
      promotion: null,
      discountCents: 0,
      firstChargeSubtotalCents: subtotalCents,
    };
  }

  if (!(promotion.eligiblePlanIds as readonly PlanId[]).includes(plan.id)) {
    return {
      normalizedCode,
      status: "ineligible",
      promotion,
      discountCents: 0,
      firstChargeSubtotalCents: subtotalCents,
    };
  }

  const discountCents = Math.round(
    (subtotalCents * promotion.percentOff) / 100,
  );
  return {
    normalizedCode,
    status: "applied",
    promotion,
    discountCents,
    firstChargeSubtotalCents: subtotalCents - discountCents,
  };
}

export function evaluateBinCleaningDiscountCombination(
  promotionStatus: BinCleaningPromotionEvaluation["status"],
  hasEligibleReferralDiscount: boolean,
): BinCleaningDiscountCombinationEvaluation {
  const hasAppliedPromotion = promotionStatus === "applied";

  if (hasAppliedPromotion && hasEligibleReferralDiscount) {
    return { status: "conflict", canProceed: false };
  }
  if (hasAppliedPromotion) {
    return { status: "promotion-only", canProceed: true };
  }
  if (hasEligibleReferralDiscount) {
    return { status: "referral-only", canProceed: true };
  }
  return { status: "none", canProceed: true };
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}
