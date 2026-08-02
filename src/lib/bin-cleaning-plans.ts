export type PlanId = "monthly" | "quarterly" | "twice-yearly" | "one-time" | "every-two-weeks";

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

export const BIN_CLEANING_CATALOG_VERSION = "2026-08-02-approved-pricing" as const;

export const BIN_CLEANING_PLANS: readonly ServicePlan[] = [
  { id: "monthly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Monthly", description: "One cleaning every calendar month.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 1, basePriceCents: 2000, additionalBinPriceCents: 500, binsIncluded: 1, referralEligible: true, checkoutEnabled: true, priceLines: ["$20 first bin", "+$5 each additional bin"], billingLabel: "Recurring every calendar month" },
  { id: "quarterly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Quarterly", description: "One cleaning every three calendar months.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 3, basePriceCents: 3500, additionalBinPriceCents: 500, binsIncluded: 1, referralEligible: false, checkoutEnabled: true, priceLines: ["$35 first bin", "+$5 each additional bin"], billingLabel: "Recurring every 3 calendar months" },
  { id: "twice-yearly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Twice a Year", description: "One cleaning every six calendar months.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 6, basePriceCents: 5000, additionalBinPriceCents: 1000, binsIncluded: 2, referralEligible: false, checkoutEnabled: true, priceLines: ["$50 includes up to 2 bins", "+$10 each additional bin after 2"], billingLabel: "Recurring every 6 calendar months" },
  { id: "one-time", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "One-Time Cleaning", description: "A single cleaning with no recurring subscription.", status: "active", publiclyVisible: true, chargeType: "one-time", intervalMonths: null, basePriceCents: 6000, additionalBinPriceCents: 1000, binsIncluded: 2, referralEligible: false, checkoutEnabled: true, priceLines: ["$60 includes up to 2 bins", "+$10 each additional bin after 2"], billingLabel: "Single payment · No subscription" },
  { id: "every-two-weeks", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Every 2 Weeks", description: "Future plan; not available at launch.", status: "future", publiclyVisible: false, chargeType: "recurring", intervalMonths: null, basePriceCents: null, additionalBinPriceCents: null, binsIncluded: null, referralEligible: false, checkoutEnabled: false, priceLines: ["Not available", "Pricing not set"], billingLabel: "Future plan" },
] as const;

export const PUBLIC_BIN_CLEANING_PLANS = BIN_CLEANING_PLANS.filter((plan) => plan.publiclyVisible);
export const DEFAULT_BIN_CLEANING_PLAN_ID: PlanId = "monthly";
export const MIN_BIN_COUNT = 1;
export const MAX_BIN_COUNT = 20;
export const TAX_ESTIMATE_MESSAGE = "Calculated from the validated service address during checkout";
export const ESTIMATED_TOTAL_LABEL = "Estimated total before tax";

export type BinCleaningSelection = Readonly<{ planId: PlanId; binCount: number }>;

export function resolveBinCleaningSelection(
  values: Readonly<{ plan?: string | string[]; bins?: string | string[] }>,
): BinCleaningSelection {
  const requestedPlan = Array.isArray(values.plan) ? values.plan[0] : values.plan;
  const publicPlan = PUBLIC_BIN_CLEANING_PLANS.find((plan) => plan.id === requestedPlan);
  const requestedBins = Array.isArray(values.bins) ? values.bins[0] : values.bins;
  const parsedBins = requestedBins === undefined || !/^\d+$/.test(requestedBins) ? Number.NaN : Number(requestedBins);
  const binCount = Number.isSafeInteger(parsedBins) && parsedBins >= MIN_BIN_COUNT && parsedBins <= MAX_BIN_COUNT
    ? parsedBins
    : MIN_BIN_COUNT;

  return { planId: publicPlan?.id ?? DEFAULT_BIN_CLEANING_PLAN_ID, binCount };
}

export type PriceBreakdown = Readonly<{ basePriceCents: number; additionalBinCount: number; additionalBinChargesCents: number; subtotalCents: number }>;

export function calculateBinCleaningPrice(plan: ServicePlan, binCount: number): PriceBreakdown | null {
  if (!Number.isInteger(binCount) || binCount < 1) throw new RangeError("Bin count must be a positive integer.");
  if (plan.basePriceCents === null || plan.additionalBinPriceCents === null || plan.binsIncluded === null) return null;
  const additionalBinCount = Math.max(0, binCount - plan.binsIncluded);
  const additionalBinChargesCents = additionalBinCount * plan.additionalBinPriceCents;
  return { basePriceCents: plan.basePriceCents, additionalBinCount, additionalBinChargesCents, subtotalCents: plan.basePriceCents + additionalBinChargesCents };
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(cents / 100);
}
