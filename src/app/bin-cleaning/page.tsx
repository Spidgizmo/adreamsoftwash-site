import type { Metadata } from "next";
import Link from "next/link";
import { BinCleaningCalculator } from "@/components/BinCleaningCalculator";
import { Container } from "@/components/Container";
import {
  BIN_CLEANING_STANDARD_SERVICE,
  ONE45_PROMO_CODE,
} from "@/lib/bin-cleaning-plans";

export const metadata: Metadata = {
  title: "ADS Bin Cleaning",
  description:
    "Explore trash and recycling bin cleaning plans from ADS Bin Cleaning, part of American Dream Softwash.",
};

const STEPS = [
  [
    "1",
    "Choose a plan",
    "Select a cleaning frequency and tell us how many bins you have.",
  ],
  [
    "2",
    "Prepare your bins",
    "Leave emptied bins accessible after collection, following the preparation guidance provided before service.",
  ],
  [
    "3",
    "We clean & return",
    "We clean, document, and return bins to your designated storage location.",
  ],
];

const FAQS = [
  [
    "Do you clean year-round?",
    "Yes. ADS Bin Cleaning is designed as a year-round service. Scheduling remains subject to safe operating conditions and future service confirmation.",
  ],
  [
    "When should I set out my bins?",
    "Bins should be emptied and accessible after collection. We will provide complete service-day instructions when online signup becomes available.",
  ],
  [
    "What should be removed?",
    "Remove trash, loose debris, and personal items. Do not leave prohibited materials such as hazardous chemicals, paint, medical waste, hot ashes, or other unsafe contents.",
  ],
  [
    "Is bin return included?",
    "Yes. Returning cleaned bins to the designated storage location is included, along with before-and-after documentation language in the service record.",
  ],
  [
    "Is this the same as the exterior-cleaning quote?",
    "No. ADS Bin Cleaning has its own dedicated signup experience and remains separate from the Lavo exterior-cleaning quote flow.",
  ],
];

