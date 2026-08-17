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
          <ManualCustomerSetup />
        </div>
      </Container>
    </main>
  );
}
