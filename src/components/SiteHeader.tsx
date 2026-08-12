"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/Container";
import { NAV_LINKS, SITE } from "@/lib/site";

const QUICK_QUOTE_URL =
  "https://www.lavocrm.com/quote/c2bbf662-b7dd-4a3e-818d-6736bdab49dc";
const CUSTOMER_PORTAL_URL = "/bin-cleaning/login";

export function SiteHeader() {
  const pathname = usePathname();
  const isBinCleaning = pathname.startsWith("/bin-cleaning");

  function isActive(href: string) {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071b3b]/95 text-white shadow-xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="h-1 bg-gradient-to-r from-red-600 via-sky-400 to-cyan-300" />
      <Container>
        <div className="flex h-[4.5rem] items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 text-white hover:text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-white shadow-lg shadow-black/20">
              <img
                src="/brand/logo.svg"
                alt={`${SITE.name} logo`}
                className="h-10 w-auto origin-center scale-[1.15]"
              />
            </div>

            <div className="hidden leading-tight sm:block">
              <div className="text-lg font-black text-white">{SITE.name}</div>
              <div className="text-xs font-semibold text-sky-100">
                {SITE.serviceArea}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-active={isActive(link.href)}
                className="nav-link-bright"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              className="hidden rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-cyan-200 hover:bg-white/15 hover:text-white xl:inline-flex"
              href={`tel:${SITE.phoneTel}`}
            >
              Call {SITE.phoneDisplay}
            </a>

            <Link
              href={CUSTOMER_PORTAL_URL}
              className="hidden rounded-xl border border-sky-300/70 bg-sky-300/10 px-3 py-2 text-center text-sm font-bold text-sky-50 transition hover:bg-sky-200 hover:text-[#071b3b] md:inline-flex"
            >
              Customer Portal
            </Link>

            <a
              className="quick-quote-glow inline-flex rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-black text-white hover:bg-red-700 hover:text-white sm:px-4"
              href={QUICK_QUOTE_URL}
              target="_blank"
              rel="noreferrer"
            >
              {isBinCleaning ? "Exterior Quote" : "Quick Quote"}
            </a>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="-mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pb-3 pt-3 text-sm font-semibold">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive(link.href)
                    ? "px-1 text-cyan-200"
                    : "px-1 text-slate-100 hover:text-white"
                }
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={CUSTOMER_PORTAL_URL}
              className="px-1 font-black text-sky-200 hover:text-white md:hidden"
            >
              Customer Portal
            </Link>
          </div>
        </div>
      </Container>
    </header>
  );
}
