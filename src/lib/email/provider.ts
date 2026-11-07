/**
 * @fileOverview Delivery: SMTP first, Resend second, a dry run always.
 *
 * The provider is chosen by environment, never by a build flag:
 *
 *   SMTP_HOST + SMTP_USER + SMTP_PASS  → Nodemailer over SMTP (Gmail, Zoho,
 *                                        a school's own cPanel mailbox, SES…)
 *   RESEND_API_KEY                     → Resend batch endpoint
 *   neither                            → dry run: every message is rendered in
 *                                        full and counted, nothing leaves.
 *
 * A school that has neither key still sees exactly what parents would receive,
 * which is what keeps the demo honest.
 *
 * Two guards exist because the most common provider here — Gmail — punishes
 * bursts and then silently starts dropping mail:
 *
 *   – a per-send ceiling (`SMTP_MAX_PER_SEND`, default 200), refused up front
 *     rather than truncated;
 *   – a per-day budget (`SMTP_DAILY_LIMIT`, default 400) held in the instance,
 *     so ten clicks in five minutes cannot burn a Workspace mailbox.
 *
 * Both are reported to the UI before anything is sent, and the daily counter
 * resets at midnight Dar es Salaam time.
 */

import { FROM_FALLBACK } from './templates'
import type { ProviderId, RenderedEmail, SendOutcome } from './types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails/batch'
const RESEND_BATCH = 100

/** How many SMTP messages are in flight at once. Gmail likes a slow queue. */
const SMTP_CONCURRENCY = 5
/** Pause between waves of SMTP sends, in ms. */
const SMTP_PACE_MS = 120

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  replyTo?: string
  adminCopy?: string
}

export type ProviderStatus = {
  provider: ProviderId
  from: string
  /** a short human sentence the UI shows verbatim */
  note: string
  /** where the mail physically leaves from, when that is knowable */
  host?: string
  limits: {
    /** largest audience one click may address with this provider */
    maxPerSend: number
    /** SMTP only: messages still allowed today */
    dailyLimit?: number
    dailyRemaining?: number
  }
}

type Env = Record<string, string | undefined>

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

