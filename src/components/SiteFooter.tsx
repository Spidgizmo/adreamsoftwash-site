import { Container } from '@/components/Container'
import { SITE } from '@/lib/site'

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <Container>
        <div className="grid gap-8 py-12 md:grid-cols-3">
          <div>
            <div className="text-lg font-bold text-zinc-900">{SITE.name}</div>
            <div className="mt-2 text-sm text-zinc-600">{SITE.owners}</div>
            <div className="mt-2 text-sm text-zinc-600">{SITE.addressLine}</div>
          </div>

          <div>
            <div className="text-sm font-bold text-zinc-900">Contact</div>
            <div className="mt-3 space-y-2 text-sm">
              <a className="block font-semibold text-zinc-900 hover:text-brand-700" href={`tel:${SITE.phoneTel}`}>
                {SITE.phoneDisplay}
              </a>
              <a className="block font-semibold text-zinc-900 hover:text-brand-700" href={`mailto:${SITE.email}`}>
                {SITE.email}
              </a>
              <div className="text-zinc-600">{SITE.hours}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-zinc-900">Service area</div>
            <div className="mt-3 text-sm text-zinc-600">{SITE.serviceArea}</div>
            <div className="mt-4 text-xs text-zinc-500">
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </div>
          </div>
        </div>
      </Container>
    </footer>
  )
}
