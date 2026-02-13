import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

import { MobileCTA } from '@/components/MobileCTA'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { SITE } from '@/lib/site'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} | Roof Cleaning & Soft Washing`,
    template: `%s | ${SITE.name}`,
  },
  description:
    'Professional roof cleaning, house washing, and concrete cleaning in Toledo, Perrysburg, and Sylvania. Safe soft washing for shingles and siding.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-brand-700 text-zinc-900 antialiased">

        <SiteHeader />
        <div className="pb-24 md:pb-0">{children}</div>
        <SiteFooter />
        <MobileCTA />
      </body>
    </html>
  );
}

