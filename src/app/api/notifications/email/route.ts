/**
 * @fileOverview The school's outbound mail room.
 *
 *   GET  → what this role may send, to how many people, and whether mail is
 *          live (RESEND_API_KEY present) or a dry run.
 *   POST → render from the register, then deliver.
 *
 * The role comes from the same httpOnly cookie the document gate uses, so one
 * sign-in governs everything a staff member can do. Recipients are always
 * recomputed here from the school's own data — the browser never supplies an
 * address list, and `mode: "preview"` renders the exact HTML that would be
 * posted without sending it.
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
import { providerStatus, deliver } from '@/lib/email/provider'
import { SCHOOL, TEMPLATE_TITLES, renderEmail } from '@/lib/email/templates'
import type { EmailTemplateId, RenderedEmail } from '@/lib/email/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TEMPLATE_IDS = Object.keys(EMAIL_POLICY) as EmailTemplateId[]
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

export async function GET() {
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
      sample: recipients[0]?.email ?? null,
      allowed,
      reason: policy.reason,
      roles: policy.roles.map((entry) => ROLE_LABEL[entry]),
    }
  })

  return NextResponse.json({
    provider: status.provider,
    from: status.from,
    note: status.note,
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

  if (!canSendTemplate(role, template)) {
    const policy = EMAIL_POLICY[template]
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
  const policy = EMAIL_POLICY[template]
  const recipients = buildAudience(policy.audience).slice(0, MAX_RECIPIENTS)

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Nobody matches this audience today.' }, { status: 409 })
  }

  const linkBase = appUrl(request)
  const messages: RenderedEmail[] = recipients.map((recipient, index) =>
    renderEmail(
      template,
      { recipient, school: SCHOOL, demo: true, linkBase },
      templateDataFor(template, recipient, index) as Record<string, any>
    )
  )

  if (mode === 'preview') {
    return NextResponse.json({
      mode: 'preview',
      template,
      title: TEMPLATE_TITLES[template],
      recipients: recipients.length,
      subject: messages[0]?.subject,
      to: messages[0]?.to.email,
      html: messages[0]?.html,
      text: messages[0]?.text,
      provider: providerStatus().provider,
    })
  }

  // A human pressed "send": keep two sends of the same template apart.
  const key = `${role}:${template}`
  const last = lastSend.get(key) ?? 0
  if (Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json(
      { error: 'That message was just sent. Give it a few seconds before sending again.' },
      { status: 429 }
    )
  }
  lastSend.set(key, Date.now())

  const auditId = randomUUID()
  const result = await deliver(messages)

  // The audit line is the record: who sent what, to how many, through which
  // provider, and whether it actually left the building.
  console.info(
    '[email]',
    JSON.stringify({
      auditId,
      at: new Date().toISOString(),
      role,
      template,
      audience: policy.audience,
      attempted: messages.length,
      ...result,
    })
  )

  const status = providerStatus()
  return NextResponse.json({
    mode: 'send',
    auditId,
    template,
    title: TEMPLATE_TITLES[template],
    audience: policy.audience,
    attempted: messages.length,
    delivered: result.delivered,
    failed: result.failed,
    provider: result.provider,
    note: status.note,
    error: result.error,
    subject: messages[0]?.subject,
  })
}
