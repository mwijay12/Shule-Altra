import assert from 'node:assert/strict'
import { revalidateLiveSession } from '@/lib/auth/revalidate-session'
import { resolveServerRole } from '@/lib/auth/verify-session'
import type { SessionClaims } from '@/lib/session'
async function main() {
  const claims: SessionClaims = { role: 'ADMIN', sub: 'user-1', iat: 1, exp: 2, abs: 3 }
  let calls = 0
  const same = async () => { calls++; return { uid: 'user-1', role: 'ADMIN' as const } }
  assert.equal(await revalidateLiveSession(claims, undefined, same), false); assert.equal(calls, 0)
  assert.equal(await revalidateLiveSession(claims, 'token', same), true)
  assert.equal(await revalidateLiveSession(claims, 'token', async () => ({ uid: 'user-1', role: 'VIEWER' })), false)
  assert.equal(await revalidateLiveSession(claims, 'token', async () => ({ uid: 'other-user', role: 'ADMIN' })), false)
  assert.equal(await revalidateLiveSession(claims, 'token', async () => { throw new Error('offline') }), false)
  const old = globalThis.fetch
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify({ users: [{ localId: 'user-1', disabled: true, emailVerified: true, email: 'davidbyanmwijage@gmail.com' }] }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch
    await assert.rejects(() => resolveServerRole('token'), /disabled/i)

    // Exercise the real resolver through its REST boundary, not just a stubbed
    // resolver. These responses are fixtures; they do not contact Firebase.
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
    const account = { users: [{ localId: 'user-1', email: 'staff@example.com', emailVerified: true }] }
    let role = 'ADMIN'
    let recordStatus = 200
    let lookupStatus = 200
    let callsToFirestore = 0
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      assert.equal(init?.cache, 'no-store')
      if (url.includes('accounts:lookup')) {
        assert.equal(init?.method, 'POST')
        assert.deepEqual(JSON.parse(String(init?.body)), { idToken: 'token' })
        return json(account, lookupStatus)
      }
      assert.match(url, /\/staff\/user-1$/)
      assert.deepEqual(init?.headers, { authorization: 'Bearer token' })
      callsToFirestore++
      return json({ fields: { role: { stringValue: role } } }, recordStatus)
    }) as typeof fetch
    assert.deepEqual(await resolveServerRole('token'), { uid: 'user-1', role: 'ADMIN' })
    assert.equal(await revalidateLiveSession(claims, 'token'), true)
    role = 'TEACHER'
    assert.equal(await revalidateLiveSession(claims, 'token'), false, 'role changes must invalidate the old role')
    role = 'unrecognised'
    assert.deepEqual(await resolveServerRole('token'), { uid: 'user-1', role: 'VIEWER' })
    recordStatus = 404
    assert.deepEqual(await resolveServerRole('token'), { uid: 'user-1', role: 'VIEWER' })
    recordStatus = 403
    await assert.rejects(() => resolveServerRole('token'), /not allowed/i)
    assert.equal(await revalidateLiveSession(claims, 'token'), false)
    recordStatus = 500
    await assert.rejects(() => resolveServerRole('token'), /could not be read/i)
    lookupStatus = 401
    const before = callsToFirestore
    assert.equal(await revalidateLiveSession(claims, 'token'), false)
    assert.equal(callsToFirestore, before, 'invalid identity must not reach the staff lookup')
    globalThis.fetch = (async () => { throw new Error('network unavailable') }) as typeof fetch
    assert.equal(await revalidateLiveSession(claims, 'token'), false)
  } finally { globalThis.fetch = old }
  console.log('SESSION REVALIDATION TESTS PASSED (mocked Firebase responses)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
