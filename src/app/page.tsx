import Link from "next/link";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Home",
};

const SERVICES = [
  {
    title: "Roof Cleaning (Soft Wash)",
    desc: "Kills algae and lifts staining without high pressure.",
  },
  {
    title: "House Washing",
    desc: "Siding, soffits, trim — clean and bright without damage.",
  },
  {
    title: "Concrete Cleaning",
    desc: "Driveways, walkways, patios — deep clean for curb appeal.",
  },
  {
    title: "Gutter Brightening",
    desc: "Remove “tiger stripes” and restore a clean finish.",
  },
];

const TRUST = [
  {
    title: "Safe process",
    desc: "Soft washing uses low pressure with the right solution and dwell time to clean safely.",
  },
  {
    title: "Clear communication",
    desc: "Up-front pricing, fast replies, and a simple plan from quote to completion.",
  },
  {
    title: "Protect your property",
    desc: "We treat landscaping and surfaces with care and use methods matched to the material.",
  },
];

const WHY_US = [
  {
    title: "Local & accountable",
    desc: "We live here, we work here, and we stand behind the result.",
  },
  {
    title: "Quality work",
    desc: "We take our time where it matters — details, edges, and thorough rinsing.",
  },
  {
    title: "Easy scheduling",
    desc: "Quick quotes and straightforward scheduling that respects your time.",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-brand-50">
        <Container>
          <div className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
            <div>
              <Badge>Licensed • Insured • Free quotes</Badge>

              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900 md:text-5xl">
                Roof Cleaning &amp; Exterior Soft Washing
              </h1>

              <p className="mt-4 text-lg text-zinc-700">
                Safer for shingles. Powerful on algae. We restore curb appeal without the damage risk of
                high pressure on delicate surfaces.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/contact">Get a Free Quote</ButtonLink>
                <ButtonLink href="/services" variant="secondary">
                  View Services
                </ButtonLink>

                <a
                  className="inline-flex items-center rounded-md px-2 py-2 text-sm font-semibold text-zinc-900 hover:underline"
                  href={`tel:${SITE.phoneTel}`}
                >
                  Call {SITE.phoneDisplay}
                </a>
              </div>

              <div className="mt-6 text-sm text-zinc-600">
                Serving {SITE.serviceArea}. {SITE.owners}.
              </div>

              <ul className="mt-6 grid gap-2 text-sm text-zinc-700">
                <li>• Soft wash roof cleaning (shingles, tiles, and more)</li>
                <li>• House washing (siding, soffits, trim)</li>
                <li>• Concrete cleaning (driveways, patios, walkways)</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-zinc-700">Quick estimate</div>
              <p className="mt-2 text-sm text-zinc-600">
                Tell us what you want cleaned and we’ll respond fast with pricing and availability.
              </p>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                  <div className="font-semibold text-zinc-900">Most requested</div>
                  <div className="mt-1">Roof soft wash • House wash • Driveway cleaning • Gutter brightening</div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ButtonLink href="/contact">Start a free quote</ButtonLink>
                  <Link
                    href="/gallery"
                    className="rounded-md border border-zinc-200 bg-white px-5 py-3 text-center text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                  >
                    See before &amp; after photos
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Services preview */}
      <section className="border-t border-zinc-200 bg-white">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">Popular services</h2>
            <p className="mt-2 max-w-3xl text-zinc-700">
              People search for “pressure washing” — and we do that where it’s appropriate. But for roofs and many
              siding types, we use a safer soft-wash method to avoid damage.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map((s) => (
                <div key={s.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-bold text-zinc-900">{s.title}</div>
                  <div className="mt-2 text-sm text-zinc-700">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <ButtonLink href="/services" variant="secondary">
                See all services
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Trust */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">Why homeowners choose us</h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {TRUST.map((x) => (
                <div key={x.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-bold text-zinc-900">{x.title}</div>
                  <p className="mt-2 text-sm text-zinc-700">{x.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Local / About preview */}
      <section className="border-t border-zinc-200 bg-white">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">Local. Reliable. Detail-focused.</h2>
            <p className="mt-2 max-w-3xl text-zinc-700">
              We help homeowners protect their biggest investment. Clean surfaces last longer, look better,
              and make your home feel taken care of.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {WHY_US.map((x) => (
                <div key={x.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-bold text-zinc-900">{x.title}</div>
                  <p className="mt-2 text-sm text-zinc-700">{x.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/about" variant="secondary">
                Learn about us
              </ButtonLink>
              <ButtonLink href="/gallery" variant="secondary">
                View the gallery
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <Container>
          <div className="flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900">Ready to get your exterior cleaned?</h2>
              <p className="mt-2 text-zinc-700">Get a fast quote. Most requests are answered the same day.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contact">Get a Free Quote</ButtonLink>
              <a
                className="rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
                href={`tel:${SITE.phoneTel}`}
              >
                Call {SITE.phoneDisplay}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