const clean = (value: string | undefined) => value?.trim().replace(/^['"]|['"]$/g, '') ?? ''

/**
 * Gmail, Outlook and Zoho all hand out app passwords in groups of four
 * (`abcd efgh ijkl mnop`). People paste them with the spaces; SMTP wants them
 * without. Stripping whitespace here is the difference between a working
 * mailbox and an `EAUTH` nobody can explain.
 */
export function normaliseSecret(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '')
}

export function readSmtpConfig(env: Env = process.env): SmtpConfig | null {
  const host = clean(env.SMTP_HOST)
  const user = clean(env.SMTP_USER)
  const pass = normaliseSecret(env.SMTP_PASS)
  if (!host || !user || !pass) return null

  const parsedPort = Number.parseInt(clean(env.SMTP_PORT) || '465', 10)
  const port = Number.isFinite(parsedPort) ? parsedPort : 465

  // Port decides TLS, not the env file. A school that copies a template with
  // SMTP_SECURE=true and then switches to 587 gets a connection that opens and
  // never greets — the single most common SMTP support ticket there is.
  const secure =
    port === 587
      ? false
      : port === 465
        ? true
        : env.SMTP_SECURE === undefined || clean(env.SMTP_SECURE) === ''
          ? true
          : clean(env.SMTP_SECURE).toLowerCase() === 'true'

  return {
    host,
    port,
    secure,
    user,
    pass,
    from: clean(env.SMTP_FROM) || clean(env.EMAIL_FROM) || FROM_FALLBACK,
    replyTo: clean(env.EMAIL_REPLY_TO) || clean(env.SMTP_REPLY_TO) || undefined,
    adminCopy: clean(env.ADMIN_NOTIFICATION_EMAIL) || undefined,
  }
}

export function emailFrom(env: Env = process.env): string {
  const smtp = readSmtpConfig(env)
  return smtp?.from ?? (clean(env.EMAIL_FROM) || FROM_FALLBACK)
}

const intFrom = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(clean(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function maxPerSend(env: Env = process.env): number {
  return intFrom(env.SMTP_MAX_PER_SEND, 200)
}

export function dailyLimit(env: Env = process.env): number {
  return intFrom(env.SMTP_DAILY_LIMIT, 400)
}

/* -------------------------------------------------------------------------- */
/*  Daily budget                                                              */
/* -------------------------------------------------------------------------- */

const DAY_MS = 86_400_000
/** UTC+3 — the school's own midnight, not the server's. */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

function todayInDar(): string {
  return new Date(Date.now() + EAT_OFFSET_MS).toISOString().slice(0, 10)
}

const spent = { day: todayInDar(), count: 0 }

function readSpent() {
  if (spent.day !== todayInDar()) {
    spent.day = todayInDar()
    spent.count = 0
  }
  return spent
}

/** Exposed so the smoke suite can prove the rollover without waiting a day. */
export function dailyUsage(): { day: string; used: number; limit: number; remaining: number } {
  const state = readSpent()
  const limit = dailyLimit()
  return { day: state.day, used: state.count, limit, remaining: Math.max(limit - state.count, 0) }
}

function noteDelivery(count: number) {
  const state = readSpent()
  state.count = Math.min(state.count + count, dailyLimit())
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                    */
/* -------------------------------------------------------------------------- */

export function providerStatus(env: Env = process.env): ProviderStatus {
  const smtp = readSmtpConfig(env)
  const usage = dailyUsage()

  if (smtp) {
    const copy = smtp.adminCopy ? ` · office copy to ${smtp.adminCopy}` : ''
    return {
      provider: 'smtp',
      from: smtp.from,
      host: `${smtp.host}:${smtp.port}`,
      note: `SMTP connected via ${smtp.host} — ${usage.remaining} of ${usage.limit} messages left today${copy}.`,
      limits: {
        maxPerSend: maxPerSend(env),
        dailyLimit: usage.limit,
        dailyRemaining: usage.remaining,
      },
    }
  }

  if (clean(env.RESEND_API_KEY)) {
    return {
      provider: 'resend',
      from: emailFrom(env),
      host: 'api.resend.com',
      note: 'Resend connected — guardians and staff receive these from the school’s own address.',
      limits: { maxPerSend: Math.max(maxPerSend(env), 400) },
    }
  }

  return {
    provider: 'dry-run',
    from: emailFrom(env),
    note: 'Dry run — messages are rendered and counted but not delivered. Add SMTP_HOST/SMTP_USER/SMTP_PASS or RESEND_API_KEY to send for real.',
    limits: { maxPerSend: maxPerSend(env) },
  }
}

/* -------------------------------------------------------------------------- */
/*  The demo guard                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The demo register is invented: `e.mushi@parents.mnyerere.sc.tz` is a name,
 * not a mailbox. Pointing a live Gmail account at 97 of those would earn a
 * bounce for every message and a reputation that takes weeks to repair.
 *
 * So live delivery refuses demo addresses unless the operator says, in as many
 * words, that they mean it. The dry run and the previews are untouched.
 */
const DEMO_DOMAINS = ['parents.mnyerere.sc.tz', 'shule.pro', 'example.co.tz', 'example.com']

export function demoDeliveryBlocked(env: Env = process.env): boolean {
  const optedIn = clean(env.EMAIL_ALLOW_DEMO_DELIVERY).toLowerCase() === 'true'
  const demoMode = clean(env.NEXT_PUBLIC_DEMO_MODE) !== 'false'
  return demoMode && !optedIn
}

/** True when every address is one of the invented demo mailboxes. */
export function isDemoAddress(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  return DEMO_DOMAINS.includes(domain)
}

export function demoAddresses(messages: RenderedEmail[]): number {
  return messages.filter((message) => isDemoAddress(message.to.email)).length
}

/* -------------------------------------------------------------------------- */
/*  Delivery                                                                  */
/* -------------------------------------------------------------------------- */

type NodemailerTransport = {
  sendMail: (options: Record<string, unknown>) => Promise<{ messageId?: string; rejected?: string[] }>
  verify: () => Promise<true>
}

let transport: NodemailerTransport | null = null
let transportKey = ''

async function smtpTransport(config: SmtpConfig): Promise<NodemailerTransport> {
  const key = `${config.host}:${config.port}:${config.user}`
  if (transport && transportKey === key) return transport

  const { default: nodemailer } = await import('nodemailer')
  transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    pool: true,
    maxConnections: SMTP_CONCURRENCY,
    maxMessages: 50,
    // A school mailbox behind a strict relay often has a self-signed cert.
    ...(config.port === 587 ? { requireTLS: true } : {}),
  }) as unknown as NodemailerTransport
  transportKey = key
  return transport
}

/**
 * Codes that mean "this mailbox will refuse every message alike". Retrying
 * them per-recipient is how a school ends up locked out of its own Gmail.
 */
const FATAL_SMTP_CODES = new Set([
  'EAUTH',
  'ECONNECTION',
  'ETIMEDOUT',
  'ESOCKET',
  'ENOTFOUND',
  'EDNS',
])

/** Turns nodemailer's codes into something a bursar can act on. */
function explainSmtp(cause: unknown): string {
  const error = cause as { code?: string; response?: string; message?: string }
  const code = error?.code ?? ''
  if (code === 'EAUTH') {
    return 'The mail server rejected the username or app password (EAUTH). For Gmail, create a fresh App Password at myaccount.google.com/apppasswords and paste it as SMTP_PASS.'
  }
  if (code === 'EENVELOPE') {
    return 'The mail server refused one of the recipient addresses (EENVELOPE).'
  }
  if (code === 'ECONNECTION' || code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ENOTFOUND' || code === 'EDNS') {
    return `Could not reach ${readSmtpConfig()?.host ?? 'the mail server'} (${code}). Check SMTP_HOST/SMTP_PORT and whether the host allows outbound SMTP.`
  }
  return error?.response?.trim() || error?.message || 'The mail server refused the message.'
}

async function deliverSmtp(
  messages: RenderedEmail[],
  config: SmtpConfig,
  onProgress?: (sent: number) => void
): Promise<SendOutcome> {
  const ids: string[] = []
  let delivered = 0
  let failed = 0
  let error: string | undefined

  let mailer: NodemailerTransport
  try {
    mailer = await smtpTransport(config)
  } catch (cause) {
    return {
      provider: 'smtp',
      delivered: 0,
      failed: messages.length,
      ids,
      error: cause instanceof Error ? cause.message : 'Nodemailer could not be loaded.',
    }
  }

  // Prove the login before addressing anybody: a wrong app password should
  // cost one round trip, not one failed message per guardian.
  try {
    await mailer.verify()
  } catch (cause) {
    return {
      provider: 'smtp',
      delivered: 0,
      failed: messages.length,
      ids,
      error: explainSmtp(cause),
    }
  }

  const send = async (message: RenderedEmail) => {
    const bcc = config.adminCopy && config.adminCopy.toLowerCase() !== message.to.email.toLowerCase()
      ? config.adminCopy
      : undefined

    try {
      const info = await mailer.sendMail({
        from: config.from,
        to: { name: message.to.name, address: message.to.email },
        bcc,
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(config.replyTo ? { replyTo: config.replyTo } : {}),
        headers: { 'X-Shule-Altra': 'guardian-mail' },
      })
      delivered += 1
      if (info?.messageId) ids.push(info.messageId)
      onProgress?.(delivered)
    } catch (cause) {
      failed += 1
      const code = (cause as { code?: string })?.code ?? ''
      error = error ?? explainSmtp(cause)
      // Bad credentials or an unreachable host fail the same way 97 times.
      // Stop after the first one instead of hammering the mailbox.
      if (FATAL_SMTP_CODES.has(code)) throw cause
    }
  }

  for (let start = 0; start < messages.length; start += SMTP_CONCURRENCY) {
    const wave = messages.slice(start, start + SMTP_CONCURRENCY)
    try {
      await Promise.all(wave.map(send))
    } catch {
      const left = messages.length - delivered - failed
      failed += Math.max(left, 0)
      break
    }
    if (start + SMTP_CONCURRENCY < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, SMTP_PACE_MS))
    }
  }

  noteDelivery(delivered)
  return { provider: 'smtp', delivered, failed, ids, error }
}

