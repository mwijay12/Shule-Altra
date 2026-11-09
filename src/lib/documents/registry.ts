/**
 * @fileOverview One register of every document this product can produce, and
 * who is allowed to open it.
 *
 * Why it exists: the printables used to sit in `public/`, which meant the fee
 * ledger, the defaulters register and the staff establishment were one guessed
 * URL away from anyone who had the link. A student's fee statement and a
 * teacher's ID card are not marketing assets.
 *
 * So the PDFs moved out of `public/` into `private/printables/`, and this file
 * is the only thing that decides whether a request for one of them succeeds.
 * The route handler reads it, the UI reads it, the smoke test reads it, one
 * policy, no second opinion.
 *
 * Three sensitivities:
 *   public    , school-level aggregates, no learner-level personal data
 *   internal  , any signed-in staff member with the role listed
 *   restricted, money, identity or staff records; named roles only
 */

export type DocRole = 'ADMIN' | 'TEACHER' | 'ACCOUNTANT' | 'BURSAR' | 'VIEWER'

export type DocSensitivity = 'public' | 'internal' | 'restricted'

export type DocumentDef = {
  /** path inside the private store, e.g. `reports/fee-ledger.pdf` */
  slug: string
  title: string
  section: 'financial' | 'academic' | 'operations' | 'admin'
  sensitivity: DocSensitivity
  /** roles allowed to open it; ignored when sensitivity is `public` */
  roles: DocRole[]
  /** shown in the app when a role is not allowed to open the document */
  reason: string
}

const FINANCE: DocRole[] = ['ADMIN', 'ACCOUNTANT', 'BURSAR']
const ACADEMIC: DocRole[] = ['ADMIN', 'TEACHER']
const LEADERSHIP: DocRole[] = ['ADMIN']

export const DOCUMENTS: DocumentDef[] = [
  // ── financial ────────────────────────────────────────────────────────────
  {
    slug: 'reports/fee-ledger.pdf',
    title: 'Fee collection ledger',
    section: 'financial',
    sensitivity: 'restricted',
    roles: FINANCE,
    reason: 'Every learner’s payments and running balance',
  },
  {
    slug: 'reports/defaulters.pdf',
    title: 'Fee defaulters register',
    section: 'financial',
    sensitivity: 'restricted',
    roles: FINANCE,
    reason: 'Names and debt balances of 97 households',
  },
  {
    slug: 'reports/expenditure.pdf',
    title: 'Expenditure & petty cash',
    section: 'financial',
    sensitivity: 'restricted',
    roles: FINANCE,
    reason: 'Internal spending and imprest lines',
  },
  {
    slug: 'fee-statement.pdf',
    title: 'Learner fee statement',
    section: 'financial',
    sensitivity: 'restricted',
    roles: FINANCE,
    reason: 'Per-learner financial record',
  },
  {
    slug: 'reports/canteen-log.pdf',
    title: 'Canteen usage log',
    section: 'operations',
    sensitivity: 'restricted',
    roles: FINANCE,
    reason: 'Purchases traced to a named learner',
  },
  {
    slug: 'reports/asset-register.pdf',
    title: 'Asset register',
    section: 'operations',
    sensitivity: 'internal',
    roles: [...FINANCE, 'TEACHER'],
    reason: 'School property valuation',
  },

  // ── academic ─────────────────────────────────────────────────────────────
  {
    slug: 'reports/master-sheet.pdf',
    title: 'Master grade sheet',
    section: 'academic',
    sensitivity: 'restricted',
    roles: ACADEMIC,
    reason: 'Every mark of all 150 learners',
  },
  {
    slug: 'reports/class-rank.pdf',
    title: 'Class merit ranking',
    section: 'academic',
    sensitivity: 'internal',
    roles: ACADEMIC,
    reason: 'Ranks learners by name',
  },
  {
    slug: 'reports/student-attendance.pdf',
    title: 'Attendance register',
    section: 'academic',
    sensitivity: 'internal',
    roles: ACADEMIC,
    reason: 'Per-learner presence history',
  },
  {
    slug: 'report-card.pdf',
    title: 'NECTA report card',
    section: 'academic',
    sensitivity: 'internal',
    roles: ACADEMIC,
    reason: 'Grades, division and head remarks',
  },
  {
    slug: 'attendance-register.pdf',
    title: 'Class attendance register',
    section: 'academic',
    sensitivity: 'internal',
    roles: ACADEMIC,
    reason: 'Daily presence per learner',
  },
  {
    slug: 'class-ranking.pdf',
    title: 'Form ranking sheet',
    section: 'academic',
    sensitivity: 'internal',
    roles: ACADEMIC,
    reason: 'Merit order across streams',
  },
  {
    slug: 'reports/subject-analysis.pdf',
    title: 'Subject performance matrix',
    section: 'academic',
    sensitivity: 'public',
    roles: [],
    reason: 'Aggregate averages only — no learner is named',
  },

  // ── operations / registrar ───────────────────────────────────────────────
  {
    slug: 'timetable.pdf',
    title: 'Academic timetable',
    section: 'operations',
    sensitivity: 'public',
    roles: [],
    reason: 'A school timetable is a notice-board document',
  },
  {
    slug: 'learner-id-cards.pdf',
    title: 'Learner ID print sheet',
    section: 'operations',
    sensitivity: 'restricted',
    roles: LEADERSHIP,
    reason: 'Photographs, admission numbers and QR identities',
  },
  {
    slug: 'reports/staff-attendance.pdf',
    title: 'Staff establishment',
    section: 'admin',
    sensitivity: 'restricted',
    roles: LEADERSHIP,
    reason: 'Staff records, roles and contact details',
  },
]

