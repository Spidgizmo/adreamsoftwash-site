import { SITE } from '@/lib/site'

export function MobileCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white p-3 md:hidden">
      <div className="mx-auto flex max-w-6xl gap-3 px-2">
        <a
          className="flex-1 rounded-md border border-zinc-200 px-4 py-3 text-center text-sm font-semibold text-zinc-900"
          href={`tel:${SITE.phoneTel}`}
        >
          Call Now
        </a>
        <a
          className="flex-1 rounded-md bg-brand-700 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-900"
          href="/contact"
        >
          Free Quote
        </a>
      </div>
    </div>
  )
}
