import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ResumePaymentButton } from "@/components/bin-cleaning/ResumePaymentButton";
import { Container } from "@/components/Container";
import {
  PUBLIC_BIN_CLEANING_PLANS,
  formatCurrency,
} from "@/lib/bin-cleaning-plans";
import {
  currentAuthenticatedUser,
  currentSession,
  serviceRoleDatabaseRequest,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Complete Payment | ADS Bin Cleaning Staging",
  description: "Resume secure Stripe TEST payment for a saved ADS Bin Cleaning signup.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

type PendingSignup = {
  id: string;
  full_name: string | null;
  plan_id: string;
  bin_count: number;
  estimated_first_charge_cents: number | null;
  submitted_at: string | null;
};

type CompletePaymentSearchParams = {
  checkout?: string;
};

export default async function CompletePaymentPage({
  searchParams,
}: {
  searchParams: Promise<CompletePaymentSearchParams>;
}) {
  const query = await searchParams;
  const authenticatedUser = await currentAuthenticatedUser();
  if (!authenticatedUser) {
    redirect("/bin-cleaning/login?expired=1");
  }

  const pending = await serviceRoleDatabaseRequest<PendingSignup[]>(
    `signup_leads?auth_user_id=eq.${encodeURIComponent(authenticatedUser.id)}&status=eq.submitted_unpaid&is_test=eq.true&select=id,full_name,plan_id,bin_count,estimated_first_charge_cents,submitted_at&order=submitted_at.desc&limit=1`,
  ).catch(() => []);
  const signup = pending[0];

  if (!signup) {
    const session = await currentSession();
    if (session?.role === "customer") redirect("/bin-cleaning/portal");
    redirect("/bin-cleaning/login?unauthorized=1");
  }

  const plan = PUBLIC_BIN_CLEANING_PLANS.find((item) => item.id === signup.plan_id);
  const amount = signup.estimated_first_charge_cents;

  return (
    <main className="min-h-screen bg-brand-50">
      <Container>
        <div className="mx-auto max-w-2xl py-10 sm:py-16">
          <p className="text-sm font-black uppercase tracking-widest text-brand-800">
            ADS Bin Cleaning
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950">
            Your signup is saved — payment is still due
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-700">
            {signup.full_name ? `${signup.full_name}, your` : "Your"} customer account and service information were saved, but Stripe has not verified payment yet. You can return here after leaving checkout and finish without creating another account.
          </p>

          {query.checkout === "canceled" ? (
            <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
              Payment was not completed. Nothing was activated or charged by ADS. Use the button below whenever you are ready to return to secure Stripe TEST checkout.
            </div>
          ) : null}

          <section className="mt-7 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-zinc-500">Plan</div>
                <div className="mt-1 font-black text-zinc-950">{plan?.name ?? signup.plan_id}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-zinc-500">Bins</div>
                <div className="mt-1 font-black text-zinc-950">{signup.bin_count}</div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-zinc-500">Amount due now</div>
                <div className="mt-1 font-black text-zinc-950">{amount === null ? "See checkout" : formatCurrency(amount)}</div>
              </div>
            </div>

            <div className="mt-7 border-t border-zinc-200 pt-6">
              <ResumePaymentButton />
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                Your browser return cannot activate service by itself. ADS opens the customer portal only after the signed Stripe webhook and trusted database state verify payment.
              </p>
            </div>
          </section>

          <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold">
            <Link href="/bin-cleaning" className="text-brand-800 underline underline-offset-2">
              ADS Bin Cleaning home
            </Link>
            <form action="/api/bin-cleaning/auth/logout" method="post">
              <button type="submit" className="text-zinc-700 underline underline-offset-2">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </Container>
    </main>
  );
}
