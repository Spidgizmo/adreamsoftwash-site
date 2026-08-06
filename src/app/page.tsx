import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import { ButtonLink } from "@/components/ButtonLink";
import { Container } from "@/components/Container";
import { BubbleField, WaveDivider } from "@/components/MarketingVisuals";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Home",
};

const SERVICES = [
  {
    number: "01",
    title: "Roof Cleaning (Soft Wash)",
    desc: "Kills algae and lifts staining without high pressure.",
  },
  {
    number: "02",
    title: "House Washing",
    desc: "Siding, soffits, and trim cleaned and brightened without damage.",
  },
  {
    number: "03",
    title: "Concrete Cleaning",
    desc: "Driveways, walkways, and patios deep-cleaned for stronger curb appeal.",
  },
  {
    number: "04",
    title: "Gutter Brightening",
    desc: "Remove tiger stripes and restore a cleaner exterior finish.",
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
    desc: "We treat landscaping and surfaces with care and match the method to the material.",
  },
];

const WHY_US = [
  {
    title: "Local & accountable",
    desc: "We live here, work here, and stand behind the result.",
  },
  {
    title: "Quality work",
    desc: "We take our time where it matters—details, edges, and thorough rinsing.",
  },
  {
    title: "Easy scheduling",
    desc: "Quick quotes and straightforward scheduling that respects your time.",
  },
];

const REAL_WORK = [
  {
    src: "/gallery/before-after-roof-1.JPG",
    alt: "ADS roof cleaning before and after result",
    title: "Roof transformation",
  },
  {
    src: "/gallery/before-after-house-2.JPG",
    alt: "ADS house washing before and after result",
    title: "House washing result",
  },
  {
    src: "/gallery/before-after-drive.JPG",
    alt: "ADS driveway cleaning before and after result",
    title: "Driveway cleaning result",
  },
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white">
      <section className="marketing-hero text-white">
        <BubbleField />
        <Container>
          <div className="relative z-10 grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <Badge>Licensed • Insured • Free quotes</Badge>
              <p className="mt-6 text-sm font-black uppercase tracking-[0.22em] text-cyan-200">
                Exterior cleaning across Northwest Ohio
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                Bring back the clean your home was built to show.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-sky-100">
                Roof cleaning and exterior soft washing that fights algae,
                grime, and buildup without using damaging high pressure on
                delicate surfaces.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink
                  href={SITE.quoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get a Free Quote
                </ButtonLink>
                <ButtonLink href="/services" variant="secondary">
                  View Services
                </ButtonLink>
                <a
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15 hover:text-white"
                  href={`tel:${SITE.phoneTel}`}
                >
                  Call {SITE.phoneDisplay}
                </a>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-sky-100">
                <span>✓ Roof soft washing</span>
                <span>✓ House washing</span>
                <span>✓ Concrete cleaning</span>
              </div>
              <p className="mt-5 text-sm text-slate-300">
                Serving {SITE.serviceArea}. {SITE.owners}.
              </p>
            </div>

            <div className="photo-frame min-h-[380px] sm:min-h-[470px]">
              <Image
                src="/gallery/before-after-house-1.JPG"
                alt="American Dream Softwash house washing before and after result"
                fill
                priority
                sizes="(min-width: 1024px) 44vw, 92vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 z-10 p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                  Real ADS work
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  Your photographs. Your results. No stock-photo pretending.
                </p>
                <Link
                  href="/gallery"
                  className="mt-4 inline-flex font-bold text-white underline decoration-cyan-300 decoration-2 underline-offset-4 hover:text-cyan-100"
                >
                  View the ADS gallery
                </Link>
              </div>
            </div>
          </div>
        </Container>
        <WaveDivider />
      </section>

      <section className="bg-white">
        <Container>
          <div className="py-16 md:py-20">
            <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
                  Built for the surface
                </p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  The right cleaning method—not just more pressure.
                </h2>
              </div>
              <p className="max-w-3xl text-lg leading-8 text-zinc-700">
                People search for pressure washing, but roofs and many siding
                types need a safer soft-wash approach. ADS matches the process
                to the material instead of treating every surface the same.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map((service, index) => (
                <article key={service.title} className="marketing-card p-6 pt-8">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg ${
                      index === 3 ? "bg-red-600" : "bg-[#0b2a57]"
                    }`}
                  >
                    {service.number}
                  </div>
                  <h3 className="mt-5 text-xl font-black">{service.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-700">
                    {service.desc}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-9">
              <ButtonLink href="/services" variant="secondary">
                See all services
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-[#071b3b] text-white">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-20 bottom-0 h-64 w-64 rounded-full bg-red-600/15 blur-3xl"
        />
        <Container>
          <div className="relative py-16 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-200">
                Real work from ADS
              </p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                The photographs do not need a gimmick to prove the change.
              </h2>
              <p className="mt-4 text-lg leading-8 text-sky-100">
                These are ADS-owned project photographs displayed as clear,
                static results. No forced slider and no outside stock imagery.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {REAL_WORK.map((work) => (
                <Link
                  href="/gallery"
                  key={work.src}
                  className="photo-frame block min-h-[300px] text-white hover:text-white"
                >
                  <Image
                    src={work.src}
                    alt={work.alt}
                    fill
                    sizes="(min-width: 1024px) 31vw, 92vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5">
                    <p className="text-lg font-black text-white">{work.title}</p>
                    <p className="mt-1 text-sm text-sky-100">Open the full gallery →</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="section-glow">
        <Container>
          <div className="py-16 md:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-700">
                Why homeowners choose ADS
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Professional does not have to mean plain.
              </h2>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {TRUST.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-3xl border border-brand-200/80 bg-white p-7 shadow-xl shadow-brand-950/10"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        index === 1 ? "bg-red-600" : "bg-sky-500"
                      }`}
                    />
                    <h3 className="text-xl font-black">{item.title}</h3>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-700">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-slate-100">
        <Container>
          <div className="grid gap-10 py-16 md:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
                Local. Reliable. Detail-focused.
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Cleaning that makes the whole property feel cared for.
              </h2>
              <p className="mt-5 leading-7 text-zinc-700">
                Clean surfaces last longer, look better, and make your home feel
                maintained instead of forgotten.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/about" variant="secondary">
                  Learn about us
                </ButtonLink>
                <ButtonLink href="/gallery" variant="secondary">
                  View the gallery
                </ButtonLink>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              {WHY_US.map((item) => (
                <article
                  key={item.title}
                  className="rounded-3xl bg-[#0b2a57] p-6 text-white shadow-xl shadow-slate-950/20"
                >
                  <h3 className="text-xl font-black text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-sky-100">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-[#075ca8] text-white">
        <BubbleField className="opacity-40" />
        <Container>
          <div className="relative z-10 flex flex-col items-start justify-between gap-7 py-14 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white/80">
                Ready when you are
              </p>
              <h2 className="mt-2 text-3xl font-black text-white">
                Ready to get your exterior cleaned?
              </h2>
              <p className="mt-3 text-white/90">
                Get a fast quote. Most requests are answered the same day.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href={SITE.quoteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-red-700 hover:bg-sky-50"
              >
                Get a Free Quote
              </ButtonLink>
              <a
                className="rounded-xl border border-white/40 bg-[#071b3b]/30 px-5 py-3 text-sm font-black text-white transition hover:bg-[#071b3b]/50 hover:text-white"
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
