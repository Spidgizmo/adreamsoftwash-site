import type { Metadata } from "next";
import "./globals.css";

import { MobileCTA } from "@/components/MobileCTA";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} | Roof Cleaning & Soft Washing`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "Professional roof cleaning, house washing, and concrete cleaning in Toledo, Perrysburg, and Sylvania. Safe soft washing for shingles and siding.",
  icons: {
    icon: "/favicon.ico?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      style={{ "--font-inter": "Inter, ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties}
    >
      <body className="min-h-screen bg-brand-50 text-zinc-900 antialiased">
        <SiteHeader />
        <div className="pb-24 md:pb-0">{children}</div>
        <SiteFooter />
        <MobileCTA />
      </body>
    </html>
  );
}
