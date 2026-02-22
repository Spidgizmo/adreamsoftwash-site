import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "About",
  description: "Local father-and-son soft washing team serving the Toledo area.",
};

export default function AboutPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-brand-50">
        <Container>
          <div className="py-14">
            <Badge>Local • Family-run • Accountable</Badge>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-900">
              About {SITE.name}
            </h1>

            <p className="mt-4 max-w-3xl text-lg text-zinc-700">
              {SITE.owners}. We built this business on straightforward communication, safe cleaning methods, and results
              that make homeowners proud to pull into the driveway.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={SITE.quoteUrl} target="_blank" rel="noopener noreferrer">Get a Free Quote</ButtonLink>
              <a
                className="rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-brand-50"
                href={`tel:${SITE.phoneTel}`}
              >
                Call {SITE.phoneDisplay}
              </a>
            </div>

            <div className="mt-5 text-sm text-zinc-600">
              Owned and operated by James and Austin • Serving {SITE.serviceArea}
            </div>
          </div>
        </Container>
      </section>

      {/* Content */}
      <section className="border-t border-zinc-200 bg-transparent">
        <Container>
          <div className="grid gap-10 py-14 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900">Our approach</h2>
              <p className="mt-2 text-sm text-zinc-700">
                We use pressure washing where it belongs (like concrete), and soft washing where high pressure can cause
                damage (like roofs and many siding types). The goal is to clean effectively while protecting your
                property.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>Surface-appropriate methods (soft wash vs. pressure)</li>
                <li>Respect for landscaping and property</li>
                <li>Clear scope and honest expectations</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-zinc-900">What we clean</h2>
              <p className="mt-2 text-sm text-zinc-700">
                Roofs, siding, gutters, concrete, decks, fences, and more. If it’s outside and it’s dirty, there’s a
                good chance we can help.
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                <li>Roof algae and staining</li>
                <li>Green buildup on siding and trim</li>
                <li>Driveway and sidewalk grime</li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Local CTA */}
      <section className="border-t border-zinc-200 bg-brand-50">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">Serving the Toledo area</h2>
            <p className="mt-2 max-w-3xl text-zinc-700">
              {SITE.serviceArea}. Not sure if you’re in range? Reach out — we’ll tell you fast.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href={SITE.quoteUrl} target="_blank" rel="noopener noreferrer">Contact us</ButtonLink>
              <ButtonLink href="/service-areas" variant="secondary">
                View service areas
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}

