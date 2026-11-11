import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { serverSession } from '@/lib/auth/server-session'
import { resolveServerRole } from '@/lib/auth/verify-session'
import { firebaseConfig } from '@/firebase/config'
import { DEMO_MODE } from '@/lib/demo/config'
import { composeStudentMessage, type StudentMailKind } from '@/lib/email/student-message'
import { deliver, providerStatus, testRecipients } from '@/lib/email/provider'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const validId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 150 && !/[/.]/.test(x)
function unpack(value: any): any {
  if (!value || typeof value !== 'object') return null
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('booleanValue' in value) return value.booleanValue
  if ('timestampValue' in value) return value.timestampValue
  if ('nullValue' in value) return null
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([k, v]) => [k, unpack(v)]))
  return null
}
async function readRecord(path: string, token: string) {
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseConfig.projectId)}/databases/(default)/documents/`
  const result = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!result.ok) throw new Error(result.status === 404 ? 'A required record was not found.' : 'Could not read school records. Check access and try again.')
  const record = await result.json()
  return Object.fromEntries(Object.entries(record.fields ?? {}).map(([key, value]) => [key, unpack(value)]))
}
export async function POST(request: Request) {
  if (DEMO_MODE) return NextResponse.json({ error: 'Sending from the demo is disabled. Use a configured live school.' }, { status: 403 })
  const session = await serverSession()
  if (!session) return NextResponse.json({ error: 'Sign in before using the mail room.' }, { status: 401 })
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return NextResponse.json({ error: 'Your Firebase session is missing. Sign in again.' }, { status: 401 })
  let actor
  try { actor = await resolveServerRole(token) } catch { return NextResponse.json({ error: 'Could not verify your sign-in. Sign in again.' }, { status: 401 }) }
  if (actor.uid !== session.sub || !['ADMIN', 'BURSAR', 'ACCOUNTANT'].includes(actor.role)) return NextResponse.json({ error: 'Finance access is required.' }, { status: 403 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }) }
  if (!validId(body.studentId) || !['fee-reminder', 'payment-received'].includes(body.kind) || !['preview', 'send'].includes(body.mode) || (body.kind === 'payment-received' && !validId(body.transactionId))) return NextResponse.json({ error: 'Select a student, message and payment where needed.' }, { status: 400 })
  try {
    const [student, school, transaction] = await Promise.all([
      readRecord(`schools/school-001/students/${encodeURIComponent(body.studentId)}`, token),
      readRecord('schools/school-001/config/identity', token),
      body.kind === 'payment-received' ? readRecord(`schools/school-001/transactions/${encodeURIComponent(body.transactionId)}`, token) : Promise.resolve(undefined),
    ])
    if (student.status === 'Archived') throw new Error('Archived students cannot receive messages. Restore or review the record first.')
    const message = composeStudentMessage(body.kind as StudentMailKind, { ...student, id: body.studentId }, school, transaction)
    const fingerprint = createHash('sha256').update(JSON.stringify(message)).digest('hex')
    const test = testRecipients()
    if (body.mode === 'preview') return NextResponse.json({ to: message.to.email, subject: message.subject, text: message.text, fingerprint, testMode: test.enabled, testRecipients: test.enabled ? test.list : [], provider: providerStatus().provider, copyTo: process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || null })
    if (body.fingerprint !== fingerprint) return NextResponse.json({ error: 'The record or email changed. Preview it again before sending.' }, { status: 409 })
    if (test.enabled) return NextResponse.json({ error: 'EMAIL_TEST_MODE is enabled. Direct guardian sending is disabled; switch test mode off only after testing.' }, { status: 409 })
    if (providerStatus().provider === 'dry-run') return NextResponse.json({ error: 'No email provider is configured; nothing was sent.' }, { status: 503 })
    const result = await deliver([message])
    if (result.delivered !== 1 || result.failed || result.error) return NextResponse.json({ error: result.error || 'The email provider did not accept the message.' }, { status: 502 })
    return NextResponse.json({ ok: true, provider: result.provider, message: 'Accepted by the email provider. Inbox delivery is not guaranteed.' })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not prepare the message.' }, { status: 400 }) }
}
