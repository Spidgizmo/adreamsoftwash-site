import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Services",
  description: "Roof cleaning, house washing, concrete cleaning, gutter brightening, and more in the Toledo area.",
};

const SERVICES = [
  {
    title: "Roof Cleaning (Soft Wash)",
    description:
      "Remove algae staining safely with low pressure. Great for asphalt shingles and many roofing materials.",
    points: [
      "Kills Gloeocapsa magma (black streak algae) and helps slow regrowth",
      "No “pressure washing” on shingles",
      "Improves curb appeal and can help extend roof life",
    ],
  },
  {
    title: "House Washing",
    description: "Siding, soffits, trim, and more — cleaned safely with the right method for the surface.",
    points: ["Vinyl, brick, stucco, and more", "Gentle rinse + proper dwell time", "Great before painting or listing"],
  },
  {
    title: "Concrete Cleaning",
    description: "Driveways, patios, sidewalks, porches — restore brightness and remove grime buildup.",
    points: ["Curb appeal boost", "Oil/organic staining as conditions allow", "Optional post-treatment for organics"],
  },
  {
    title: "Gutter Brightening",
    description: "Remove tiger stripes and oxidation staining to restore a clean look.",
    points: ["Exterior face brightening", "Pairs well with house washing", "Fast visual upgrade"],
  },
  {
    title: "Deck & Fence Cleaning",
    description: "Wash wood or composite surfaces with the correct pressure and cleaning agents.",
    points: ["Prep for stain/seal", "Mildew/algae removal", "Gentle where needed"],
  },
  {
    title: "Commercial Exterior Cleaning",
    description: "Storefronts, sidewalks, dumpster pads, and more. Ask for scheduling options.",
    points: ["After-hours available", "Routine maintenance plans", "Professional, accountable service"],
  },
] as const;

export default function ServicesPage() {
  return (
    <main>
      {/* Hero */}
      <section className="bg-brand-50">
        <Container>
          <div className="py-14">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Services</h1>
            <p className="mt-4 max-w-3xl text-lg text-zinc-700">
              If you searched for “pressure washing,” you’re in the right place — we use pressure where it makes sense.
              For roofs and many siding types, we use a safer soft-wash method.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/contact">Get a Free Quote</ButtonLink>
              <a
                className="rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-brand-50"
                href={`tel:${SITE.phoneTel}`}
              >
                Call for fastest service: {SITE.phoneDisplay}
              </a>
            </div>
          </div>
        </Container>
      </section>

      {/* Services grid */}
      <section className="border-t border-zinc-200 bg-transparent">
        <Container>
          <div className="py-14">
            <div className="grid gap-4 md:grid-cols-2">
              {SERVICES.map((s) => (
                <div key={s.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-zinc-900">{s.title}</h2>
                  <p className="mt-2 text-sm text-zinc-700">{s.description}</p>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-700">
                    {s.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* What to expect */}
      <section className="border-t border-zinc-200 bg-brand-50">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">What to expect</h2>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { title: "1) Quote", desc: "Tell us what you need cleaned. We’ll confirm scope and pricing." },
                { title: "2) Schedule", desc: "Pick a time that works. Most jobs are completed quickly." },
                { title: "3) Clean", desc: "We protect your property and deliver a result you can see." },
              ].map((x) => (
                <div key={x.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="text-lg font-bold text-zinc-900">{x.title}</div>
                  <p className="mt-2 text-sm text-zinc-700">{x.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact">Request a quote</ButtonLink>
              <ButtonLink href="/gallery" variant="secondary">
                See results
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
