import Link from "next/link";
import { Container } from "@/components/Container";
import { NAV_LINKS, SITE } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <Container>
        {/* Fixed bar height so the header never grows */}
        <div className="flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            {/* Logo badge: keeps it readable on light backgrounds */}
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
              {/* Scale the logo visually without affecting layout height */}
              <img
                src="/brand/logo.svg"
                alt={`${SITE.name} logo`}
                className="h-10 w-auto origin-center scale-[1.15]"
              />
            </div>

            <div className="leading-tight">
              <div className="text-lg font-bold text-zinc-900">{SITE.name}</div>
              <div className="text-xs font-medium text-zinc-600">{SITE.serviceArea}</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-zinc-800 hover:text-brand-800"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              className="hidden rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-brand-50 md:inline-flex"
              href={`tel:${SITE.phoneTel}`}
            >
              Call {SITE.phoneDisplay}
            </a>

            <a
              className="inline-flex rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
              href="/contact"
            >
              Free Quote
            </a>
          </div>
        </div>

        <div className="md:hidden">
          <div className="-mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 text-sm font-semibold">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="px-1 text-zinc-800 hover:text-brand-800">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </header>
  );
}
