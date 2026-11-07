/**
 * @fileOverview Delivery: Resend today, anything else tomorrow.
 *
 * The provider is chosen by environment, not by a build flag:
 *
 *   RESEND_API_KEY set  → real delivery through https://api.resend.com
 *   RESEND_API_KEY unset → dry run: every message is rendered in full, counted,
 *                          and handed back as a preview. Nothing leaves the box.
 *
 * That means the demo school keeps working offline and a school that is not
 * ready to pay for mail yet still sees exactly what parents would receive.
 */

import { FROM_FALLBACK } from './templates'
import type { RenderedEmail } from './types'

const RESEND_ENDPOINT = 'https://api.resend.com/emails/batch'
const BATCH_LIMIT = 100

export type ProviderStatus = {
  provider: 'resend' | 'dry-run'
  from: string
  /** a short human sentence the UI can show verbatim */
  note: string
}

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || FROM_FALLBACK
}

export function providerStatus(): ProviderStatus {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    return {
      provider: 'dry-run',
      from: emailFrom(),
      note: 'Dry run — messages are rendered and counted but not delivered. Add RESEND_API_KEY to send for real.',
    }
  }
  return {
    provider: 'resend',
    from: emailFrom(),
    note: 'Resend connected — guardians and staff receive these from the school’s own address.',
  }
}

type ResendBatchResponse = { data?: Array<{ id?: string }>; message?: string; name?: string }

export async function deliver(messages: RenderedEmail[]): Promise<{
  provider: 'resend' | 'dry-run'
  delivered: number
  failed: number
  ids: string[]
  error?: string
}> {
  const status = providerStatus()

  if (status.provider === 'dry-run') {
    return {
      provider: 'dry-run',
      delivered: 0,
      failed: 0,
      ids: messages.map((message, index) => `dry-${Date.now()}-${index}`),
    }
  }

  const key = process.env.RESEND_API_KEY!.trim()
  const replyTo = process.env.EMAIL_REPLY_TO?.trim()
  const ids: string[] = []
  let delivered = 0
  let failed = 0
  let error: string | undefined

  for (let start = 0; start < messages.length; start += BATCH_LIMIT) {
    const chunk = messages.slice(start, start + BATCH_LIMIT)
    const payload = chunk.map((message) => ({
      from: status.from,
      to: [message.to.email],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }))

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => ({}))) as ResendBatchResponse

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
