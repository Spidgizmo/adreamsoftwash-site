import type { Metadata } from "next";
import Link from "next/link";
import { BinCleaningCalculator } from "@/components/BinCleaningCalculator";
import { Container } from "@/components/Container";
import {
  BinCleaningHeroGraphic,
  BubbleField,
  WaveDivider,
} from "@/components/MarketingVisuals";
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
    "Select a cleaning frequency and tell us how many trash and recycling bins you have.",
  ],
  [
    "2",
    "We align the route",
    "When recycling is included, service waits for an eligible recycling collection so both carts are expected to be empty.",
  ],
  [
    "3",
    "We clean & return",
    "We clean, document, and return the bins to your designated storage location.",
  ],
];

const FAQS = [
  [
    "Do you clean year-round?",
    "Yes. ADS Bin Cleaning is designed as a year-round service. Scheduling remains subject to safe operating conditions and future service confirmation.",
  ],
  [
    "Why might my first cleaning be later than my next trash pickup?",
    "When your service includes a recycling cart that is collected every other week, ADS aligns the cleaning with the next verified recycling collection so both carts are expected to be empty and available together.",
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
      <section className="marketing-hero text-white">
        <BubbleField />
        <Container>
          <div className="relative z-10 grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
                A service from American Dream Softwash
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Cleaner bins.
                <br />
                <span className="text-cyan-200">A fresher routine.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-sky-100">
                Interior and exterior trash and recycling bin cleaning, careful
                service documentation, and included return to your designated
                storage location.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#plans"
                  className="rounded-xl bg-red-600 px-6 py-3 text-center font-black text-white shadow-xl shadow-red-950/30 transition hover:-translate-y-0.5 hover:bg-red-700 hover:text-white"
                >
                  Explore plans
                </Link>
                <Link
                  href="/bin-cleaning/signup"
                  className="rounded-xl border border-cyan-200/70 bg-white px-6 py-3 text-center font-black text-[#071b3b] shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                >
                  Sign Up
                </Link>
              </div>
              <div className="mt-7 grid max-w-2xl gap-3 text-sm font-semibold text-sky-100 sm:grid-cols-3">
                <span>✓ Clean & deodorize</span>
                <span>✓ Document service</span>
                <span>✓ Return bins after cleaning</span>
              </div>
              <p className="mt-5 text-sm text-slate-300">
                Signup is available in the staging test environment; real payments remain disabled.
              </p>
            </div>

            <BinCleaningHeroGraphic />
          </div>
        </Container>
        <WaveDivider />
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white">
        <div
          aria-hidden="true"
          className="absolute -right-12 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-white/10 blur-3xl"
        />
        <Container>
          <div className="relative grid items-center gap-6 py-9 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-100">
                New-customer two-bin special
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                One-Time Cleaning for 2 bins: $45
              </h2>
              <p className="mt-3 max-w-3xl leading-7 text-red-50">
                Use promo code <strong>{ONE45_PROMO_CODE}</strong>. One
                successful use per customer. Established customers and future
                One-Time cleanings use the regular price. This offer does not
                expire. Before tax. Cannot be combined with another promotion
                or referral discount.
              </p>
            </div>
            <Link
              href={`/bin-cleaning/signup?plan=one-time&bins=2&promo=${ONE45_PROMO_CODE}`}
              className="rounded-xl bg-white px-6 py-3 text-center font-black text-red-700 shadow-xl shadow-red-950/25 transition hover:-translate-y-0.5 hover:bg-red-50"
            >
              Sign Up with ONE45
            </Link>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-[#071b3b] text-white">
        <div
          aria-hidden="true"
          className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
        />
        <Container>
          <div className="relative py-16">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
              Simple from curb to clean
            </p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              How it works
            </h2>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {STEPS.map(([number, title, description]) => (
                <article
                  key={number}
                  className="rounded-3xl border border-white/15 bg-white/5 p-7 shadow-xl shadow-black/15 backdrop-blur"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-300 font-black text-[#071b3b] shadow-lg shadow-sky-950/30">
                    {number}
                  </span>
                  <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-sky-100">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section id="plans" className="section-glow scroll-mt-24">
        <Container>
          <div className="py-16 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
                Plans & pricing
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Sign up for your bin cleaning
              </h2>
              <p className="mt-4 text-lg leading-8 text-zinc-700">
                Choose the service plan that works best for your household and tell us how many bins you have. Promo and referral codes are entered on the signup form.
              </p>
            </div>
            <div className="mt-9 rounded-3xl border border-brand-200 bg-white p-4 shadow-2xl shadow-brand-950/10 sm:p-7">
              <BinCleaningCalculator />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container>
          <div className="grid gap-12 py-16 md:py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-700">
                Standard cleaning
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                A thorough clean, inside and out
              </h2>
              <p className="mt-5 leading-7 text-zinc-700">
                Standard service combines hands-on cleaning steps with
                responsible wastewater handling and clear before-and-after
                documentation.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {BIN_CLEANING_STANDARD_SERVICE.map((item, index) => (
                  <li
                    key={item}
                    className="flex gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm font-semibold shadow-sm"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${
                        index % 2 === 1 ? "bg-red-600" : "bg-brand-700"
                      }`}
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] bg-[#071b3b] p-5 shadow-2xl shadow-slate-950/20 sm:p-7">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-sky-300/60 bg-white/5 p-6 text-center font-black text-sky-100">
                  Original ADS
                  <br />
                  before photo
                  <br />
                  coming later
                </div>
                <div className="mt-10 flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-cyan-200/60 bg-sky-500/15 p-6 text-center font-black text-cyan-100">
                  Original ADS
                  <br />
                  after photo
                  <br />
                  coming later
                </div>
              </div>
              <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                No stock bin-cleaning photos will be presented as ADS work.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-slate-100">
        <Container>
          <div className="grid gap-6 py-16 lg:grid-cols-2">
            <article className="rounded-3xl border border-brand-200 bg-white p-7 shadow-xl shadow-slate-950/10">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                Get ready
              </p>
              <h2 className="mt-2 text-2xl font-black">Prepare for service</h2>
              <p className="mt-4 leading-7 text-zinc-700">
                Bins should be empty, accessible, and free of loose trash and
                personal property. Keep the route to the bins and designated
                return location clear. Complete preparation instructions will
                be provided before service.
              </p>
            </article>
            <article className="rounded-3xl border border-red-200 bg-red-50 p-7 shadow-xl shadow-red-950/10">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-red-700">
                Safety first
              </p>
              <h2 className="mt-2 text-2xl font-black">Prohibited materials</h2>
              <p className="mt-4 leading-7 text-zinc-700">
                Do not present bins containing hazardous chemicals, paint,
                medical waste, hot ashes, sharp or dangerous items, or other
                unsafe materials.
              </p>
            </article>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#075ca8] via-[#0b2a57] to-[#071b3b] text-white">
        <BubbleField className="opacity-45" />
        <Container>
          <div className="relative z-10 grid items-center gap-8 py-16 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
                Monthly customers
              </p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Give friends 50%. Earn 50% first, then 25%.
              </h2>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-sky-100">
                A qualifying new Monthly residential customer receives 50% off
                the eligible base price of their first cleaning. Your first
                qualified referral earns 50% off one eligible Monthly base
                cleaning; each later qualified referral earns 25% off one.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                Rewards apply one per invoice and do not stack. Additional-bin
                charges, taxes, qualification, review, expiration, and
                anti-fraud rules apply.
              </p>
            </div>
            <Link
              href="/bin-cleaning/signup"
              className="rounded-xl bg-white px-6 py-3 text-center font-black text-[#071b3b] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              Sign Up
            </Link>
          </div>
        </Container>
      </section>

      <section className="bg-white">
        <Container>
          <div className="py-16 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
                Questions before signup
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <div className="mt-9 grid gap-4 lg:grid-cols-2">
              {FAQS.map(([question, answer]) => (
                <details
                  key={question}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-slate-950/5 open:border-brand-300 open:bg-brand-50"
                >
                  <summary className="cursor-pointer font-black marker:text-red-600">
                    {question}
                  </summary>
                  <p className="mt-4 text-sm leading-6 text-zinc-700">{answer}</p>
                </details>
              ))}
            </div>
            <div className="relative mt-12 overflow-hidden rounded-[2rem] bg-gradient-to-r from-red-700 via-red-600 to-[#075ca8] p-8 text-center text-white shadow-2xl shadow-red-950/20 sm:p-12">
              <BubbleField className="opacity-35" />
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-white">
                  Ready for a cleaner routine?
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-white/90">
                  Choose your plan, enter your service details, and submit your ADS Bin Cleaning signup. Real payments remain disabled in staging.
                </p>
                <Link
                  href="/bin-cleaning/signup"
                  className="mt-7 inline-flex rounded-xl bg-white px-7 py-3 font-black text-red-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
