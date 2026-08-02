export type PlanId = "monthly" | "quarterly" | "twice-yearly" | "one-time" | "every-two-weeks";

export type ServicePlan = Readonly<{
  id: PlanId;
  catalogVersion: "2026-08-02";
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
}>;

export const BIN_CLEANING_CATALOG_VERSION = "2026-08-02" as const;

export const BIN_CLEANING_PLANS: readonly ServicePlan[] = [
  { id: "monthly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Monthly", description: "One cleaning every calendar month.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 1, basePriceCents: 2000, additionalBinPriceCents: 500, binsIncluded: 1, referralEligible: true, checkoutEnabled: true },
  { id: "quarterly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Quarterly", description: "One cleaning every three calendar months.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 3, basePriceCents: 4000, additionalBinPriceCents: 1000, binsIncluded: 1, referralEligible: false, checkoutEnabled: true },
  { id: "twice-yearly", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Twice a Year", description: "One cleaning every six calendar months.", status: "active", publiclyVisible: true, chargeType: "recurring", intervalMonths: 6, basePriceCents: null, additionalBinPriceCents: null, binsIncluded: null, referralEligible: false, checkoutEnabled: false },
  { id: "one-time", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "One-Time Cleaning", description: "A single cleaning with no recurring subscription.", status: "active", publiclyVisible: true, chargeType: "one-time", intervalMonths: null, basePriceCents: 6000, additionalBinPriceCents: 1000, binsIncluded: 2, referralEligible: false, checkoutEnabled: true },
  { id: "every-two-weeks", catalogVersion: BIN_CLEANING_CATALOG_VERSION, name: "Every 2 Weeks", description: "Future plan; not available at launch.", status: "future", publiclyVisible: false, chargeType: "recurring", intervalMonths: null, basePriceCents: null, additionalBinPriceCents: null, binsIncluded: null, referralEligible: false, checkoutEnabled: false },
] as const;

export const PUBLIC_BIN_CLEANING_PLANS = BIN_CLEANING_PLANS.filter((plan) => plan.publiclyVisible);

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
