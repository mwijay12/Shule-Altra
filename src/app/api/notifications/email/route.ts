/**
 * @fileOverview The school's outbound mail room.
 *
 *   GET  → what this role may send, to how many people, whether mail is live
 *          (SMTP or Resend) or a dry run, and what is left of today's budget.
 *          `?probe=1` additionally logs in to the mailbox to prove the
 *          credentials work — without sending a single message.
 *   POST → render from the register, then deliver.
 *
 * The role comes from the same httpOnly cookie the document gate uses, so one
 * sign-in governs everything a staff member can do. Recipients are always
 * recomputed here from the school's own data — the browser never supplies an
 * address list, and `mode: "preview"` renders the exact HTML that would be
 * posted without sending it.
 *
 * Sending is refused before it starts when the audience is bigger than the
 * mailbox allows in one click, or bigger than what is left of today's quota.
 * A school on Gmail that clicks twice inside ten minutes would otherwise burn
 * its reputation and never be told why.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'

import { SESSION_COOKIE } from '@/lib/session'
import { isDocRole, ROLE_LABEL } from '@/lib/documents/registry'
import {
  EMAIL_POLICY,
  buildAudience,
  canSendTemplate,
  templateDataFor,
} from '@/lib/email/audience'
import { providerStatus, deliver, testRecipients, verifyTransport } from '@/lib/email/provider'
import { SCHOOL, TEMPLATE_TITLES, renderEmail } from '@/lib/email/templates'
import type { EmailTemplateId, RenderedEmail } from '@/lib/email/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TEMPLATE_IDS = Object.keys(EMAIL_POLICY) as EmailTemplateId[]
/** Rendering ceiling; the provider's own ceiling may be lower still. */
const MAX_RECIPIENTS = 400
const COOLDOWN_MS = 4_000
const lastSend = new Map<string, number>()

function appUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  try {
    return new URL(request.url).origin
  } catch {
    return 'https://shule-altra-demo.vercel.app'
  }
}

