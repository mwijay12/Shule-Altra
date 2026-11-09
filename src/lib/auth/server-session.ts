/**
 * @fileOverview One place where a server route asks "who is this, really?".
 *
 * Four routes read the session cookie. Previously each did its own
 * `isDocRole(cookie.value)` check, which meant four chances to get it wrong and
 * no expiry check anywhere. They now all come through here.
 */

import { cookies } from 'next/headers'
import type { DocRole } from '@/lib/documents/registry'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  readSessionToken,
  renewSessionToken,
  sessionCookieOptions,
  shouldRenew,
  type SessionClaims,
} from '@/lib/session'

/**
 * The verified session, or null. Renewing the idle window happens here so every
 * gate slides the expiry consistently.
 */
export async function serverSession(): Promise<SessionClaims | null> {
  const store = await cookies()
  const claims = readSessionToken(store.get(SESSION_COOKIE)?.value)
  if (!claims) return null

  if (shouldRenew(claims)) {
    store.set(SESSION_COOKIE, renewSessionToken(claims), {
      ...sessionCookieOptions,
      maxAge: Math.min(SESSION_MAX_AGE, claims.abs - Math.floor(Date.now() / 1000)),
    })
  }
  return claims
}

export async function serverRole(): Promise<DocRole | null> {
  return (await serverSession())?.role ?? null
}
