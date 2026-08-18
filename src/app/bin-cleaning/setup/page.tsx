import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import { ManualCustomerSetup } from "@/components/bin-cleaning/ManualCustomerSetup";

export const metadata: Metadata = {
  title: "Finish ADS Bin Cleaning Setup | Staging",
  description: "Secure fictional customer setup and Stripe TEST handoff for staff-created ADS Bin Cleaning intake.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default function ManualSetupPage() {
  return (
    <main className="min-h-screen bg-brand-50">
      <Container>
        <div className="py-8 sm:py-12">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-brand-800">ADS Bin Cleaning</p>
              <h1 className="mt-1 text-3xl font-black">Secure customer setup</h1>
            </div>
            <Link href="/bin-cleaning" className="text-sm font-black text-brand-800">ADS Bin Cleaning</Link>
          </div>

          <aside className="mb-6 rounded-2xl border-2 border-brand-300 bg-white p-5 shadow-sm">
            <p className="font-black text-zinc-950">Read the terms before accepting them below.</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">The service and payment terms cover billing, cancellation, preparation, missed or unsafe bins, contamination and extra work, promotions, referrals, service communications, and payment security.</p>
            <Link href="/bin-cleaning/terms" target="_blank" className="mt-3 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-sm font-black text-white hover:bg-brand-600">Read ADS Bin Cleaning Service &amp; Payment Terms →</Link>
          </aside>

          <ManualCustomerSetup />
        </div>
      </Container>
    </main>
  );
}
