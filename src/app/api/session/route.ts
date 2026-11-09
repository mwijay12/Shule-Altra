/**
 * @fileOverview The role this browser session is allowed to act as, as a
 * server-readable fact.
 *
 * The hub resolves roles on the client, but a PDF served from the server cannot
 * trust the client. This endpoint used to accept whatever role was posted and
 * write it straight into the cookie — meaning anyone could POST {"role":"ADMIN"}
 * with no session at all and pull the defaulters register or the fee ledger.
 *
 * Against a real project the browser now posts a Firebase ID token. The server
 * verifies it and reads the caller's own staff record before deciding the role.
 * Any failure clears the cookie: the gate closes, it never falls open.
 *
 * The offline demo still accepts a posted role, because that demo has no real
 * data and lets you pick a role on the login screen by design.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDocRole } from '@/lib/documents/registry'
import { SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session'
import { DEMO_MODE } from '@/lib/demo/config'
import { resolveServerRole, SessionVerificationError } from '@/lib/auth/verify-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function clearCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const body = (payload ?? {}) as { role?: unknown; idToken?: unknown }

  // ── real project: prove it ────────────────────────────────────────────────
  if (!DEMO_MODE) {
    try {
      const role = await resolveServerRole(typeof body.idToken === 'string' ? body.idToken : '')
      const store = await cookies()
      store.set(SESSION_COOKIE, role, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE,
      })
      return NextResponse.json({ ok: true, role })
    } catch (error) {
      // Never leave a previously issued cookie behind on a failed check.
      await clearCookie()
      const status = error instanceof SessionVerificationError ? error.status : 503
      const message =
        error instanceof SessionVerificationError
          ? error.message
          : 'The session could not be verified. Try again shortly.'
      return NextResponse.json({ error: message }, { status })
    }
  }

  // ── offline demo: the role picker is the point ────────────────────────────
  if (!isDocRole(body.role)) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
  }
  const store = await cookies()
  store.set(SESSION_COOKIE, body.role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return NextResponse.json({ ok: true, role: body.role, demo: true })
}

export async function DELETE() {
  await clearCookie()
  return NextResponse.json({ ok: true })
}
