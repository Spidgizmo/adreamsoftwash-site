import { Container } from "@/components/Container";
import { ContactForm } from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Contact",
  description: "Request a free quote for roof cleaning, house washing, or exterior cleaning in the Toledo area.",
};

export default function ContactPage() {
  return (
    <main>
      <section className="bg-brand-50">
        <Container>
          <div className="py-14">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Get a Free Quote</h1>

            <p className="mt-4 max-w-3xl text-lg text-zinc-700">
              Fill out the form and we’ll respond fast. For the fastest service, call{" "}
              <a className="font-semibold text-zinc-900 underline hover:text-brand-800" href={`tel:${SITE.phoneTel}`}>
                {SITE.phoneDisplay}
              </a>
              .
            </p>

            <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:grid-cols-3">
              <div>
                <div className="text-sm font-bold text-zinc-900">Phone</div>
                <a
                  className="mt-2 block text-lg font-extrabold text-zinc-900 hover:text-brand-800"
                  href={`tel:${SITE.phoneTel}`}
                >
                  {SITE.phoneDisplay}
                </a>
                <div className="mt-1 text-sm text-zinc-600">Call for fastest service</div>
              </div>

              <div>
                <div className="text-sm font-bold text-zinc-900">Email</div>
                <a
                  className="mt-2 block text-sm font-semibold text-zinc-900 hover:text-brand-800"
                  href={`mailto:${SITE.email}`}
                >
                  {SITE.email}
                </a>
                <div className="mt-1 text-sm text-zinc-600">We reply quickly</div>
              </div>

              <div>
                <div className="text-sm font-bold text-zinc-900">Hours</div>
                <div className="mt-2 text-sm font-semibold text-zinc-900">{SITE.hours}</div>
                <div className="mt-1 text-sm text-zinc-600">{SITE.addressLine}</div>
              </div>
            </div>

            <div className="mt-8">
              <ContactForm />
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
              <div className="font-semibold text-zinc-900">Heads up</div>
              <p className="mt-2">
                This form sends an email lead once SMTP is configured. If you deploy and the form says it’s not
                configured, add your SMTP environment variables (see <span className="font-semibold">.env.example</span>)
                and redeploy.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
