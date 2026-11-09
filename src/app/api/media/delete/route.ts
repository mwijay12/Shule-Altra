/**
 * @fileOverview The only way a child's photograph is erased from Cloudinary.
 *
 * Cloudinary uploads are unsigned, so the browser holds no secret — which is why
 * it also cannot delete. Destruction needs a signed request, and the signature
 * needs `CLOUDINARY_API_SECRET`, which must never reach a browser.
 *
 * Two guards, because this deletes a face:
 *
 *   1. A session cookie whose role may touch the register (ADMIN, BURSAR).
 *   2. The public id must start with `schools/`, so a signed request can never
 *      be aimed at some other asset in the same Cloudinary account.
 *
 * Withdrawal of consent is a button in the learner profile; if this route fails,
 * the UI clears the field anyway and tells the school the file is still in the
 * media library — a broken promise in a log, not a silent one.
 */

import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'

import { serverRole } from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_ROLES = new Set(['ADMIN', 'BURSAR'])

function cloudName(): string {
  return (process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '').trim()
}

/** Cloudinary signature: sorted `key=value` pairs joined with `&`, then the secret. */
function sign(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(`${toSign}${secret}`).digest('hex')
}

export async function POST(request: Request) {
  const role = await serverRole()
  if (!role || !ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: 'Only an administrator or bursar can remove a learner photograph.' },
      { status: 403 }
    )
  }

  const apiKey = (process.env.CLOUDINARY_API_KEY ?? '').trim()
  const apiSecret = (process.env.CLOUDINARY_API_SECRET ?? '').trim()
  const cloud = cloudName()

  if (!apiKey || !apiSecret || !cloud) {
    return NextResponse.json(
      {
        error:
          'Cloudinary deletion is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).',
      },
      { status: 503 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as { publicId?: string }
  const publicId = (body.publicId ?? '').trim()

  // Never let a signed request point outside this school's learner folder.
  if (!publicId || publicId.startsWith('/') || publicId.includes('..') || !publicId.startsWith('schools/')) {
    return NextResponse.json({ error: 'That public id is not a learner photograph.' }, { status: 400 })
  }

  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = sign({ public_id: publicId, timestamp }, apiSecret)

  const form = new FormData()
  form.append('public_id', publicId)
  form.append('timestamp', timestamp)
  form.append('api_key', apiKey)
  form.append('signature', signature)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/destroy`, {
    method: 'POST',
    body: form,
  })

  const payload = (await response.json().catch(() => ({}))) as { result?: string; error?: { message?: string } }

  if (!response.ok) {
    return NextResponse.json(
      { error: payload.error?.message ?? `Cloudinary returned ${response.status}` },
      { status: 502 }
    )
  }

  // "not found" is a success for our purposes: the face is not there.
  return NextResponse.json({ result: payload.result ?? 'ok', publicId })
}
