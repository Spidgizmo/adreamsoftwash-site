import type { Metadata } from "next";
import Link from "next/link";
import { BinCleaningSignupForm } from "@/components/bin-cleaning/BinCleaningSignupForm";
import { Container } from "@/components/Container";
import {
  NEW25_PROMO_CODE,
  ONE45_PROMO_CODE,
  normalizeBinCleaningPromoCode,
  normalizeBinCleaningReferralCode,
  resolveBinCleaningSelection,
} from "@/lib/bin-cleaning-plans";

export const metadata: Metadata = {
  title: "Fictional Signup | ADS Bin Cleaning Staging",
  description:
    "Working fictional-data signup for the protected ADS Bin Cleaning staging environment.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SignupSearchParams = {
  plan?: string | string[];
  bins?: string | string[];
  promo?: string | string[];
  ref?: string | string[];
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<SignupSearchParams>;
}) {
  const query = await searchParams;
  const selection = resolveBinCleaningSelection(query);
  const initialPromoCode = normalizeBinCleaningPromoCode(query.promo);
  const initialReferralCode = normalizeBinCleaningReferralCode(query.ref);

  return (
    <main className="min-h-screen bg-brand-50">
      <Container>
        <div className="py-8 sm:py-12 md:py-16">
          <Link href="/bin-cleaning" className="text-sm font-black text-brand-800">
            ← Back to ADS Bin Cleaning
          </Link>

          <div className="mt-7 max-w-4xl">
            <p className="text-sm font-black uppercase tracking-widest text-brand-800">
              Step 4 staging build
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Working fictional-data signup
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-700">
              Complete the test form on phone or desktop. Drafts, abandoned
              signups, and submitted-but-unpaid signups are recorded for the
              staging CRM. Before payment, the customer creates their own Supabase Auth account; Stripe TEST then handles card entry. If checkout is abandoned, that same account can sign back in later and continue payment. Service activates only after verified Stripe webhook processing.
            </p>
          </div>

          <aside className="mt-7 max-w-4xl rounded-2xl border border-red-200 border-l-4 border-l-red-600 bg-white p-5 text-sm leading-relaxed text-zinc-800 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wider text-red-700">
              Current offers
            </p>
            <p className="mt-2 font-semibold">
              Use code <strong className="text-base font-black text-red-700">{NEW25_PROMO_CODE}</strong> for <strong>25% off your first month</strong> of an eligible new Monthly signup.
            </p>
            <p className="mt-1.5 font-semibold">
              Use code <strong className="text-base font-black text-red-700">{ONE45_PROMO_CODE}</strong> for a <strong>$45 One-Time Cleaning of 2 bins</strong> before tax. One successful use per customer; the current approved offer does not expire.
            </p>
            <p className="mt-2 text-xs font-semibold text-zinc-600 sm:text-sm">
              A valid referral code is separate from a promo code. The form permits one discount type only.
            </p>
          </aside>

          <div className="mt-8">
            <BinCleaningSignupForm
              initialPlanId={selection.planId}
              initialBinCount={selection.binCount}
              initialPromoCode={initialPromoCode}
              initialReferralCode={initialReferralCode}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
