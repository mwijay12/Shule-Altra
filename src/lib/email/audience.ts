/**
 * @fileOverview Who an email is going to, resolved on the server, never on the
 * client.
 *
 * The browser may ask for "the fee reminder to the defaulters"; it may not hand
 * the server a list of addresses. Everything below is derived from the school's
 * own register, so a tampered request cannot widen the audience, and an
 * account with the wrong role never reaches this function at all.
 */

import { buildDemoDataset } from '@/lib/demo/seed-data'
import type { AudienceId, EmailTemplateId, Recipient } from './types'
import type { DocRole } from '@/lib/documents/registry'

type Collection = Record<string, any>

function buckets(): Record<string, Collection[]> {
  const dataset = buildDemoDataset() as Record<string, Collection>
  const out: Record<string, Collection[]> = {}
  for (const [path, data] of Object.entries(dataset)) {
    const parts = path.split('/')
    if (parts.length !== 4) continue
    const name = parts[2]
    ;(out[name] ??= []).push({ id: parts[3], ...data })
  }
  return out
}

/**
 * Guardians do not all have an address on file, a phone number is the norm in
 * Tanzania. Where one is missing we derive the school's parent alias, which is
 * exactly what the fees office would hand to a bulk-mail provider.
 */
export function guardianEmail(learner: Collection): string {
  if (typeof learner.guardianEmail === 'string' && learner.guardianEmail.includes('@')) {
    return learner.guardianEmail
  }
  const parts = String(learner.guardianName ?? 'parent guardian')
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .filter(Boolean)
  const first = parts[0]?.[0] ?? 'p'
  const last = parts[parts.length - 1] ?? 'guardian'
  return `${first}.${last}@parents.mnyerere.sc.tz`
}

function guardianRecipient(learner: Collection): Recipient {
  return {
    email: guardianEmail(learner),
    name: String(learner.guardianName ?? 'Parent / Guardian').replace(/\s+/g, ' '),
    learner: String(learner.name ?? 'Learner'),
    className: String(learner.class ?? ''),
  }
}

export function buildAudience(id: AudienceId): Recipient[] {
  const data = buckets()
  const learners = data.students ?? []
  const staff = data.staff ?? []

  switch (id) {
    case 'fee-defaulters':
      return learners
        .filter((learner) => Number(learner.balance ?? 0) > 0)
        .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
        .map(guardianRecipient)

    case 'absent-today':
      return learners
        .filter((learner) => learner.attendanceStatus === 'Absent')
        .map(guardianRecipient)

    case 'term-results':
      return learners
        .filter((learner) => (data.grades ?? []).some((grade) => grade.studentId === learner.id))
        .map(guardianRecipient)

    case 'all-teachers':
      return staff
        .filter((member) => String(member.role ?? '').toUpperCase() === 'TEACHER')
        .map((member) => ({
          email: String(member.email ?? '').toLowerCase(),
          name: String(member.fullName ?? 'Teacher'),
        }))
        .filter((recipient) => recipient.email.includes('@'))

    case 'all-staff':
      return staff
        .map((member) => ({
          email: String(member.email ?? '').toLowerCase(),
          name: String(member.fullName ?? 'Staff member'),
        }))
        .filter((recipient) => recipient.email.includes('@'))

    default:
      return []
  }
}

const FINANCE: DocRole[] = ['ADMIN', 'ACCOUNTANT', 'BURSAR']
const SCHOOL_OFFICE: DocRole[] = ['ADMIN', 'TEACHER']

export type EmailPolicy = {
  title: string
  audience: AudienceId
  roles: DocRole[]
  /** why this audience is restricted, shown in the UI */
  reason: string
  /** the values a template needs that only the register knows */
  context: 'fee' | 'attendance' | 'academic' | 'staff' | 'timetable'
}

export const EMAIL_POLICY: Record<EmailTemplateId, EmailPolicy> = {
  'fee-reminder': {
    title: 'Fee reminder',
    audience: 'fee-defaulters',
    roles: FINANCE,
    reason: 'Names and balances of families in arrears',
    context: 'fee',
  },
  'payment-received': {
    title: 'Payment receipt',
    audience: 'fee-defaulters',
    roles: FINANCE,
    reason: 'Amounts, references and remaining balances',
    context: 'fee',
  },
  'absence-alert': {
    title: 'Absence alert',
    audience: 'absent-today',
    roles: SCHOOL_OFFICE,
    reason: 'A named learner’s attendance',
    context: 'attendance',
  },
  'report-card-ready': {
    title: 'Report card ready',
    audience: 'term-results',
    roles: SCHOOL_OFFICE,
    reason: 'Grades and division of a named learner',
    context: 'academic',
  },
  'staff-briefing': {
    title: 'Staff briefing',
    audience: 'all-teachers',
    roles: ['ADMIN'],
    reason: 'Internal staff communication',
    context: 'staff',
  },
  'timetable-change': {
    title: 'Timetable change',
    audience: 'all-teachers',
    roles: SCHOOL_OFFICE,
    reason: 'Teaching allocations that affect staff',
    context: 'timetable',
  },
}

export function canSendTemplate(role: DocRole | null, id: EmailTemplateId): boolean {
  if (!role) return false
  return EMAIL_POLICY[id]?.roles.includes(role) ?? false
}

/** Per-recipient values the template needs, pulled from the register. */
export function templateDataFor(
  id: EmailTemplateId,
  recipient: Recipient,
  seedIndex: number
): Record<string, unknown> {
  const data = buckets()
  const learner = (data.students ?? []).find((row) => row.name === recipient.learner)
  const ledger = data.transactions ?? []

  switch (id) {
    case 'fee-reminder':
      return {
        balance: Number(learner?.balance ?? 0),
        controlNumber: `CP-2026-${String(400000 + seedIndex * 7).padStart(8, '0')}`,
        className: learner?.class,
        when: '30 November 2026',
      }
    case 'payment-received': {
      const payment = ledger.find((row) => row.studentId === learner?.id) ?? {}
      return {
        amount: Number(payment.amount ?? 0) || 90000,
        reference: String(payment.controlNumber ?? `CP-2026-${400000 + seedIndex}`),
        balance: Number(learner?.balance ?? 0),
      }
    }
    case 'absence-alert':
      return { className: learner?.class, date: new Date().toLocaleDateString('en-GB') }
    case 'report-card-ready':
      return {
        division: String(learner?.division ?? ['I', 'II', 'III', 'IV'][seedIndex % 4]),
        average: 60 + (seedIndex % 24),
        className: learner?.class,
      }
    case 'staff-briefing':
      return { period: String(6 + (seedIndex % 3)) }
    case 'timetable-change':
      return { className: 'Form 2 A', when: 'Tuesday · Period 3' }
    default:
      return {}
  }
}
