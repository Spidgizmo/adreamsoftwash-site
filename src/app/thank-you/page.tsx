import { ButtonLink } from '@/components/ButtonLink'
import { Container } from '@/components/Container'
import { SITE } from '@/lib/site'

export const metadata = {
  title: 'Thank You',
}

export default function ThankYouPage() {
  return (
    <main>
      <section className="bg-zinc-50">
        <Container>
          <div className="py-20">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Thanks!</h1>
            <p className="mt-4 max-w-2xl text-lg text-zinc-700">
              We received your request. If you need to reach us right now, call or text {SITE.phoneDisplay}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/">Back to Home</ButtonLink>
              <a
                className="rounded-md border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50"
                href={`tel:${SITE.phoneTel}`}
              >
                Call {SITE.phoneDisplay}
              </a>
            </div>
          </div>
        </Container>
      </section>
    </main>
  )
}
