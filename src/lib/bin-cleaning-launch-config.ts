export const ONE45_PROMO_CODE = "ONE45" as const;

export const BIN_CLEANING_LAUNCH_CONFIG = {
  configVersion: "2026-08-05-launch-rules-v4",
  catalogVersion: "2026-08-02-approved-pricing",
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
      maximumSuccessfulRedemptionsPerCustomer: 1,
      stackableWithReferral: false,
    },
    one45: {
      code: ONE45_PROMO_CODE,
      campaignName: "Two-bin one-time new-customer special",
      publiclyAdvertisedOnGeneralWebsite: true,
      redemptionMethod: "customer-enters-promo-code-at-signup-or-checkout",
      eligiblePlanId: "one-time",
      requiredBinCount: 2,
      fixedPreTaxSubtotalCents: 4500,
      regularPreTaxSubtotalCents: 6000,
      discountCents: 1500,
      newCustomerOnly: true,
      establishedCustomersEligible: false,
      maximumSuccessfulRedemptionsPerCustomer: 1,
      maximumSuccessfulRedemptionsPerServiceAddress: 1,
      hasExpiration: false,
      expiresAt: null,
      stackableWithReferral: false,
      stackableWithOtherPromotions: false,
      normalizedCase: "upper",
    },
  },
  operations: {
    trashOnlyCleaningDayRule:
      "next-calendar-day-after-eligible-trash-collection",
    recyclingIncludedCleaningDayRule:
      "next-calendar-day-after-next-verified-recycling-collection",
    recyclingCadenceRequiresAnchorCollectionDate: true,
    recyclingIncludedMayDelayFirstServicePastNextTrashPickup: true,
    differentTrashAndRecyclingWeekdaysRequireStaffReview: true,
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
