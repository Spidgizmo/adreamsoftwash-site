import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ButtonLink";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Service Areas",
  description:
    "American Dream Softwash serves Toledo, Perrysburg, Sylvania and surrounding areas. Call (567) 777-7638 for the fastest service.",
};

const PRIMARY_AREAS = ["Toledo", "Perrysburg", "Sylvania"];

const NEARBY_AREAS = [
  "Maumee",
  "Oregon",
  "Rossford",
  "Monclova",
  "Holland",
  "Waterville",
  "Whitehouse",
  "Swanton",
  "Temperance, MI",
  "Lambertville, MI",
];

export default function ServiceAreasPage() {
  return (
    <main>
      {/* Hero */}
      <section className="border-b border-zinc-200 bg-brand-50">
        <Container>
          <div className="py-14 md:py-16">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
              Service Areas
            </h1>

            <p className="mt-3 max-w-3xl text-zinc-700">
              {SITE.name} provides roof cleaning (soft wash), house washing, concrete cleaning, and gutter brightening
              across the Toledo area. If you’re nearby and not sure—reach out.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href={SITE.quoteUrl} target="_blank" rel="noopener noreferrer">Get a Free Quote</ButtonLink>
              <a
                className="inline-flex rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-brand-50"
                href={`tel:${SITE.phoneTel}`}
              >
                Call for fastest service: {SITE.phoneDisplay}
              </a>
            </div>

            <div className="mt-5 text-sm text-zinc-600">
              Based in the Toledo area • Local, accountable, and detail-focused.
            </div>
          </div>
        </Container>
      </section>

      {/* Areas */}
      <section className="bg-transparent">
        <Container>
          <div className="py-14">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Primary */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-900">Primary service areas</h2>
                <p className="mt-2 text-sm text-zinc-700">
                  These are our most common areas for roof and house soft washing.
                </p>

                <ul className="mt-4 grid gap-3">
                  {PRIMARY_AREAS.map((c) => (
                    <li
                      key={c}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
                    >
                      <span className="text-sm font-semibold text-zinc-900">{c}</span>
                      <span className="text-xs font-semibold text-zinc-600">Primary</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 text-sm text-zinc-700">
                  Not sure if you’re included? Send your address and what you want cleaned—we’ll confirm quickly.
                </div>
              </div>

              {/* Nearby */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-900">Nearby areas</h2>
                <p className="mt-2 text-sm text-zinc-700">
                  We often serve surrounding towns depending on schedule.
                </p>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {NEARBY_AREAS.map((c) => (
                    <li key={c} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                      <span className="text-sm font-semibold text-zinc-900">{c}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-xl border border-zinc-200 bg-brand-50 p-4 text-sm text-zinc-700">
                  <div className="font-semibold text-zinc-900">Heads up</div>
                  <div className="mt-1">
                    Travel-based pricing may apply outside our primary area. We’ll always confirm pricing before booking.
                  </div>
                </div>
              </div>
            </div>

            {/* Why this page exists (SEO + trust) */}
            <div className="mt-10 rounded-2xl border border-zinc-200 bg-brand-50 p-6">
              <h2 className="text-xl font-bold text-zinc-900">What we clean</h2>
              <p className="mt-2 max-w-4xl text-sm text-zinc-700">
                Roof algae removal (soft wash), exterior house washing, concrete cleaning, and gutter brightening. We use
                methods matched to the surface so you get a clean result without unnecessary risk.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href="/services" variant="secondary">
                  View Services
                </ButtonLink>
                <ButtonLink href={SITE.quoteUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
                  Request a Quote
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
