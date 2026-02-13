import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url
  const lastModified = new Date()

  return [
    { url: `${base}/`, lastModified },
    { url: `${base}/services`, lastModified },
    { url: `${base}/gallery`, lastModified },
    { url: `${base}/about`, lastModified },
    { url: `${base}/contact`, lastModified },
  ]
}
