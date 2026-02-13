import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

type Payload = {
  name?: string
  phone?: string
  email?: string
  address?: string
  message?: string
}

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing environment variable: ${name}`)
  return v
}

export async function POST(req: Request) {
  let data: Payload | null = null
  try {
    data = (await req.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = String(data?.name || '').trim()
  const phone = String(data?.phone || '').trim()
  const email = String(data?.email || '').trim()
  const address = String(data?.address || '').trim()
  const message = String(data?.message || '').trim()

  if (!name || !phone || !message) {
    return NextResponse.json({ error: 'Name, phone, and message are required.' }, { status: 400 })
  }

  // If SMTP isn't configured yet, return a helpful error.
  // (This prevents “it worked locally but not on deploy” confusion.)
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const to = process.env.TO_EMAIL

  if (!host || !user || !pass || !to) {
    return NextResponse.json(
      {
        error:
          'Email sending is not configured yet. Add SMTP_HOST, SMTP_USER, SMTP_PASS, and TO_EMAIL in your environment and redeploy.',
      },
      { status: 500 },
    )
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user, pass },
    })

    const subject = `New quote request — ${name} (${phone})`

    const text = [
      `Name: ${name}`,
      `Phone: ${phone}`,
      email ? `Email: ${email}` : `Email: (not provided)`,
      address ? `Address/City: ${address}` : `Address/City: (not provided)`,
      '',
      'Message:',
      message,
    ].join('\n')

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || user,
      to,
      replyTo: email || undefined,
      subject,
      text,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to send email' }, { status: 500 })
  }
}
