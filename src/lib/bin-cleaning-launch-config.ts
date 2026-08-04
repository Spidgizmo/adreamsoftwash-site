import { BIN_CLEANING_CATALOG_VERSION } from "./bin-cleaning-plans.ts";

export const ONE45_PROMO_CODE = "ONE45" as const;

export const BIN_CLEANING_LAUNCH_CONFIG = {
  configVersion: "2026-08-04-launch-rules-v1",
  catalogVersion: BIN_CLEANING_CATALOG_VERSION,
  owner: "James Gibbs",
  publicDomain: "www.acleanbin.com",
  launchPlanIds: [
    "monthly",
    "quarterly",
    "twice-yearly",
    "one-time",
  ],
  inactivePlanIds: ["every-two-weeks"],
  discounts: {
    selectionLimit: 1,
    promoAndReferralStackingAllowed: false,
    new25: {
      code: "NEW25",
      publiclyAdvertised: true,
      eligiblePlanId: "monthly",
      percentOff: 25,
      appliesTo: "first-paid-cycle",
      newSubscriptionOnly: true,
      stackableWithReferral: false,
    },
    one45: {
      code: ONE45_PROMO_CODE,
      campaignName: "Card-only two-bin one-time special",
      publiclyAdvertisedOnGeneralWebsite: false,
      redemptionMethod: "customer-enters-promo-code-at-checkout",
      eligiblePlanId: "one-time",
      requiredBinCount: 2,
      fixedPreTaxSubtotalCents: 4500,
      regularPreTaxSubtotalCents: 6000,
      discountCents: 1500,
      newCustomerOnly: true,
      maximumSuccessfulRedemptionsPerCustomer: 1,
      maximumSuccessfulRedemptionsPerServiceAddress: 1,
      redeemThroughLocalDate: "2026-09-01",
      businessTimeZone: "America/New_York",
      stackableWithReferral: false,
      stackableWithOtherPromotions: false,
      normalizedCase: "upper",
    },
  },
  operations: {
    cleaningDayRule: "next-calendar-day-after-trash-collection",
    holidayAdjustedCollectionMovesCleaningDay: true,
    returnToDesignatedStorageLocationIncluded: true,
    failedRecurringPaymentGraceDays: 7,
    portalRemainsAvailableDuringPaymentFailure: true,
    recoveryRouteRule: "next-normal-eligible-route-day",
    specialRecoveryTripAllowed: false,
  },
  release: {
    stripeModeUntilOwnerApproval: "test",
    liveSignupEnabled: false,
    productionDeploymentApproved: false,
  },
} as const;

export type BinCleaningLaunchConfig = typeof BIN_CLEANING_LAUNCH_CONFIG;
