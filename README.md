# American Dream Softwash — Website

A simple, fast, 5-page business website built with **Next.js (App Router) + Tailwind CSS**.

## Pages
- `/` Home
- `/services`
- `/gallery`
- `/about`
- `/contact`

## Quick start
```bash
npm install
npm run dev
```
Then open `http://localhost:3000`.

## Add your real domain (important for sitemap)
Edit `src/lib/site.ts` and change:
- `SITE.url` (currently `https://example.com`)

## Add photos to the gallery
Put your images into:
- `public/gallery/`

The site currently uses placeholder SVGs named `before-after-1.svg`...`before-after-6.svg`.
You can replace them with real images (JPG/PNG/WebP) and update the list in:
- `src/app/gallery/page.tsx`

## Contact form email (optional)
The contact form posts to `/api/contact` and can send an email lead using SMTP.

1. Copy `.env.example` to `.env.local`
2. Fill in SMTP + `TO_EMAIL`
3. Restart the dev server

If SMTP env vars are not set, the form returns a helpful error and visitors can still call/text using the phone links.

## Deploy
Works great on Vercel:
- Import the repo
- Add the environment variables from `.env.example` (Project Settings → Environment Variables)
- Deploy

---
**Brand**: American Dream Softwash
