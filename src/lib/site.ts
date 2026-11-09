/**
 * @fileOverview The canonical origin, in one place.
 *
 * Metadata, robots and the sitemap must agree, or search engines see duplicates.
 * Set NEXT_PUBLIC_APP_URL on the deployment; the fallback is the studio site so
 * a preview never emits a localhost canonical.
 */

import { COMPANY } from '@/lib/company'

const configured = (process.env.NEXT_PUBLIC_APP_URL ?? '').trim().replace(/\/+$/, '')

export const SITE_URL = configured || COMPANY.website.replace(/\/+$/, '')
