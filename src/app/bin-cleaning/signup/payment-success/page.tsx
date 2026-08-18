import Link from "next/link";
import { StripeTestPaymentStatus } from "@/components/bin-cleaning/StripeTestPaymentStatus";

export const dynamic = "force-dynamic";

type Props = Readonly<{
  searchParams: Promise<{ session_id?: string | string[] }>;
}>;

export default async function StripeTestPaymentSuccessPage({ searchParams }: Props) {
  const query = await searchParams;
  const raw = Array.isArray(query.session_id) ? query.session_id[0] : query.session_id;
  const sessionId = typeof raw === "string" ? raw.trim() : "";
  const validTestSession = /^cs_test_[A-Za-z0-9_]+$/.test(sessionId);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="text-sm font-black uppercase tracking-wider text-brand-700">ADS Bin Cleaning · Stripe TEST</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950">Payment return</h1>
      <p className="mt-4 text-base leading-relaxed text-zinc-700">
        Stripe redirected the browser back to ADS. This page does not trust the redirect as proof of payment; service becomes paid only after the signed Stripe webhook is verified and stored.
      </p>

      <div className="mt-8">
        {validTestSession ? (
          <StripeTestPaymentStatus sessionId={sessionId} />
        ) : (
          <div className="rounded-3xl border border-red-300 bg-red-50 p-6 text-red-950 shadow-sm">
            <h2 className="text-2xl font-black">Test Checkout Session is missing</h2>
            <p className="mt-3">No valid Stripe TEST session ID was supplied, so ADS cannot confirm any payment from this page.</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/bin-cleaning/signup" className="rounded-xl bg-brand-700 px-5 py-3 text-center font-black text-white">Return to signup</Link>
        <Link href="/bin-cleaning/login" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-center font-black text-zinc-950">Customer login</Link>
      </div>
    </main>
  );
}