export default function BinCleaningPage() {
  return (
    <main className="overflow-hidden bg-white">
      <section className="relative border-b border-brand-200 bg-gradient-to-br from-brand-50 via-white to-sky-100">
        <Container>
          <div className="grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[.18em] text-brand-700">
                A service from American Dream Softwash
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Cleaner bins.
                <br />
                <span className="text-brand-700">A fresher curb.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
                ADS Bin Cleaning provides convenient interior and exterior trash
                and recycling bin cleaning, careful documentation, and included
                return to your designated storage location.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#plans"
                  className="rounded-lg bg-brand-700 px-6 py-3 text-center font-bold text-white hover:bg-brand-800"
                >
                  Explore plans
                </Link>
                <Link
                  href="/bin-cleaning/signup"
                  className="rounded-lg border border-brand-300 bg-white px-6 py-3 text-center font-bold text-zinc-900 hover:bg-brand-50"
                >
                  Preview signup
                </Link>
              </div>
              <p className="mt-4 text-sm text-zinc-600">
                Signup and checkout are not yet activated
              </p>
            </div>
            <div
              aria-label="Bin cleaning photography placeholder"
              className="relative min-h-80 rounded-[2rem] border border-brand-200 bg-brand-800 p-8 text-white shadow-2xl"
            >
              <div className="absolute inset-5 rounded-[1.5rem] border border-dashed border-white/40" />
              <div className="relative flex min-h-64 flex-col items-center justify-center text-center">
                <span aria-hidden="true" className="text-7xl">
                  ♻
                </span>
                <p className="mt-5 text-xl font-bold text-white">
                  Original ADS Bin Cleaning photos coming soon.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-red-200 bg-red-50">
        <Container>
          <div className="grid items-center gap-5 py-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-red-700">
                New-customer two-bin special
              </p>
              <h2 className="mt-1 text-3xl font-black text-zinc-950">
                One-Time Cleaning for 2 bins: $45
              </h2>
              <p className="mt-2 max-w-3xl text-zinc-700">
                Use promo code <strong>{ONE45_PROMO_CODE}</strong>. One
                successful use per customer. Established customers and future
                One-Time cleanings use the regular price. Valid through
                September 1, 2026. Before tax. Cannot be combined with another
                promotion or referral discount.
              </p>
            </div>
            <Link
              href={`/bin-cleaning/signup?plan=one-time&bins=2&promo=${ONE45_PROMO_CODE}`}
              className="rounded-lg bg-red-700 px-6 py-3 text-center font-black text-white hover:bg-red-800"
            >
              Preview ONE45
            </Link>
          </div>
        </Container>
      </section>

      <section className="bg-zinc-950 text-white">
        <Container>
          <div className="py-14">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-300">
              Simple from curb to clean
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">How it works</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {STEPS.map(([n, t, d]) => (
                <article
                  key={n}
                  className="rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-black">
                    {n}
                  </span>
                  <h3 className="mt-4 text-xl font-bold text-white">{t}</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{d}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="plans" className="scroll-mt-24 bg-brand-50">
        <Container>
          <div className="py-14 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
                Plans & pricing
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                Build your bin-cleaning estimate
              </h2>
              <p className="mt-3 text-zinc-700">
                Choose the plan that works best for your household. Enter an
                advertised promo code to preview an eligible offer.
              </p>
            </div>
            <div className="mt-8 rounded-3xl border border-brand-200 bg-white p-4 shadow-sm sm:p-7">
              <BinCleaningCalculator enablePromoCode />
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="grid gap-10 py-14 md:py-20 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-brand-700">
                Standard cleaning
              </p>
              <h2 className="mt-2 text-3xl font-black">
                A thorough clean, inside and out
              </h2>
              <p className="mt-4 leading-7 text-zinc-700">
                Our standard service combines hands-on cleaning steps with
                responsible wastewater handling and clear before-and-after
                documentation.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {BIN_CLEANING_STANDARD_SERVICE.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-xl bg-brand-50 p-4 text-sm font-semibold"
                  >
                    <span aria-hidden="true" className="text-brand-700">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-brand-300 bg-sky-50 p-6 text-center font-bold text-brand-800">
                Before
                <br />
                photo placeholder
              </div>
              <div className="mt-10 flex min-h-52 items-center justify-center rounded-3xl border border-dashed border-brand-300 bg-brand-100 p-6 text-center font-bold text-brand-800">
                After
                <br />
                photo placeholder
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50">
        <Container>
          <div className="grid gap-6 py-14 lg:grid-cols-2">
            <article className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">Prepare for service</h2>
              <p className="mt-3 text-zinc-700">
                Bins should be empty, accessible, and free of loose trash and
                personal property. Keep the route to the bins and designated
                return location clear. Complete preparation instructions will
                be provided before service.
              </p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-2xl font-black">Prohibited materials</h2>
              <p className="mt-3 text-zinc-700">
                Do not present bins containing hazardous chemicals, paint,
                medical waste, hot ashes, sharp or dangerous items, or other
                unsafe materials.
              </p>
            </article>
          </div>
        </Container>
      </section>

      <section className="bg-brand-800 text-white">
        <Container>
          <div className="grid items-center gap-8 py-14 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-brand-200">
                Monthly customers
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Share 50%. Get 50%.
              </h2>
              <p className="mt-3 max-w-3xl text-brand-50">
                Eligible Monthly residential subscribers can share their
                permanent referral code. A qualifying new customer gets 50% off
                the eligible base price of their first regular Monthly cleaning,
                and the referrer can earn 50% of their own next eligible Monthly
                base cleaning after qualification and review.
              </p>
              <p className="mt-3 text-xs text-brand-200">
                Monthly plan only. Program qualifications, exclusions, review
                hold, stacking, expiration, and anti-fraud rules apply.
              </p>
            </div>
            <Link
              href="/bin-cleaning/signup"
              className="rounded-lg bg-white px-6 py-3 text-center font-bold text-brand-800 hover:bg-brand-50"
            >
              Preview the flow
            </Link>
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <div className="py-14 md:py-20">
            <h2 className="text-3xl font-black">Frequently asked questions</h2>
            <div className="mt-7 grid gap-3 lg:grid-cols-2">
              {FAQS.map(([q, a]) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <summary className="cursor-pointer font-bold marker:text-brand-700">
                    {q}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-zinc-700">{a}</p>
                </details>
              ))}
            </div>
            <div className="mt-12 rounded-3xl bg-brand-50 p-8 text-center sm:p-12">
              <h2 className="text-3xl font-black">Ready for a cleaner routine?</h2>
              <p className="mx-auto mt-3 max-w-2xl text-zinc-700">
                Review the upcoming ADS Bin Cleaning signup experience. No
                account, payment, or customer record will be created in this
                phase.
              </p>
              <Link
                href="/bin-cleaning/signup"
                className="mt-6 inline-flex rounded-lg bg-brand-700 px-7 py-3 font-bold text-white hover:bg-brand-800"
              >
                Preview ADS Bin Cleaning signup
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
