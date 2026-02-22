import { Container } from "@/components/Container";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "FAQ",
  description: `Answers to common questions about soft washing, roof cleaning, and exterior cleaning in ${SITE.serviceArea}.`,
};

const FAQS = [
  {
    q: "What is soft washing?",
    a: "Soft washing is a low-pressure cleaning method that uses the right solution and dwell time to safely remove algae, mold, mildew, and grime. It’s ideal for roofs and many siding types where high pressure can cause damage.",
  },
  {
    q: "Is soft washing safe for my roof?",
    a: "Yes—when done correctly. Soft washing is designed to clean shingles safely by treating the organic growth (like algae) instead of blasting it off with high pressure. We use methods matched to the surface.",
  },
  {
    q: "Do you use high pressure at all?",
    a: "Only where it’s appropriate. Flat concrete can often handle higher pressure, but roofs and many exterior materials should not. We choose the safest method for each surface.",
  },
  {
    q: "How long does a roof or house wash take?",
    a: "Most jobs are completed in a single visit. Timing depends on the size of the home, the level of buildup, and what surfaces are being cleaned. We’ll give you a clear plan and time window when we schedule.",
  },
  {
    q: "How often should I get this done, and how long does it last?",
    a: "Most homeowners do a house wash every 12–24 months. Roof soft washing usually lasts 2–5 years on average, depending on shade, tree cover, and roof exposure (north-facing slopes tend to grow faster). Concrete is often done yearly or every couple years—especially if it gets green or slippery. If you tell us your conditions, we’ll recommend a realistic maintenance schedule.",
  },
  {
    q: "Do you need access to water?",
    a: "Yes—typically an exterior spigot/hose bib. If access is an issue, let us know and we’ll plan around it.",
  },
  {
    q: "Will this harm my plants or landscaping?",
    a: "We take landscaping seriously. We use common-sense protection steps like pre-wetting, controlled application, and thorough rinsing. If you have delicate plants or special concerns, tell us up front.",
  },
  {
    q: "Do you offer free quotes?",
    a: "Yes. Use the contact page to request a quote. For fastest service, call us at (567) 777-7638.",
  },
  {
    q: "What areas do you serve?",
    a: `We serve ${SITE.serviceArea}. If you’re just outside the area, reach out—we’ll let you know what we can do.`,
  },
];

export default function FAQPage() {
  return (
    <main>
      {/* Hero */}
      <section className="border-b border-zinc-200 bg-brand-50">
        <Container>
          <div className="py-14 md:py-16">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
              Frequently Asked Questions
            </h1>

            <p className="mt-3 max-w-3xl text-zinc-700">
              Straight answers about roof cleaning, soft washing, and exterior cleaning. If you don’t see your question,
              reach out—James or Austin will get back to you.
            </p>

            <p className="mt-3 text-sm font-semibold text-zinc-900">
              Call for fastest service:{" "}
              <a className="underline hover:text-brand-800" href={`tel:${SITE.phoneTel}`}>
                {SITE.phoneDisplay}
              </a>
            </p>
          </div>
        </Container>
      </section>

      {/* FAQ content on tinted background */}
      <section className="bg-transparent">
        <Container>
          <div className="py-14">
            <div className="mx-auto max-w-3xl">
              <div className="space-y-3">
                {FAQS.map((item) => (
                  <details key={item.q} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                      <span className="text-base font-bold text-zinc-900">{item.q}</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-brand-50 text-zinc-700 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="mt-3 text-sm leading-relaxed text-zinc-700">{item.a}</div>
                  </details>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="text-lg font-bold text-zinc-900">Still have questions?</div>
                <p className="mt-2 text-sm text-zinc-700">
                  Send a quick message and tell us what you want cleaned. We’ll reply with pricing and availability.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={SITE.quoteUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex rounded-md bg-brand-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
                  >
                    Get a Free Quote
                  </a>
                  <a
                    href={`tel:${SITE.phoneTel}`}
                    className="inline-flex rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-brand-50"
                  >
                    Call {SITE.phoneDisplay}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
