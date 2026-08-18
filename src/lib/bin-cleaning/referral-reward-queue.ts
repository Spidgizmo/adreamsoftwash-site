export type ReferralRewardPercent = 25 | 50;

export type QueuedReferralReward = Readonly<{
  id: string;
  reward_percent: ReferralRewardPercent;
  earned_at: string;
  expires_at: string;
}>;

export function rewardPercentForLifetimeReferral(sequence: number): ReferralRewardPercent {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Referral sequence must be a positive integer");
  }
  return sequence === 1 ? 50 : 25;
}

export function referralRewardCents(
  monthlyChargeCents: number,
  rewardPercent: ReferralRewardPercent,
): number {
  if (!Number.isInteger(monthlyChargeCents) || monthlyChargeCents < 0) {
    throw new Error("Monthly charge must be a non-negative integer");
  }
  return Math.round((monthlyChargeCents * rewardPercent) / 100);
}

export function nextReferralReward(
  rewards: readonly QueuedReferralReward[],
  now = new Date(),
): QueuedReferralReward | null {
  const nowMs = now.getTime();
  return (
    rewards
      .filter((reward) => new Date(reward.expires_at).getTime() > nowMs)
      .slice()
      .sort((left, right) => {
        const earnedDifference =
          new Date(left.earned_at).getTime() - new Date(right.earned_at).getTime();
        return earnedDifference !== 0 ? earnedDifference : left.id.localeCompare(right.id);
      })[0] ?? null
  );
}

export function automaticReferralDiscountForInvoice(args: {
  planId: string | null;
  regularChargeCents: number | null;
  queuedRewards: readonly QueuedReferralReward[];
  now?: Date;
}): Readonly<{
  reward: QueuedReferralReward | null;
  discountCents: number;
}> {
  const { planId, regularChargeCents, queuedRewards, now } = args;

  if (planId !== "monthly" || regularChargeCents == null) {
    return { reward: null, discountCents: 0 };
  }

  const reward = nextReferralReward(queuedRewards, now);
  if (!reward) {
    return { reward: null, discountCents: 0 };
  }

  const rewardValue = referralRewardCents(
    regularChargeCents,
    reward.reward_percent,
  );

  return {
    reward,
    discountCents: Math.min(rewardValue, regularChargeCents),
  };
}