type ResendResponse = { data?: Array<{ id?: string }>; message?: string; name?: string }

async function deliverResend(
  messages: RenderedEmail[],
  apiKey: string,
  from: string,
  replyTo: string | undefined,
  adminCopy: string | undefined
): Promise<SendOutcome> {
  const ids: string[] = []
  let delivered = 0
  let failed = 0
  let error: string | undefined

  for (let start = 0; start < messages.length; start += RESEND_BATCH) {
    const chunk = messages.slice(start, start + RESEND_BATCH)
    const payload = chunk.map((message) => ({
      from,
      to: [message.to.email],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(bccFor(message, adminCopy) ? { bcc: [adminCopy] } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }))

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json().catch(() => ({}))) as ResendResponse

      if (!response.ok) {
        failed += chunk.length
        error = body?.message ?? `Resend refused the batch (${response.status})`
        continue
      }

      const returned = body.data ?? []
      returned.forEach((row) => row.id && ids.push(row.id))
      delivered += Math.min(chunk.length, returned.length || chunk.length)
    } catch (cause) {
      failed += chunk.length
      error = cause instanceof Error ? cause.message : 'Network error while reaching Resend'
    }
  }

  return { provider: 'resend', delivered, failed, ids, error }
}

function bccFor(message: RenderedEmail, adminCopy: string | undefined): string | undefined {
  if (!adminCopy) return undefined
  return adminCopy.toLowerCase() === message.to.email.toLowerCase() ? undefined : adminCopy
}

