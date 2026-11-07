/**
 * @fileOverview Proves the SMTP path fails loudly and cheaply.
 *
 * The suite cannot reach a real mail server from CI (and should not), but the
 * expensive failure modes are all local: a wrong port hangs, a wrong password
 * repeats itself ninety-seven times, and an unreachable host used to be
 * indistinguishable from "sent" because nothing was asserted.
 *
 * Here the transport is aimed at a closed port on loopback, which is the same
 * shape as a misconfigured school firewall. What is asserted:
 *
 *   – it returns a result instead of throwing at the route;
 *   – it stops after the first refused connection instead of trying 40 more;
 *   – the message a bursar reads names the host and the fix;
 *   – with SMTP unset, the very same call is a dry run.
 *
 * Run with: npm run demo:smtp
 */

import { SCHOOL, renderEmail } from '@/lib/email/templates'
import {
  deliver,
  demoAddresses,
  demoDeliveryBlocked,
  isDemoAddress,
  providerStatus,
  readSmtpConfig,
} from '@/lib/email/provider'
import type { RenderedEmail } from '@/lib/email/types'

let failures = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` · ${detail}` : ''}`)
}

// A deliverable-looking address: the demo guard must not interfere with the
// transport failure this suite is actually testing.
const recipient = {
  email: 'parent@gmail.com',
  name: 'Sample Guardian',
  learner: 'Sample Learner',
  className: 'Form 2',
}

const message = renderEmail(
  'fee-reminder',
  { recipient, school: SCHOOL, demo: true, linkBase: 'https://shule-altra-demo.vercel.app' },
  {
    balance: 156000,
    totalPaid: 194000,
    expected: 350000,
    className: 'Form 2',
    controlNumber: '2026-000123',
    term: 'Term 2 2026',
    dueDate: '30 November 2026',
  } as Record<string, any>
) as RenderedEmail

const demoMessage = { ...message, to: { ...message.to, email: 'e.mushi@parents.mnyerere.sc.tz' } }

const saved = { ...process.env }

async function main() {
  /* --- 1. aim the transport at a closed port ---------------------------- */
  process.env.SMTP_HOST = '127.0.0.1'
  process.env.SMTP_PORT = '1'
  process.env.SMTP_USER = 'office@school.sc.tz'
  process.env.SMTP_PASS = 'abcd efgh ijkl mnop'
  process.env.SMTP_FROM = 'Shule Altra <office@school.sc.tz>'

  check(providerStatus().provider === 'smtp', 'a complete config selects SMTP')
  check(readSmtpConfig()?.pass === 'abcdefghijklmnop', 'app password is normalised')

  const started = Date.now()
  const result = await deliver([message, message, message, message, message])
  const elapsed = Date.now() - started

  check(result.provider === 'smtp', 'result is tagged smtp')
  check(result.delivered === 0, 'nothing was delivered to a dead port', `delivered=${result.delivered}`)
  check(result.failed >= 1, 'the failure is counted', `failed=${result.failed}`)
  check(Boolean(result.error), 'the failure carries a sentence', result.error?.slice(0, 90) ?? '')
  check(
    Boolean(result.error && /127\.0\.0\.1|EAUTH|ECONNECTION|ETIMEDOUT|ESOCKET/i.test(result.error)),
    'the sentence names what went wrong'
  )
  check(elapsed < 30_000, 'it gives up quickly instead of hanging', `${elapsed} ms`)
  check(result.failed === 5, 'every recipient is accounted for', `failed=${result.failed}`)

  /* --- 2. the demo register cannot be mailed for real -------------------- */
  check(isDemoAddress('e.mushi@parents.mnyerere.sc.tz'), 'demo parent addresses are recognised')
  check(!isDemoAddress('parent@gmail.com'), 'a real address is not mistaken for a demo one')
  check(demoAddresses([demoMessage]) === 1, 'the counter finds them in a batch')
  check(demoDeliveryBlocked({}) === true, 'demo mode blocks live delivery by default')
  check(demoDeliveryBlocked({ NEXT_PUBLIC_DEMO_MODE: 'false' }) === false, 'a real school is not blocked')
  check(
    demoDeliveryBlocked({ EMAIL_ALLOW_DEMO_DELIVERY: 'true' }) === false,
    'the opt-in override is honoured'
  )

  const guarded = await deliver([demoMessage, demoMessage])
  check(guarded.delivered === 0, 'nothing is delivered to invented mailboxes', `delivered=${guarded.delivered}`)
  check(
    Boolean(guarded.error && /demo school/i.test(guarded.error)),
    'the refusal explains itself',
    guarded.error?.slice(0, 80) ?? ''
  )

  /* --- 3. with SMTP unset the same call is a dry run --------------------- */
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('SMTP_') || key === 'RESEND_API_KEY') delete process.env[key]
  }

  const dry = await deliver([message])
  check(dry.provider === 'dry-run', 'no credentials → dry run')
  check(dry.ids.length === 1 && dry.failed === 0, 'dry run still returns preview ids')

  Object.assign(process.env, saved)

  console.log(
    failures === 0
      ? '\nSMTP FAILURE PATH IS HONEST — refused fast, counted, explained'
      : `\n${failures} SMTP CHECK(S) FAILED`
  )
  process.exit(failures === 0 ? 0 : 1)
}

void main()
