/**
 * @fileOverview The only door to a stored document.
 *
 * `public/printables` used to be world-readable: the fee ledger, the defaulters
 * register and the staff establishment could be pulled down by anyone holding
 * the link, with no session at all. The files now live in `private/printables`
 * and every request for one comes through here, where the registry decides.
 *
 *   public      → served to anyone (aggregates and notice-board documents)
 *   internal    → needs a session whose role is on the document's list
 *   restricted  → same rule, but the list is short (finance, admin, teachers)
 *
 * A refusal renders a page a person can read, not a JSON blob, because these
 * links are usually opened in a new tab by somebody clicking a card.
 */

import { NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'

import {
  DOCUMENT_BY_SLUG,
  ROLE_LABEL,
  canOpenDocument,
} from '@/lib/documents/registry'
import { serverRole } from '@/lib/auth/server-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PRIVATE_ROOT = join(process.cwd(), 'private', 'printables')

function page(options: {
  status: number
  eyebrow: string
  title: string
  body: string
  meta?: string[]
}) {
  const meta = (options.meta ?? [])
    .map(
      (line) =>
        `<span style="display:block;margin-top:6px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.45)">${line}</span>`
    )
    .join('')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${options.title} · Shule Altra</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;
  font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#fff;
  background:radial-gradient(60% 50% at 18% 8%,rgba(124,90,224,.55),transparent 62%),
  radial-gradient(55% 45% at 88% 92%,rgba(31,91,166,.5),transparent 60%),
  linear-gradient(158deg,#0e1130 0%,#1a1e45 44%,#2a2470 76%,#3b2a92 100%)">
  <div style="width:min(560px,100%)">
    <div style="display:flex;align-items:center;gap:10px;font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:rgba(255,255,255,.55)">
      <svg width="28" height="28" viewBox="0 0 40 40" role="img" aria-label="Shule Altra">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#d2c6ff"/></linearGradient></defs>
        <rect width="40" height="40" rx="11" fill="url(#g)" opacity="0.95"/>
        <path d="M20 8.2 31 11.9v9.7c0 5.3-4.6 8.6-11 10.7-6.4-2.1-11-5.4-11-10.7v-9.7z" fill="#141428"/>
        <path d="m14.9 20.4 3.5 3.6 6.9-7.6" fill="none" stroke="#ffffff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Shule Altra · Document registry
    </div>
    <p style="margin:40px 0 10px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#c3b2ff">${options.eyebrow}</p>
    <h1 style="margin:0;font-size:clamp(28px,5vw,40px);line-height:1.05;letter-spacing:-.03em;font-weight:600">${options.title}</h1>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.65;color:rgba(255,255,255,.72);max-width:44ch">${options.body}</p>
    ${meta}
    <div style="margin-top:32px;display:flex;flex-wrap:wrap;gap:10px">
      <a href="/login?demo=1" style="display:inline-flex;align-items:center;height:44px;padding:0 20px;border-radius:999px;
        background:linear-gradient(135deg,#1f5ba6,#7c5ae0);color:#fff;text-decoration:none;font-size:13px;font-weight:600">Sign in to the demo</a>
      <a href="/dashboard/reports" style="display:inline-flex;align-items:center;height:44px;padding:0 20px;border-radius:999px;
        border:1px solid rgba(255,255,255,.28);color:#fff;text-decoration:none;font-size:13px;font-weight:500">Back to the reports centre</a>
    </div>
    <p style="margin:36px 0 0;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.32)">
      PDPA 2022 · role-scoped access · request ${options.status}
    </p>
  </div>
</body></html>`

  return new NextResponse(html, {
    status: options.status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex',
    },
  })
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug: parts } = await context.params
  const slug = (parts ?? []).join('/')

  // Only registry entries exist as far as this route is concerned — which also
  // means no `..` traversal can reach a path the registry never named.
  const doc = DOCUMENT_BY_SLUG.get(slug)
  if (!doc) {
    return page({
      status: 404,
      eyebrow: 'Not found',
      title: 'No such document',
      body: 'The registry does not know this file. Documents are addressed by name, not by path, and only the ones in the register are served.',
    })
  }

  const role = await serverRole()

  if (!role && doc.sensitivity !== 'public') {
    return page({
      status: 401,
      eyebrow: 'Signed out',
      title: 'This document needs a session',
      body: `“${doc.title}” is ${doc.sensitivity === 'restricted' ? 'restricted' : 'internal'} — ${doc.reason}. Open the demo school and it will follow you in.`,
      meta: ['Allowed: ' + doc.roles.map((r) => ROLE_LABEL[r]).join(' · ')],
    })
  }

  if (!canOpenDocument(role, slug)) {
    return page({
      status: 403,
      eyebrow: 'Role refused',
      title: 'Not your document to open',
      body: `You are signed in as ${role ? ROLE_LABEL[role] : 'a guest'}. “${doc.title}” carries ${doc.reason.toLowerCase()}, so it stays with ${doc.roles.map((r) => ROLE_LABEL[r]).join(', ')}. Ask an administrator if you need it.`,
      meta: ['Signed in as ' + (role ? ROLE_LABEL[role] : 'guest')],
    })
  }

  // Belt and braces: the resolved path must stay inside the private store.
  const path = resolve(PRIVATE_ROOT, slug)
  if (!path.startsWith(resolve(PRIVATE_ROOT) + sep)) {
    return page({ status: 404, eyebrow: 'Not found', title: 'No such document', body: 'Path refused.' })
  }

  let bytes: Buffer
  try {
    bytes = await readFile(path)
  } catch {
    return page({
      status: 503,
      eyebrow: 'Registry out of sync',
      title: 'Document not on disk',
      body: `The register lists “${doc.title}”, but the file is missing from the private store. Re-run <code>npm run demo:pdf</code>.`,
    })
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${slug.split('/').pop()}"`,
      'content-length': String(bytes.byteLength),
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex',
      'x-document-role': role ?? 'public',
    },
  })
}