export async function deliver(
  messages: RenderedEmail[],
  onProgress?: (sent: number) => void
): Promise<SendOutcome> {
  const status = providerStatus()

  if (messages.length === 0) {
    return { provider: status.provider, delivered: 0, failed: 0, ids: [] }
  }

  // Live provider + invented addresses = a bounce storm. Refuse, and say why.
  const invented = demoAddresses(messages)
  if (status.provider !== 'dry-run' && demoDeliveryBlocked() && invented > 0) {
    return {
      provider: status.provider,
      delivered: 0,
      failed: 0,
      ids: [],
      error: `${invented} of ${messages.length} addresses belong to the demo school and do not exist, so nothing was sent. Point the app at your real Firebase school (NEXT_PUBLIC_DEMO_MODE=false), or set EMAIL_ALLOW_DEMO_DELIVERY=true if you really do want to send to them.`,
    }
  }

  if (status.provider === 'smtp') {
    const config = readSmtpConfig()!
    return deliverSmtp(messages, config, onProgress)
  }

  if (status.provider === 'resend') {
    return deliverResend(
      messages,
      clean(process.env.RESEND_API_KEY),
      status.from,
      clean(process.env.EMAIL_REPLY_TO) || undefined,
      clean(process.env.ADMIN_NOTIFICATION_EMAIL) || undefined
    )
  }

  return {
    provider: 'dry-run',
    delivered: 0,
    failed: 0,
    ids: messages.map((_, index) => `dry-${Date.now()}-${index}`),
  }
}

/**
 * Verifies the mailbox without sending anything. Only SMTP can answer this
 * before a real message is attempted; Resend and dry runs report `null`.
 */
export async function verifyTransport(): Promise<{ ok: boolean; message: string } | null> {
  const config = readSmtpConfig()
  if (!config) return null
  try {
    const mailer = await smtpTransport(config)
    await mailer.verify()
    return { ok: true, message: `${config.host} accepted the login as ${config.user}.` }
  } catch (cause) {
    return { ok: false, message: explainSmtp(cause) }
  }
}