function isTemplate(value: unknown): value is EmailTemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as string[]).includes(value)
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  const role = isDocRole(raw) ? raw : null
  const status = providerStatus()

  const templates = TEMPLATE_IDS.map((id) => {
    const policy = EMAIL_POLICY[id]
    const allowed = canSendTemplate(role, id)
    const recipients = buildAudience(policy.audience)
    return {
      id,
      title: TEMPLATE_TITLES[id],
      audience: policy.audience,
      audienceSize: recipients.length,
      /** how many would actually go today, given the mailbox's ceiling */
      sendable: Math.min(
        recipients.length,
        status.limits.maxPerSend,
        status.limits.dailyRemaining ?? Number.POSITIVE_INFINITY
      ),
      sample: recipients[0]?.email ?? null,
      allowed,
      reason: policy.reason,
      roles: policy.roles.map((entry) => ROLE_LABEL[entry]),
    }
  })

  const probe = new URL(request.url).searchParams.get('probe')
  const mailbox = probe ? await verifyTransport() : null
  const test = testRecipients()

  return NextResponse.json({
    provider: status.provider,
    from: status.from,
    host: status.host ?? null,
    note: status.note,
    limits: status.limits,
    copyTo: process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || null,
    testMode: { enabled: test.enabled, recipients: test.list },
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || process.env.SMTP_REPLY_TO?.trim() || null,
    mailbox,
    role,
    roleLabel: role ? ROLE_LABEL[role] : null,
    school: SCHOOL.name,
    templates,
  })
}

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(SESSION_COOKIE)?.value
  const role = isDocRole(raw) ? raw : null

  if (!role) {
    return NextResponse.json(
      { error: 'Sign in to the school before sending mail.' },
      { status: 401 }
    )
  }

  let payload: { template?: unknown; mode?: unknown } | null = null
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const template = payload?.template
  if (!isTemplate(template)) {
    return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
  }

  const policy = EMAIL_POLICY[template]
  if (!canSendTemplate(role, template)) {
    return NextResponse.json(
      {
        error: `“${TEMPLATE_TITLES[template]}” carries ${policy.reason.toLowerCase()}, so it stays with ${policy.roles
          .map((entry) => ROLE_LABEL[entry])
          .join(', ')}.`,
      },
      { status: 403 }
    )
  }

  const mode = payload?.mode === 'send' ? 'send' : 'preview'
  const status = providerStatus()
  const everyone = buildAudience(policy.audience)

  if (everyone.length === 0) {
    return NextResponse.json({ error: 'Nobody matches this audience today.' }, { status: 409 })
  }

  // Explain the gap before rendering: a 97-guardian reminder from a 50-a-day
  // mailbox is a quota problem, not a template problem.
  const ceiling = Math.min(
    MAX_RECIPIENTS,
    status.limits.maxPerSend,
    status.limits.dailyRemaining ?? Number.POSITIVE_INFINITY
  )
  const recipients = everyone.slice(0, ceiling)

  if (mode === 'send' && everyone.length > ceiling) {
    const reason =
      (status.limits.dailyRemaining ?? Infinity) < status.limits.maxPerSend
        ? `only ${status.limits.dailyRemaining} messages are left in today's ${status.limits.dailyLimit}-message budget`
        : `this mailbox allows ${status.limits.maxPerSend} recipients per click`
    return NextResponse.json(
      {
        error: `${everyone.length} guardians and staff match, but ${reason}. Send the first ${recipients.length} now, raise SMTP_MAX_PER_SEND, or switch to Resend for large batches.`,
        audienceSize: everyone.length,
        sendable: recipients.length,
        limits: status.limits,
      },
      { status: 413 }
    )
  }

  const linkBase = appUrl(request)
  const rendered: RenderedEmail[] = recipients.map((recipient, index) =>
    renderEmail(
      template,
      { recipient, school: SCHOOL, demo: true, linkBase },
      templateDataFor(template, recipient, index) as Record<string, any>
    )
  )

  const test = testRecipients()

  if (mode === 'preview') {
    return NextResponse.json({
      mode: 'preview',
      template,
      title: TEMPLATE_TITLES[template],
      recipients: everyone.length,
      sendable: recipients.length,
      subject: rendered[0]?.subject,
      to: rendered[0]?.to.email,
      html: rendered[0]?.html,
      text: rendered[0]?.text,
      provider: status.provider,
      note: status.note,
      testMode: test.enabled ? test.list : null,
    })
  }

  // Test mode: keep the rendered school message, change only the envelope.
  const messages: RenderedEmail[] = test.enabled
    ? test.list.map((email) => ({
        ...rendered[0],
        to: { email, name: 'Test recipient' },
        subject: `[TEST] ${rendered[0].subject}`,
      }))
    : rendered

  // A human pressed "send": keep two sends of the same template apart.
  const key = `${status.provider}:${role}:${template}`
  const last = lastSend.get(key) ?? 0
  if (Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: 'That message was just sent. Give it a few seconds before sending again.' },
      { status: 429 }
    )
  }
  lastSend.set(key, Date.now())

  const auditId = randomUUID()
  const checkedAt = new Date().toISOString()
  const result = await deliver(messages)

  // Nothing left the building and the provider said why: that is a refusal,
  // not a partial success, so the buttons stay honest.
  if (result.delivered === 0 && result.error) {
    console.warn('[email:refused]', JSON.stringify({ auditId, role, template, provider: result.provider, error: result.error }))
    return NextResponse.json(
      {
        error: result.error,
        auditId,
        provider: result.provider,
        attempted: messages.length,
        delivered: 0,
        failed: result.failed,
        limits: providerStatus().limits,
      },
      { status: 502 }
    )
  }
  const copyTo = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || undefined
  const after = providerStatus()

  // The audit line is the record: who sent what, to how many, through which
  // provider, and whether it actually left the building.
  console.info(
    '[email]',
    JSON.stringify({
      auditId,
      at: checkedAt,
      role,
      template,
      audience: policy.audience,
      attempted: messages.length,
      testMode: test.enabled,
      provider: result.provider,
      delivered: result.delivered,
      failed: result.failed,
      error: result.error,
      ids: result.ids.slice(0, 3),
    })
  )

  return NextResponse.json({
    mode: 'send',
    auditId,
    checkedAt,
    template,
    title: TEMPLATE_TITLES[template],
    audience: policy.audience,
    audienceSize: everyone.length,
    attempted: messages.length,
    delivered: result.delivered,
    failed: result.failed,
    provider: result.provider,
    note: after.note,
    limits: after.limits,
    testMode: test.enabled ? test.list : null,
    sentTo: test.enabled ? test.list : undefined,
    copyTo: copyTo ?? null,
    error: result.error,
    subject: messages[0]?.subject,
  })
}
