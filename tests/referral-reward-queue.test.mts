import assert from "node:assert/strict";
import test from "node:test";
import {
  automaticReferralDiscountForInvoice,
  nextReferralReward,
  referralRewardCents,
  rewardPercentForLifetimeReferral,
  type QueuedReferralReward,
} from "../src/lib/bin-cleaning/referral-reward-queue.ts";

function reward(sequence: number): QueuedReferralReward {
  const day = String(sequence).padStart(2, "0");
  return {
    id: `reward-${sequence}`,
    reward_percent: rewardPercentForLifetimeReferral(sequence),
    earned_at: `2026-01-${day}T12:00:00.000Z`,
    expires_at: `2027-01-${day}T12:00:00.000Z`,
  };
}

test("first lifetime referral is 50 percent and every later referral is 25 percent", () => {
  assert.equal(rewardPercentForLifetimeReferral(1), 50);
  for (let sequence = 2; sequence <= 10; sequence += 1) {
    assert.equal(rewardPercentForLifetimeReferral(sequence), 25);
  }
});

test("monthly referral reward applies only to the base cleaning", () => {
  assert.equal(referralRewardCents(2000, 50), 1000);
  assert.equal(referralRewardCents(2000, 25), 500);
});

test("billing automatically chooses only the oldest queued reward for an invoice", () => {
  const queuedRewards = Array.from({ length: 10 }, (_, index) => reward(index + 1));
  const result = automaticReferralDiscountForInvoice({
    planId: "monthly",
    monthlyBasePriceCents: 2000,
    regularChargeCents: 2500,
    queuedRewards,
    now: new Date("2026-02-01T12:00:00.000Z"),
  });

  assert.equal(result.reward?.id, "reward-1");
  assert.equal(result.reward?.reward_percent, 50);
  assert.equal(result.discountCents, 1000);
});

test("after the first reward is consumed the next invoice receives exactly one 25 percent reward", () => {
  const queuedRewards = Array.from({ length: 9 }, (_, index) => reward(index + 2));
  const result = automaticReferralDiscountForInvoice({
    planId: "monthly",
    monthlyBasePriceCents: 2000,
    regularChargeCents: 2500,
    queuedRewards,
    now: new Date("2026-02-01T12:00:00.000Z"),
  });

  assert.equal(result.reward?.id, "reward-2");
  assert.equal(result.reward?.reward_percent, 25);
  assert.equal(result.discountCents, 500);
});

test("ten qualified referrals therefore represent one 50 percent month plus nine 25 percent months", () => {
  const percentages = Array.from({ length: 10 }, (_, index) =>
    rewardPercentForLifetimeReferral(index + 1),
  );
  assert.deepEqual(percentages, [50, 25, 25, 25, 25, 25, 25, 25, 25, 25]);
  assert.equal(
    percentages.reduce((total, percent) => total + referralRewardCents(2000, percent), 0),
    5500,
  );
});

test("non-monthly invoices do not consume queued monthly referral rewards", () => {
  const queuedRewards = [reward(1)];
  const result = automaticReferralDiscountForInvoice({
    planId: "quarterly",
    monthlyBasePriceCents: 3500,
    regularChargeCents: 4000,
    queuedRewards,
    now: new Date("2026-02-01T12:00:00.000Z"),
  });
  assert.equal(result.reward, null);
  assert.equal(result.discountCents, 0);
});

test("expired rewards are skipped automatically", () => {
  const expired: QueuedReferralReward = {
    ...reward(1),
    expires_at: "2026-01-15T12:00:00.000Z",
  };
  const current = reward(2);
  assert.equal(
    nextReferralReward([expired, current], new Date("2026-02-01T12:00:00.000Z"))?.id,
    "reward-2",
  );
});