export const DOCUMENT_BY_SLUG = new Map(DOCUMENTS.map((doc) => [doc.slug, doc]))

/**
 * In-app generators (built in the browser from data already on screen). They
 * are governed by the same roles as the stored documents they resemble.
 */
export const GENERATED_DOCUMENTS: Record<string, { title: string; roles: DocRole[]; reason: string }> = {
  ranking: { title: 'Class merit ranking', roles: ACADEMIC, reason: 'Ranks learners by name' },
  register: { title: 'Attendance register', roles: ACADEMIC, reason: 'Per-learner presence history' },
  statements: { title: 'Fee statements', roles: FINANCE, reason: 'Per-learner financial records' },
  ids: { title: 'Learner ID cards', roles: LEADERSHIP, reason: 'Photographs and identity numbers' },
}

/** The policy. Public documents need no session; everything else needs a role. */
export function canOpenDocument(role: DocRole | null, slug: string): boolean {
  const doc = DOCUMENT_BY_SLUG.get(slug)
  if (!doc) return false
  if (doc.sensitivity === 'public') return true
  if (!role) return false
  return doc.roles.includes(role)
}

export function canGenerateDocument(role: DocRole | null, id: string): boolean {
  const entry = GENERATED_DOCUMENTS[id]
  if (!entry) return false
  if (!role) return false
  return entry.roles.includes(role)
}

export function documentsForRole(role: DocRole | null): DocumentDef[] {
  return DOCUMENTS.filter((doc) => canOpenDocument(role, doc.slug))
}

/** Documents the page should show as locked, with the reason to display. */
export function lockedDocumentsForRole(role: DocRole | null): DocumentDef[] {
  return DOCUMENTS.filter((doc) => !canOpenDocument(role, doc.slug))
}

export const ROLE_LABEL: Record<DocRole, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  ACCOUNTANT: 'Accountant',
  BURSAR: 'Bursar',
  VIEWER: 'Viewer',
}

export function isDocRole(value: unknown): value is DocRole {
  return typeof value === 'string' && value in ROLE_LABEL
}
