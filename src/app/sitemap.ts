import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { LEGAL_UPDATED } from '@/lib/company'

/** Only public, indexable pages. No dashboard, no documents. */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(LEGAL_UPDATED)
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/legal/privacy`, lastModified: updated, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/legal/terms`, lastModified: updated, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/legal/security`, lastModified: updated, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/legal/dpa`, lastModified: updated, changeFrequency: 'yearly', priority: 0.4 },
  ]
}
