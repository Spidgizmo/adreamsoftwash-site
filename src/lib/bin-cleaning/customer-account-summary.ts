import type { CustomerRow } from "@/lib/bin-cleaning/queries";
import {
  automaticReferralDiscountForInvoice,
  referralRewardCents,
  type QueuedReferralReward,
} from "@/lib/bin-cleaning/referral-reward-queue";
import {
  databaseRequest,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";

const QUALIFIED_REFERRAL_STATUSES = new Set([
  "qualified",
  "credit_issued",
  "credit_applied",
]);

export type CustomerAccountSummary = Readonly<{
  referralCode: string | null;
  submittedReferrals: number;
  qualifiedReferrals: number;
  queuedReferralRewards: number;
  nextReferralRewardPercent: 25 | 50 | null;
  availableCreditCents: number;
  regularChargeCents: number | null;
  nextChargeCents: number | null;
  nextAppliedCreditCents: number;
  nextChargeLabel: string;
}>;

export async function customerAccountSummary(
  customer: CustomerRow,
  binCount: number,
): Promise<CustomerAccountSummary> {
  const subscription = customer.subscriptions[0];
  const version = subscription?.service_plan_versions;
  const planId = version?.service_plans.id ?? null;

  const basePriceCents = version?.base_price_cents ?? 0;
  const includedBins = Math.max(0, version?.bins_included ?? 1);
  const additionalBinPriceCents = Math.max(
    0,
    version?.additional_bin_price_cents ?? 0,
  );
  const regularChargeCents = subscription
    ? basePriceCents +
      Math.max(0, binCount - includedBins) * additionalBinPriceCents
    : null;

  const codeRows = await databaseRequest<{ code: string }[]>(
    `referral_codes?customer_id=eq.${customer.id}&active=eq.true&select=code&limit=1`,
  ).catch(() => []);
  const referralCode = codeRows[0]?.code ?? null;
  const now = new Date();
  const encodedNow = encodeURIComponent(now.toISOString());

  const [relationships, credits] = await Promise.all([
    databaseRequest<{ status: string }[]>(
      `referral_relationships?referrer_customer_id=eq.${customer.id}&select=status`,
    ).catch(() => []),
    databaseRequest<QueuedReferralReward[]>(
      `referral_credits?customer_id=eq.${customer.id}&status=eq.issued&expires_at=gt.${encodedNow}&select=id,reward_percent,earned_at,expires_at&order=referral_sequence.asc`,
    ).catch(() => []),
  ]);

  let submittedReferrals = 0;
  if (referralCode) {
    const safeCode = encodeURIComponent(referralCode);
    const submitted = await serviceRoleDatabaseRequest<{ id: string }[]>(
      `signup_leads?referral_code=eq.${safeCode}&status=eq.submitted_unpaid&select=id`,
    ).catch(() => []);
    submittedReferrals = submitted.length;
  }

  const qualifiedReferrals = relationships.filter((relationship) =>
    QUALIFIED_REFERRAL_STATUSES.has(relationship.status),
  ).length;

  const availableCreditCents =
    planId === "monthly"
      ? credits.reduce(
          (sum, credit) =>
            sum + referralRewardCents(basePriceCents, credit.reward_percent),
          0,
        )
      : 0;

  const nextReward = automaticReferralDiscountForInvoice({
    planId,
    monthlyBasePriceCents: basePriceCents,
    regularChargeCents,
    queuedRewards: credits,
    now,
  });
  const nextAppliedCreditCents = nextReward.discountCents;

  const nextChargeCents =
    planId === "one-time" || regularChargeCents == null
      ? null
      : Math.max(0, regularChargeCents - nextAppliedCreditCents);

  const nextChargeLabel =
    planId === "monthly"
      ? "Next month estimate"
      : planId === "quarterly" || planId === "twice-yearly"
        ? "Next renewal estimate"
        : "No recurring charge";

  return {
    referralCode,
    submittedReferrals,
    qualifiedReferrals,
    queuedReferralRewards: credits.length,
    nextReferralRewardPercent: nextReward.reward?.reward_percent ?? null,
    availableCreditCents,
    regularChargeCents,
    nextChargeCents,
    nextAppliedCreditCents,
    nextChargeLabel,
  };
}
