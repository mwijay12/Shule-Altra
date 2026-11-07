/**
 * @fileOverview The role this browser session is allowed to act as, as a
 * server-readable fact.
 *
 * The hub resolves roles on the client (localStorage in demo mode, a Firestore
 * staff doc in a real deployment). A PDF that lives on the server cannot trust
 * the client, so the browser posts its resolved role here once and the answer
 * comes back as an httpOnly cookie the document route can read.
 *
 * Demo mode accepts the posted role — the same demo lets you pick a role on the
 * login screen, so there is nothing more to prove. With NEXT_PUBLIC_DEMO_MODE
 * set to "false" this endpoint is where a Firebase ID token would have to be
 * verified before the cookie were written.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { isDocRole } from '@/lib/documents/registry'

export const dynamic = 'force-dynamic'

export const SESSION_COOKIE = 'altra.role'
const MAX_AGE = 60 * 60 * 12

export async function POST(request: Request) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const role = (payload as { role?: unknown } | null)?.role
  if (!isDocRole(role)) {
    return NextResponse.json({ error: 'Unknown role' }, { status: 400 })
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  })

  return NextResponse.json({ ok: true, role })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  return NextResponse.json({ ok: true })
}
