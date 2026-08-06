import { Container } from "@/components/Container";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-sky-300/20 bg-[#06162f] text-white">
      <div className="h-1 bg-gradient-to-r from-cyan-300 via-sky-500 to-red-600" />
      <div
        aria-hidden="true"
        className="absolute -right-24 top-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-red-600/10 blur-3xl"
      />
      <Container>
        <div className="relative grid gap-8 py-14 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-lg shadow-black/20">
                <img
                  src="/brand/logo.svg"
                  alt={`${SITE.name} logo`}
                  className="h-10 w-auto origin-center scale-[1.15]"
                />
              </div>
              <div className="text-lg font-black text-white">{SITE.name}</div>
            </div>
            <div className="mt-4 text-sm text-sky-100">{SITE.owners}</div>
            <div className="mt-2 text-sm text-slate-300">{SITE.addressLine}</div>
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-wider text-cyan-200">
              Contact
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <a
                className="block font-bold text-white hover:text-cyan-200"
                href={`tel:${SITE.phoneTel}`}
              >
                {SITE.phoneDisplay}
              </a>
              <a
                className="block font-bold text-white hover:text-cyan-200"
                href={`mailto:${SITE.email}`}
              >
                {SITE.email}
              </a>
              <div className="text-slate-300">{SITE.hours}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-black uppercase tracking-wider text-cyan-200">
              Service area
            </div>
            <div className="mt-4 text-sm leading-6 text-slate-300">
              {SITE.serviceArea}
            </div>
            <div className="mt-6 text-xs text-slate-400">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
