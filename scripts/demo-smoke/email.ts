/**
 * @fileOverview The mail room, checked without sending anything.
 *
 * Renders every template for a real recipient from the register, writes each
 * email to `private/email-previews/*.html` so a human can open it in a browser,
 * and asserts the things that break silently:
 *
 *   – a template that renders `undefined` into a sentence;
 *   – a subject line that says nothing;
 *   – a policy hole (a teacher able to mail the fee defaulters);
 *   – an audience that resolves to nobody.
 *
 * Run with: npm run demo:email
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  EMAIL_POLICY,
  buildAudience,
  canSendTemplate,
  templateDataFor,
} from '@/lib/email/audience'
import { SCHOOL, TEMPLATE_TITLES, renderEmail } from '@/lib/email/templates'
import { providerStatus } from '@/lib/email/provider'
import type { DocRole } from '@/lib/documents/registry'
import type { AudienceId, EmailTemplateId } from '@/lib/email/types'

const OUT = join(process.cwd(), 'private', 'email-previews')
mkdirSync(OUT, { recursive: true })

const TEMPLATES = Object.keys(EMAIL_POLICY) as EmailTemplateId[]
let failures = 0

function check(ok: boolean, label: string, detail = '') {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` · ${detail}` : ''}`)
}

const status = providerStatus()
console.log(`Provider: ${status.provider} · from ${status.from}`)
console.log(`App url:  ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shule-altra-demo.vercel.app'}`)
console.log('─'.repeat(78))

const audiences = new Map<AudienceId, number>()
for (const template of TEMPLATES) {
  const policy = EMAIL_POLICY[template]
  const recipients = buildAudience(policy.audience)
  audiences.set(policy.audience, recipients.length)

  check(recipients.length > 0, `${template.padEnd(20)} audience has addresses`, `${recipients.length} recipients`)

  const recipient = recipients[0] ?? { email: 'guardian@example.co.tz', name: 'Sample Guardian', learner: 'Sample Learner', className: 'Form 2' }
  const rendered = renderEmail(
    template,
    { recipient, school: SCHOOL, demo: true, linkBase: 'https://shule-altra-demo.vercel.app' },
    templateDataFor(template, recipient, 0) as Record<string, any>
  )

  const html = rendered.html
  const file = join(OUT, `${template}.html`)
  writeFileSync(file, html, 'utf8')

  check(rendered.subject.trim().length > 12, `${template.padEnd(20)} subject`, rendered.subject)
  check(html.length > 2_000, `${template.padEnd(20)} renders a full document`, `${html.length} chars`)
  check(!/undefined|NaN|\[object Object\]/.test(html), `${template.padEnd(20)} no leaked values`)
  check(html.includes('#1f5ba6') && html.includes('#7c5ae0'), `${template.padEnd(20)} carries the brand gradient`)
  check(html.includes(SCHOOL.name), `${template.padEnd(20)} names the school`)
  check(rendered.text.length > 120, `${template.padEnd(20)} has a plain-text twin`, `${rendered.text.length} chars`)
}

// The policy must mirror the document registry: money stays with finance.
const expectations: Array<[DocRole, EmailTemplateId, boolean]> = [
  ['ADMIN', 'fee-reminder', true],
  ['BURSAR', 'fee-reminder', true],
  ['ACCOUNTANT', 'payment-received', true],
  ['TEACHER', 'fee-reminder', false],
  ['TEACHER', 'absence-alert', true],
  ['TEACHER', 'report-card-ready', true],
  ['TEACHER', 'staff-briefing', false],
  ['VIEWER', 'absence-alert', false],
  ['VIEWER', 'staff-briefing', false],
]
for (const [role, template, expected] of expectations) {
  const actual = canSendTemplate(role, template)
  check(actual === expected, `${role.padEnd(11)} → ${template.padEnd(20)}`, actual ? 'permitted' : 'refused')
}
check(!canSendTemplate(null, 'absence-alert'), 'guest     → absence-alert refused')

console.log('\nAudiences')
for (const [audience, size] of audiences) {
  console.log(`  ${audience.padEnd(18)} ${String(size).padStart(4)} recipients`)
}

console.log(
  failures === 0
    ? `\nALL ${TEMPLATES.length} EMAILS RENDER — previews in private/email-previews/`
    : `\n${failures} EMAIL CHECK(S) FAILED`
)
process.exit(failures === 0 ? 0 : 1)
