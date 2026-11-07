/**
 * @fileOverview Branded school email, in the same blue → violet identity as the
 * hub, written as table-based HTML with inline styles so Gmail, Outlook and
 * phone clients all render the same thing.
 *
 * Rules this file keeps:
 *   – one layout, many messages: `layout()` owns the chrome (crest, gradient
 *     rule, footer, PDPA line), each template only supplies the body;
 *   – every message answers three questions: what happened, what it costs the
 *     reader, what to do next;
 *   – no external images, no webfonts, no CSS variables — those break in mail.
 */

import type { EmailTemplateId, RenderedEmail, Recipient } from './types'

const BRAND = {
  navy: '#0e1130',
  ink: '#111a24',
  blue: '#1f5ba6',
  violet: '#7c5ae0',
  paper: '#f6f8fc',
  line: '#e2e8f0',
  muted: '#5b6879',
}

export const SCHOOL = {
  name: 'Mwalimu Nyerere Secondary School',
  short: 'Shule Altra',
  address: 'Plot 14, Nelson Mandela Road, Dar es Salaam',
  phone: '+255 22 215 0044',
  region: 'Dar es Salaam · Tanzania',
}

export const FROM_FALLBACK = `Shule Altra <no-reply@shulealtra.co.tz>`

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function money(amount: number) {
  return `TZS ${Math.round(amount).toLocaleString('en-US')}`
}

type Block =
  | { kind: 'lede'; text: string }
  | { kind: 'facts'; rows: Array<[string, string]> }
  | { kind: 'callout'; label: string; value: string; note?: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] }
  | { kind: 'button'; label: string; href: string }
  | { kind: 'signature'; name: string; role: string }

const table = (rows: Array<[string, string]>) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0 6px;border-collapse:collapse">
    ${rows
      .map(
        ([label, value]) => `<tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BRAND.line};font:500 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${BRAND.muted}">${esc(label)}</td>
      <td align="right" style="padding:11px 0;border-bottom:1px solid ${BRAND.line};font:600 14px/1.4 Helvetica,Arial,sans-serif;color:${BRAND.ink}">${esc(value)}</td>
    </tr>`
      )
      .join('')}
  </table>`

function blockMarkup(block: Block) {
  switch (block.kind) {
    case 'lede':
      return `<p style="margin:0 0 18px;font:400 15px/1.65 Helvetica,Arial,sans-serif;color:${BRAND.ink}">${esc(block.text)}</p>`
    case 'paragraph':
      return `<p style="margin:0 0 16px;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:${BRAND.muted}">${esc(block.text)}</p>`
    case 'facts':
      return table(block.rows)
    case 'callout':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;border-collapse:separate">
        <tr><td style="padding:20px 22px;border-radius:14px;background:${BRAND.paper};border:1px solid ${BRAND.line}">
          <div style="font:600 10px/1 Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.muted}">${esc(block.label)}</div>
          <div style="margin-top:8px;font:600 26px/1.1 Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:${BRAND.blue}">${esc(block.value)}</div>
          ${block.note ? `<div style="margin-top:8px;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:${BRAND.muted}">${esc(block.note)}</div>` : ''}
        </td></tr></table>`
    case 'bullets':
      return `<ul style="margin:0 0 18px;padding-left:18px;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:${BRAND.muted}">
        ${block.items.map((item) => `<li style="margin-bottom:6px">${esc(item)}</li>`).join('')}
      </ul>`
    case 'button':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px">
        <tr><td style="border-radius:999px;background:${BRAND.blue};background-image:linear-gradient(135deg,${BRAND.blue},${BRAND.violet})">
          <a href="${esc(block.href)}" style="display:inline-block;padding:13px 26px;font:600 13px/1 Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;border-radius:999px">${esc(block.label)}</a>
        </td></tr></table>`
    case 'signature':
      return `<p style="margin:26px 0 0;font:400 13px/1.6 Helvetica,Arial,sans-serif;color:${BRAND.muted}">
        ${esc(block.name)}<br/><span style="color:${BRAND.ink}">${esc(block.role)}</span>
      </p>`
  }
}

export function layout(options: {
  preheader: string
  eyebrow: string
  title: string
  blocks: Block[]
}) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<title>${esc(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(options.preheader)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.paper};padding:28px 12px">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:#ffffff;border:1px solid ${BRAND.line};border-radius:18px;overflow:hidden">
      <tr><td style="height:5px;background:${BRAND.blue};background-image:linear-gradient(90deg,${BRAND.blue},${BRAND.violet});font-size:0;line-height:0">&nbsp;</td></tr>
      <tr><td style="padding:26px 30px 6px">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td>
            <div style="font:700 15px/1 Helvetica,Arial,sans-serif;color:${BRAND.ink};letter-spacing:-.01em">Shule Altra</div>
            <div style="margin-top:5px;font:500 9px/1 Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.muted}">${esc(SCHOOL.name)}</div>
          </td>
          <td align="right">
            <div style="display:inline-block;width:34px;height:34px;border-radius:10px;background:${BRAND.blue};background-image:linear-gradient(135deg,${BRAND.blue},${BRAND.violet});color:#fff;font:700 17px/34px Helvetica,Arial,sans-serif;text-align:center">A</div>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 30px 0">
        <div style="font:600 10px/1 Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.violet}">${esc(options.eyebrow)}</div>
        <h1 style="margin:12px 0 18px;font:600 25px/1.2 Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:${BRAND.ink}">${esc(options.title)}</h1>
      </td></tr>
      <tr><td style="padding:0 30px 30px">
        ${options.blocks.map(blockMarkup).join('\n')}
      </td></tr>
      <tr><td style="padding:20px 30px 26px;border-top:1px solid ${BRAND.line};background:#fbfcfe">
        <p style="margin:0;font:400 11px/1.7 Helvetica,Arial,sans-serif;color:${BRAND.muted}">
          ${esc(SCHOOL.name)} · ${esc(SCHOOL.address)} · ${esc(SCHOOL.phone)}<br/>
          Sent by the school office through Shule Altra. Your child’s records are held under the
          Personal Data Protection Act 2022 and are visible only to staff with the role to see them.
        </p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font:400 10px/1.6 Helvetica,Arial,sans-serif;color:#8b97a8;max-width:580px">
      ${esc(SCHOOL.region)} · This message was generated from the school’s own register.
    </p>
  </td></tr>
</table>
</body></html>`
}

