import { serviceRoleDatabaseRequest } from "@/lib/supabase/server";
import { stripePost } from "@/lib/stripe/server";

type RewardToArm = {
  credit_id: string;
  customer_id: string;
  amount_cents: number;
  reward_percent: 25 | 50;
  stripe_subscription_id: string;
  stripe_coupon_id: string;
};

type StripeCoupon = { id: string; livemode: boolean };
type StripeSubscription = { id: string; livemode: boolean };

async function rpc<T = unknown>(path: string, body: Record<string, unknown>) {
  return serviceRoleDatabaseRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function rewardRows(limit: number) {
  return rpc<RewardToArm[]>("rpc/stripe_referral_rewards_to_arm", {
    p_limit: Math.max(1, Math.min(limit, 100)),
  });
}

async function armReward(reward: RewardToArm) {
  if (!Number.isSafeInteger(reward.amount_cents) || reward.amount_cents <= 0) {
    throw new Error("Referral reward amount is invalid");
  }
  if (!/^sub_/.test(reward.stripe_subscription_id)) {
    throw new Error("Referral reward Stripe subscription is invalid");
  }
  if (!/^ADSREF-[0-9a-f]{32}-[0-9]{1,10}$/i.test(reward.stripe_coupon_id)) {
    throw new Error("Referral reward Stripe coupon id is invalid");
  }

  const coupon = await stripePost<StripeCoupon>(
    "coupons",
    {
      id: reward.stripe_coupon_id,
      duration: "once",
      amount_off: reward.amount_cents,
      currency: "usd",
      name: `ADS Referral Reward — ${reward.reward_percent}% of Monthly bin cleaning`,
      "metadata[ads_referral_credit_id]": reward.credit_id,
      "metadata[ads_referral_reward_percent]": reward.reward_percent,
      "metadata[ads_referral_reward_cents]": reward.amount_cents,
      "metadata[ads_environment]": "test",
    },
    `ads-referral-credit:${reward.credit_id}:${reward.amount_cents}:coupon`,
  );
  if (coupon.livemode || coupon.id !== reward.stripe_coupon_id) {
    throw new Error("Stripe returned an unsafe referral coupon");
  }

  const subscription = await stripePost<StripeSubscription>(
    `subscriptions/${reward.stripe_subscription_id}`,
    {
      "discounts[0][coupon]": reward.stripe_coupon_id,
      "metadata[ads_referral_credit_id]": reward.credit_id,
      "metadata[ads_referral_reward_percent]": reward.reward_percent,
      "metadata[ads_referral_reward_cents]": reward.amount_cents,
      "metadata[ads_referral_coupon_id]": reward.stripe_coupon_id,
      "metadata[ads_environment]": "test",
    },
    `ads-referral-credit:${reward.credit_id}:${reward.amount_cents}:subscription`,
  );
  if (subscription.livemode || subscription.id !== reward.stripe_subscription_id) {
    throw new Error("Stripe returned an unsafe referral subscription update");
  }

  await rpc("rpc/mark_stripe_referral_reward_armed", {
    p_credit_id: reward.credit_id,
    p_stripe_subscription_id: reward.stripe_subscription_id,
    p_stripe_coupon_id: reward.stripe_coupon_id,
  });
}

export async function armAvailableStripeReferralRewards(limit = 50) {
  const rewards = await rewardRows(limit);
  let armed = 0;
  const failures: { creditId: string; error: string }[] = [];

  for (const reward of rewards) {
    try {
      await armReward(reward);
      armed += 1;
    } catch (error) {
      failures.push({
        creditId: reward.credit_id,
        error: error instanceof Error ? error.message : "Unknown Stripe referral reward error",
      });
    }
  }

  return { examined: rewards.length, armed, failures };
}

export async function clearStripeReferralRewardState(subscriptionId: string, creditId: string) {
  if (!/^sub_/.test(subscriptionId) || !/^[0-9a-f-]{36}$/i.test(creditId)) return;
  await stripePost<StripeSubscription>(
    `subscriptions/${subscriptionId}`,
    {
      discounts: "",
      "metadata[ads_referral_credit_id]": "",
      "metadata[ads_referral_reward_percent]": "",
      "metadata[ads_referral_reward_cents]": "",
      "metadata[ads_referral_coupon_id]": "",
    },
    `ads-referral-credit:${creditId}:clear`,
  );
}
