import assert from "node:assert/strict";
import test from "node:test";
import {
  BIN_CLEANING_LAUNCH_CONFIG,
  ONE45_PROMO_CODE,
} from "../src/lib/bin-cleaning-launch-config.ts";

test("ONE45 is the locked public new-customer campaign code", () => {
  const campaign = BIN_CLEANING_LAUNCH_CONFIG.discounts.one45;

  assert.equal(BIN_CLEANING_LAUNCH_CONFIG.configVersion, "2026-08-04-launch-rules-v2");
  assert.equal(ONE45_PROMO_CODE, "ONE45");
  assert.equal(campaign.code, "ONE45");
  assert.equal(campaign.publiclyAdvertisedOnGeneralWebsite, true);
  assert.equal(
    campaign.redemptionMethod,
    "customer-enters-promo-code-at-signup-or-checkout",
  );
  assert.equal(campaign.eligiblePlanId, "one-time");
  assert.equal(campaign.requiredBinCount, 2);
  assert.equal(campaign.fixedPreTaxSubtotalCents, 4500);
  assert.equal(campaign.regularPreTaxSubtotalCents, 6000);
  assert.equal(campaign.discountCents, 1500);
  assert.equal(campaign.newCustomerOnly, true);
  assert.equal(campaign.establishedCustomersEligible, false);
  assert.equal(campaign.redeemThroughLocalDate, "2026-09-01");
  assert.equal(campaign.businessTimeZone, "America/New_York");
  assert.equal(campaign.maximumSuccessfulRedemptionsPerCustomer, 1);
  assert.equal(campaign.maximumSuccessfulRedemptionsPerServiceAddress, 1);
  assert.equal(campaign.stackableWithReferral, false);
  assert.equal(campaign.stackableWithOtherPromotions, false);
});

test("launch discounts remain mutually exclusive and single-use", () => {
  assert.equal(BIN_CLEANING_LAUNCH_CONFIG.discounts.selectionLimit, 1);
  assert.equal(
    BIN_CLEANING_LAUNCH_CONFIG.discounts.promoAndReferralStackingAllowed,
    false,
  );
  assert.equal(
    BIN_CLEANING_LAUNCH_CONFIG.discounts.new25.stackableWithReferral,
    false,
  );
  assert.equal(
    BIN_CLEANING_LAUNCH_CONFIG.discounts.new25.maximumSuccessfulRedemptionsPerCustomer,
    1,
  );
});

test("launch operations preserve the approved route and payment rules", () => {
  const operations = BIN_CLEANING_LAUNCH_CONFIG.operations;

  assert.equal(
    operations.cleaningDayRule,
    "next-calendar-day-after-trash-collection",
  );
  assert.equal(operations.returnToDesignatedStorageLocationIncluded, true);
  assert.equal(operations.failedRecurringPaymentGraceDays, 7);
  assert.equal(operations.portalRemainsAvailableDuringPaymentFailure, true);
  assert.equal(operations.recoveryRouteRule, "next-normal-eligible-route-day");
  assert.equal(operations.specialRecoveryTripAllowed, false);
});