function toText(title: string, blocks: Block[]) {
  const lines = [title, '']
  for (const block of blocks) {
    if (block.kind === 'lede' || block.kind === 'paragraph') lines.push(block.text, '')
    if (block.kind === 'facts') block.rows.forEach(([label, value]) => lines.push(`${label}: ${value}`))
    if (block.kind === 'callout') lines.push(`${block.label}: ${block.value}`, block.note ?? '', '')
    if (block.kind === 'bullets') lines.push(...block.items.map((item) => `- ${item}`), '')
    if (block.kind === 'button') lines.push(`${block.label}: ${block.href}`, '')
    if (block.kind === 'signature') lines.push(block.name, block.role, '')
  }
  lines.push('—', `${SCHOOL.name} · ${SCHOOL.phone}`)
  return lines.join('\n')
}

export type TemplateContext = {
  recipient: Recipient
  school: typeof SCHOOL
  demo: boolean
  linkBase: string
}

/** One switch, one place — every message the school sends lives here. */
export function renderEmail(
  id: EmailTemplateId,
  ctx: TemplateContext,
  data: {
    balance?: number
    controlNumber?: string
    className?: string
    date?: string
    division?: string
    average?: number
    amount?: number
    reference?: string
    period?: string
    message?: string
    when?: string
  } = {}
): RenderedEmail {
  const name = ctx.recipient.name.split(' ')[0] ?? 'Parent'
  const learner = ctx.recipient.learner ?? 'your child'
  const today = data.date ?? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const base = {
    'fee-reminder': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, our ledger for Term 2 2026 still shows an open balance for ${learner} (${ctx.recipient.className ?? data.className ?? 'Form 2'}).` },
        { kind: 'callout', label: 'Outstanding balance', value: money(data.balance ?? 0), note: `Control number ${data.controlNumber ?? 'CP-2026-000000'} · payable by ${data.when ?? '30 November 2026'}` },
        { kind: 'facts', rows: [['Learner', learner], ['Class', ctx.recipient.className ?? data.className ?? '—'], ['Term', 'Term 2 · 2026'], ['Statement date', today]] },
        { kind: 'paragraph', text: 'Pay through ClickPesa, Beem or the school bank account using the control number above. The bursar’s office matches every payment to the learner’s record the same working day.' },
        { kind: 'button', label: 'Open the fee statement', href: `${ctx.linkBase}/login?demo=1` },
        { kind: 'signature', name: 'CPA. Abdulrazaq Mtenga', role: 'Bursar · Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Fee balance for ${learner} · Term 2 2026`, eyebrow: 'Finance · fee reminder', title: 'A balance is still open on the register', blocks }
    },
    'absence-alert': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, ${learner} was marked absent at the 07:40 register this morning. This is the third absence this term.` },
        { kind: 'facts', rows: [['Learner', learner], ['Class', ctx.recipient.className ?? '—'], ['Register', 'Morning · 07:40'], ['Date', today]] },
        { kind: 'paragraph', text: 'Please reply to this message or call the school office so the class master can record a reason. Unreported absences are followed up by the discipline office after three days.' },
        { kind: 'bullets', items: ['Reply with the reason for absence', 'Send a medical note if the absence exceeds three days', 'Collect missed work from the class master'] },
        { kind: 'signature', name: 'Mwl. Neema Kessy', role: 'Academic Master · Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Absence recorded for ${learner} · ${today}`, eyebrow: 'Attendance · morning register', title: 'Your child was not in class this morning', blocks }
    },
    'report-card-ready': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, Term 2 results for ${learner} are published on the NECTA matrix and the report card is ready.` },
        { kind: 'callout', label: 'Division', value: data.division ?? 'I', note: `Average ${data.average?.toFixed(1) ?? '—'}% · Term 2 2026` },
        { kind: 'facts', rows: [['Learner', learner], ['Class', ctx.recipient.className ?? '—'], ['Grading', 'NECTA CSEE'], ['Published', today]] },
        { kind: 'paragraph', text: 'The report card carries grade points per subject, class position, conduct and the head master’s remarks. It is a vector PDF — it prints cleanly and the marks are selectable text.' },
        { kind: 'button', label: 'Open the report card', href: `${ctx.linkBase}/login?demo=1` },
        { kind: 'signature', name: 'Dr. Josephat Mwakalinga', role: 'Head Master · Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Term 2 report card ready for ${learner}`, eyebrow: 'Academics · results published', title: 'The report card is ready to collect', blocks }
    },
    'payment-received': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, we have received a payment for ${learner} and matched it to the ledger.` },
        { kind: 'callout', label: 'Amount received', value: money(data.amount ?? 0), note: `Reference ${data.reference ?? 'CP-2026-000000'} · ${today}` },
        { kind: 'facts', rows: [['Learner', learner], ['Remaining balance', money(data.balance ?? 0)], ['Method', 'ClickPesa'], ['Recorded by', 'Bursar’s office']] },
        { kind: 'paragraph', text: 'This receipt is your record of payment. The same movement appears on the school’s fee ledger and on the statement you can print at any time.' },
        { kind: 'signature', name: 'Fees office', role: 'Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Payment received · ${money(data.amount ?? 0)} for ${learner}`, eyebrow: 'Finance · receipt', title: 'Payment received and matched', blocks }
    },
    'staff-briefing': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, this is the weekly staff briefing for week ${data.period ?? '7'} of Term 2.` },
        { kind: 'facts', rows: [['When', data.when ?? 'Friday · 14:00'], ['Where', 'Staff room · Block A'], ['Chair', 'Academic Master'], ['Attendance', 'All teaching staff']] },
        { kind: 'bullets', items: data.message ? data.message.split('\n').filter(Boolean) : ['Marks for Form 4 mock examinations close on Wednesday', 'Parent meeting for Form 2 on Saturday at 09:00', 'Timetable reprint takes effect from Monday'] },
        { kind: 'paragraph', text: 'Bring your class registers. Anything that needs the head master’s signature should reach the office before Thursday.' },
        { kind: 'signature', name: 'Mwl. Neema Kessy', role: 'Academic Master · Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Staff briefing · week ${data.period ?? '7'} · Term 2`, eyebrow: 'Staff · weekly briefing', title: 'This week on the staff noticeboard', blocks }
    },
    'timetable-change': () => {
      const blocks: Block[] = [
        { kind: 'lede', text: `Dear ${name}, one of your periods has changed. The register will show the new slot from the date below.` },
        { kind: 'facts', rows: [['Class', data.className ?? 'Form 2 A'], ['New slot', data.when ?? 'Tuesday · Period 3'], ['Subject', data.message?.split('\n')[0] ?? 'Physics'], ['Room', data.message?.split('\n')[1] ?? 'Lab 2']] },
        { kind: 'paragraph', text: 'The timetable PDF in the hub is regenerated from the same allocation, so what you print matches what the learners see.' },
        { kind: 'button', label: 'Open the timetable', href: `${ctx.linkBase}/dashboard/timetable` },
        { kind: 'signature', name: 'Academic office', role: 'Mwalimu Nyerere Secondary School' },
      ]
      return { subject: `Timetable change · ${data.className ?? 'Form 2 A'} · ${data.when ?? 'Tuesday' }`, eyebrow: 'Operations · timetable', title: 'A period has moved', blocks }
    },
  }[id]

  const built = base()
  return {
    to: ctx.recipient,
    subject: built.subject,
    html: layout({ preheader: built.subject, eyebrow: built.eyebrow, title: built.title, blocks: built.blocks }),
    text: toText(built.title, built.blocks),
  }
}

export const TEMPLATE_TITLES: Record<EmailTemplateId, string> = {
  'fee-reminder': 'Fee reminder (guardian)',
  'absence-alert': 'Absence alert (guardian)',
  'report-card-ready': 'Report card ready (guardian)',
  'payment-received': 'Payment receipt (guardian)',
  'staff-briefing': 'Weekly staff briefing (teachers)',
  'timetable-change': 'Timetable change (teachers)',
}
