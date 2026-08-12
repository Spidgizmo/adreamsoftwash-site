import type { CustomerRow } from "@/lib/bin-cleaning/queries";
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

  const [relationships, credits] = await Promise.all([
    databaseRequest<{ status: string }[]>(
      `referral_relationships?referrer_customer_id=eq.${customer.id}&select=status`,
    ).catch(() => []),
    databaseRequest<
      { remaining_cents: number; earned_at: string }[]
    >(
      `referral_credits?customer_id=eq.${customer.id}&status=in.(issued,partially_applied)&remaining_cents=gt.0&select=remaining_cents,earned_at&order=earned_at.asc`,
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
  const availableCreditCents = credits.reduce(
    (sum, credit) => sum + credit.remaining_cents,
    0,
  );

  const firstUsableCredit = credits[0]?.remaining_cents ?? 0;
  const nextAppliedCreditCents =
    planId === "monthly" && regularChargeCents != null
      ? Math.min(firstUsableCredit, basePriceCents, regularChargeCents)
      : 0;

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
    availableCreditCents,
    regularChargeCents,
    nextChargeCents,
    nextAppliedCreditCents,
    nextChargeLabel,
  };
}
