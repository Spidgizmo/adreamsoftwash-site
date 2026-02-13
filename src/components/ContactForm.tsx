'use client'

import { useMemo, useState } from 'react'

type FormState = {
  name: string
  phone: string
  email: string
  address: string
  message: string
  /* honeypot */
  website: string
}

const initial: FormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  message: '',
  website: '',
}

export function ContactForm() {
  const [data, setData] = useState<FormState>(initial)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string>('')

  const isDisabled = useMemo(() => {
    return status === 'sending'
  }, [status])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Basic spam check
    if (data.website.trim()) {
      setStatus('sent')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          message: data.message,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(json?.error || 'Something went wrong. Please call or text us.')
      }

      setStatus('sent')
      setData(initial)
    } catch (err: any) {
      setStatus('error')
      setError(err?.message || 'Unable to send. Please call or text us.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 md:grid-cols-2">
      <div className="grid gap-2">
        <label className="text-sm font-semibold">Name</label>
        <input
          className="rounded-md border border-zinc-200 px-3 py-2"
          placeholder="Your name"
          value={data.name}
          onChange={(e) => setData({ ...data, name: e.target.value })}
          autoComplete="name"
          required
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-semibold">Phone</label>
        <input
          className="rounded-md border border-zinc-200 px-3 py-2"
          placeholder="(567) 777-7638"
          value={data.phone}
          onChange={(e) => setData({ ...data, phone: e.target.value })}
          autoComplete="tel"
          required
        />
      </div>

      <div className="grid gap-2 md:col-span-2">
        <label className="text-sm font-semibold">Email (optional)</label>
        <input
          className="rounded-md border border-zinc-200 px-3 py-2"
          placeholder="you@example.com"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          autoComplete="email"
          type="email"
        />
      </div>

      <div className="grid gap-2 md:col-span-2">
        <label className="text-sm font-semibold">Address / City</label>
        <input
          className="rounded-md border border-zinc-200 px-3 py-2"
          placeholder="Toledo, OH"
          value={data.address}
          onChange={(e) => setData({ ...data, address: e.target.value })}
        />
      </div>

      <div className="grid gap-2 md:col-span-2">
        <label className="text-sm font-semibold">What do you need cleaned?</label>
        <textarea
          className="min-h-32 rounded-md border border-zinc-200 px-3 py-2"
          placeholder="Roof cleaning, house wash, driveway, etc. Tell us what you want done and when."
          value={data.message}
          onChange={(e) => setData({ ...data, message: e.target.value })}
          required
        />
      </div>

      {/* Honeypot */}
      <div className="hidden">
        <label>Website</label>
        <input value={data.website} onChange={(e) => setData({ ...data, website: e.target.value })} />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isDisabled}
          className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending…' : 'Send request'}
        </button>

        {status === 'sent' && (
          <span className="text-sm font-semibold text-green-700">Sent! We’ll get back to you soon.</span>
        )}

        {status === 'error' && <span className="text-sm font-semibold text-red-700">{error}</span>}

        <span className="text-sm text-zinc-600">
          If the form doesn’t work, call/text us and we’ll take care of you.
        </span>
      </div>
    </form>
  )
}
