import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * The marketing page and the legal pages are for search engines. The dashboard,
 * the API and every served document are not — a learner's report card must never
 * turn up in a search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/legal/'],
        disallow: ['/dashboard/', '/api/', '/printables/', '/login'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
