import type { Metadata } from "next";
import Link from "next/link";
import { BinCleaningCalculator } from "@/components/BinCleaningCalculator";
import { Container } from "@/components/Container";
import {
  NEW25_PROMO_CODE,
  normalizeBinCleaningPromoCode,
  normalizeBinCleaningReferralCode,
  resolveBinCleaningSelection,
} from "@/lib/bin-cleaning-plans";

export const metadata: Metadata = {
  title: "Signup Preview | ADS Bin Cleaning",
  description: "Preview the planned ADS Bin Cleaning signup experience.",
  robots: { index: false, follow: false },
};

const FIELDS = [
  "Name",
  "Mobile number",
  "Email address",
  "Service address",
  "Trash pickup day",
  "Recycling information",
  "Designated bin-return location",
  "Access instructions",
];

type SignupSearchParams = {
  plan?: string | string[];
  bins?: string | string[];
  promo?: string | string[];
  ref?: string | string[];
};

export default function SignupFoundationPage({
  searchParams,
}: {
  searchParams: SignupSearchParams;
}) {
  const selection = resolveBinCleaningSelection(searchParams);
  const initialPromoCode = normalizeBinCleaningPromoCode(searchParams.promo);
  const initialReferralCode = normalizeBinCleaningReferralCode(searchParams.ref);

  return (
    <main className="bg-brand-50">
      <Container>
        <div className="py-10 md:py-16">
          <Link href="/bin-cleaning" className="text-sm font-bold">
            ← Back to ADS Bin Cleaning
          </Link>

          <div
            role="status"
            className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5"
          >
            <p className="font-black text-amber-950">
              Online signup is coming soon
            </p>
            <p className="mt-1 text-sm text-amber-900">
              This preview cannot submit information or accept payment. Please
              do not enter real customer information.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-brand-300 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-brand-800">
              New Monthly subscriber offer
            </p>
            <p className="mt-1 text-lg font-black text-zinc-950">
              Use code {NEW25_PROMO_CODE} for 25% off your first month.
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Monthly subscriptions only. Later monthly renewals return to the
              regular selected-plan price before tax. Promotional and referral
              discounts cannot be combined.
            </p>
          </div>

          <h1 className="mt-8 text-4xl font-black tracking-tight">
            ADS Bin Cleaning signup preview
          </h1>
          <p className="mt-3 max-w-3xl text-zinc-700">
            See what information you will be able to provide when online signup
            becomes available.
          </p>

          <section
            aria-labelledby="plan-heading"
            className="mt-10 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-7"
          >
            <h2 id="plan-heading" className="sr-only">
              Plan, discount code, and pricing preview
            </h2>
            <BinCleaningCalculator
              showAction={false}
              initialPlanId={selection.planId}
              initialBinCount={selection.binCount}
              enablePromoCode
              initialPromoCode={initialPromoCode}
              enableReferralCode
              initialReferralCode={initialReferralCode}
            />
          </section>

          <section
            aria-labelledby="details-heading"
            className="mt-8 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8"
          >
            <h2 id="details-heading" className="text-2xl font-black">
              Your service details
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Fields are disabled because online signup is not yet available.
            </p>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {FIELDS.map((field) => (
                <label
                  key={field}
                  className="text-sm font-bold text-zinc-800"
                >
                  {field}
                  <input
                    disabled
                    placeholder="Available when signup opens"
                    className="mt-2 h-11 w-full cursor-not-allowed rounded-lg border border-zinc-300 bg-zinc-100 px-3 text-zinc-500 disabled:opacity-100"
                  />
                </label>
              ))}
            </div>
            <div className="mt-6 rounded-xl bg-zinc-100 p-4 text-sm text-zinc-700">
              <strong>Pricing summary:</strong> Choose a plan and bin count
              above, then use either one promotional code or one permanent
              customer referral code. Applicable tax will be calculated from
              the validated service address when online signup becomes
              available.
            </div>
            <button
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-lg bg-zinc-300 px-6 py-3 font-bold text-zinc-600 sm:w-auto"
            >
              Online signup coming soon
            </button>
          </section>
        </div>
      </Container>
    </main>
  );
}
