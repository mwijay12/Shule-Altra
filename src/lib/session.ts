/**
 * @fileOverview The signed cookie that carries the session role to the server.
 *
 * This used to store the bare role string, so `Cookie: altra.role=ADMIN` typed
 * by hand was accepted by every gate — the /api/session verification could be
 * bypassed entirely by never calling it. Verified: a hand-written cookie pulled
 * the defaulters register, listed 97 guardian addresses and passed the photo
 * deletion gate.
 *
 * The value is now an HMAC-signed token: role, subject, issued-at and expiry,
 * with a signature over all of it. Editing any byte fails the check. Timing-safe
 * comparison, and the secret never reaches the browser.
 *
 * Lifetime is 30 minutes and slides on activity, so an open tab keeps working
 * while a walked-away machine locks itself. An absolute cap stops an endless
 * refresh from holding a revoked role forever.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { isDocRole, type DocRole } from '@/lib/documents/registry'

export const SESSION_COOKIE = 'altra.role'

/** Idle window: a session with no requests for this long is refused. */
export const SESSION_MAX_AGE = 60 * 30

/** Hard ceiling from first sign-in, however active the session is. */
export const SESSION_ABSOLUTE_MAX_AGE = 60 * 60 * 8

const TOKEN_VERSION = 'v1'

export class SessionConfigError extends Error {}

/**
 * The offline demo needs a secret that is stable across route bundles and
 * serverless instances, with no setup. It is derived from a fixed demo-only
 * string: that is safe *because* the demo holds invented data and hands out any
 * role on the login screen by design. It is never used for a real project.
 *
 * A real deployment must set SESSION_SECRET. Without it the gates throw and
 * therefore refuse, rather than silently signing with a value an attacker knows.
 */
const DEMO_ONLY_SECRET = createHash('sha256')
  .update('shule-altra/offline-demo/not-a-production-secret')
  .digest('hex')

function secret(): string {
  const configured = (process.env.SESSION_SECRET ?? '').trim()
  if (configured.length >= 32) return configured
  if (configured.length > 0) {
    throw new SessionConfigError('SESSION_SECRET is too short. Use at least 32 characters.')
  }
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') {
    throw new SessionConfigError(
      'SESSION_SECRET must be set to at least 32 characters before serving a real school.'
    )
  }
  return DEMO_ONLY_SECRET
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export type SessionClaims = {
  role: DocRole
  /** Firebase uid, or "demo" for the offline role picker. */
  sub: string
  /** Unix seconds. */
  iat: number
  /** Unix seconds — idle expiry. */
  exp: number
  /** Unix seconds — absolute expiry from first sign-in. */
  abs: number
}

export function issueSessionToken(
  role: DocRole,
  sub: string,
  now = Math.floor(Date.now() / 1000),
  absoluteDeadline?: number
): string {
  const claims: SessionClaims = {
    role,
    sub,
    iat: now,
    exp: now + SESSION_MAX_AGE,
    abs: absoluteDeadline ?? now + SESSION_ABSOLUTE_MAX_AGE,
  }
  // Never let a sliding renewal outlive the absolute cap.
  claims.exp = Math.min(claims.exp, claims.abs)
  const payload = [TOKEN_VERSION, claims.role, claims.sub, claims.iat, claims.exp, claims.abs].join('.')
  return `${payload}.${sign(payload)}`
}

/**
 * Returns the claims only when the signature, the shape and both deadlines are
 * valid. Everything else — including a bare "ADMIN" — returns null.
 */
export function readSessionToken(
  token: string | undefined | null,
  now = Math.floor(Date.now() / 1000)
): SessionClaims | null {
  if (!token || token.length > 512) return null

  const parts = token.split('.')
  if (parts.length !== 7) return null

  const signature = parts[6]
  const payload = parts.slice(0, 6).join('.')

  let expected: string
  try {
    expected = sign(payload)
  } catch {
    // Misconfigured secret: refuse rather than fall back to something weaker.
    return null
  }

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const [version, role, sub, iatRaw, expRaw, absRaw] = parts
  if (version !== TOKEN_VERSION || !isDocRole(role) || !sub) return null

  const iat = Number(iatRaw)
  const exp = Number(expRaw)
  const abs = Number(absRaw)
  if (!Number.isFinite(iat) || !Number.isFinite(exp) || !Number.isFinite(abs)) return null
  if (now >= exp || now >= abs) return null
  // A token dated in the future is not something we issued.
  if (iat > now + 60) return null

  return { role, sub, iat, exp, abs }
}

/** Slide the idle window, keeping the original absolute deadline. */
export function renewSessionToken(claims: SessionClaims, now = Math.floor(Date.now() / 1000)): string {
  return issueSessionToken(claims.role, claims.sub, now, claims.abs)
}

/** Renew only when worth a Set-Cookie: past halfway through the idle window. */
export function shouldRenew(claims: SessionClaims, now = Math.floor(Date.now() / 1000)): boolean {
  return claims.exp - now < SESSION_MAX_AGE / 2 && now + 60 < claims.abs
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}
