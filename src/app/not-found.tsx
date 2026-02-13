import { ButtonLink } from '@/components/ButtonLink'
import { Container } from '@/components/Container'

export default function NotFound() {
  return (
    <main className="bg-zinc-50">
      <Container>
        <div className="py-20">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Page not found</h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-700">
            That page doesn’t exist. Use the navigation or go back home.
          </p>
          <div className="mt-8">
            <ButtonLink href="/">Back to Home</ButtonLink>
          </div>
        </div>
      </Container>
    </main>
  )
}
