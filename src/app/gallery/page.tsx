import { ButtonLink } from '@/components/ButtonLink'
import { Container } from '@/components/Container'

export const metadata = {
  title: 'Gallery',
  description: 'Before and after photos of roof cleaning, house washing, and concrete cleaning.',
}

const GALLERY = [
  { src: '/gallery/before-after-drive-1.jpg', label: 'Driveway Cleaning' },
  { src: '/gallery/before-after-house-1.jpg', label: 'House Washing' },
  { src: '/gallery/before-after-house-2.jpg', label: 'House Washing' },
  { src: '/gallery/before-after-roof-1.jpg', label: 'Roof Soft Wash' },
  { src: '/gallery/before-after-roof-2.jpg', label: 'Roof Soft Wash' },
  { src: '/gallery/before-after-roof-3.jpg', label: 'Roof Soft Wash' },
]

export default function GalleryPage() {
  return (
    <main>
      {/* Header (BABY BLUE like Services) */}
      <section className="bg-sky-100 border-b border-sky-200">
        <Container>
          <div className="py-14">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">
              Before & After Gallery
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-zinc-700">
              Real results from roof cleaning, house washing, and concrete cleaning jobs.
            </p>

            <div className="mt-7 flex gap-3">
              <ButtonLink href="/contact">Get a Free Quote</ButtonLink>
              <ButtonLink href="/services" variant="secondary">
                View Services
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Gallery band (strong blue) */}
      <section className="hover:text-brand-800">
        <Container>
          <div className="py-14">
            <div className="grid gap-6 md:grid-cols-2">
              {GALLERY.map((item) => (
                <div
                  key={item.src}
                  className="group overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-white/25 transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
                >
                  {/* image area */}
                  <div className="overflow-hidden">
                    <img
                      src={item.src}
                      alt={`${item.label} before and after`}
                      className="w-full h-[360px] object-contain bg-white transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  </div>

                  {/* label */}
                  <div className="border-t border-zinc-200 bg-white px-4 py-3 text-base font-semibold text-zinc-800">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-sky-100 border-t border-sky-200">
        <Container>
          <div className="py-14">
            <h2 className="text-2xl font-bold text-zinc-900">Want results like these?</h2>
            <p className="mt-2 max-w-3xl text-zinc-700">
              Request a free quote and we’ll tell you exactly what it would take to clean your property.
            </p>
            <div className="mt-6">
              <ButtonLink href="/contact">Request a Quote</ButtonLink>
            </div>
          </div>
        </Container>
      </section>
    </main>
  )
}
