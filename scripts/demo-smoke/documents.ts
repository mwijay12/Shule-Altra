/**
 * @fileOverview The document access policy, checked without a browser.
 *
 * Three things can go wrong with role-scoped documents, and all three are
 * silent in a demo that only ever logs in as admin:
 *
 *   1. a file stays in `public/` and is served by the static handler, no role
 *      involved — the gate exists in code but the URL never reaches it;
 *   2. the registry names a document that is not on disk (503 at the worst
 *      possible moment);
 *   3. the policy itself is wrong, e.g. a viewer can pull the defaulters list.
 *
 * Run with: npm run demo:docs
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
  DOCUMENTS,
  GENERATED_DOCUMENTS,
  ROLE_LABEL,
  canGenerateDocument,
  canOpenDocument,
  type DocRole,
} from '@/lib/documents/registry'

const PRIVATE = join(process.cwd(), 'private', 'printables')
const PUBLIC = join(process.cwd(), 'public', 'printables')

const ROLES: DocRole[] = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'BURSAR', 'VIEWER']

let failures = 0
function check(ok: boolean, label: string, detail = '') {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` · ${detail}` : ''}`)
}

function listPdfs(root: string): string[] {
  if (!existsSync(root)) return []
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) walk(path)
      else if (path.endsWith('.pdf')) out.push(relative(root, path))
    }
  }
  walk(root)
  return out.sort()
}

console.log('Document registry')
console.log('─'.repeat(72))

// 1. nothing sensitive is reachable as a static file
const stillPublic = listPdfs(PUBLIC)
check(
  stillPublic.length === 0,
  'public/printables is empty',
  stillPublic.length ? `${stillPublic.length} file(s) still world-readable` : 'no static PDFs'
)

// 2. every registered document exists in the private store
const onDisk = new Set(listPdfs(PRIVATE))
for (const doc of DOCUMENTS) {
  check(onDisk.has(doc.slug), `on disk · ${doc.slug}`, doc.sensitivity)
}

// and every private file is registered, so nothing is orphaned behind a URL
const registered = new Set(DOCUMENTS.map((doc) => doc.slug))
for (const file of onDisk) {
  check(registered.has(file), `registered · ${file}`)
}

// 3. the policy: public is public, restricted never leaks to a viewer
for (const doc of DOCUMENTS) {
  if (doc.sensitivity === 'restricted') {
    check(!doc.roles.includes('VIEWER'), `no viewer access · ${doc.slug}`)
    check(doc.roles.length > 0, `named roles · ${doc.slug}`, doc.roles.join(' + '))
  }
  if (doc.sensitivity === 'public') {
    check(doc.roles.length === 0, `public has no role list · ${doc.slug}`)
  }
}

// 4. the matrix a human would expect
const expectations: Array<[DocRole, string, boolean]> = [
  ['ADMIN', 'reports/fee-ledger.pdf', true],
  ['ADMIN', 'reports/staff-attendance.pdf', true],
  ['BURSAR', 'reports/fee-ledger.pdf', true],
  ['BURSAR', 'reports/master-sheet.pdf', false],
  ['TEACHER', 'reports/master-sheet.pdf', true],
  ['TEACHER', 'reports/fee-ledger.pdf', false],
  ['TEACHER', 'learner-id-cards.pdf', false],
  ['ACCOUNTANT', 'reports/expenditure.pdf', true],
  ['ACCOUNTANT', 'reports/class-rank.pdf', false],
  ['VIEWER', 'timetable.pdf', true],
  ['VIEWER', 'reports/subject-analysis.pdf', true],
  ['VIEWER', 'reports/defaulters.pdf', false],
  ['VIEWER', 'reports/master-sheet.pdf', false],
]
for (const [role, slug, expected] of expectations) {
  const actual = canOpenDocument(role, slug)
  check(actual === expected, `${ROLE_LABEL[role].padEnd(12)} → ${slug}`, actual ? 'allowed' : 'refused')
}

check(!canOpenDocument(null, 'reports/fee-ledger.pdf'), 'guest → fee ledger refused')
check(canOpenDocument(null, 'timetable.pdf'), 'guest → timetable allowed')

// 5. in-app builders obey the same roles
for (const id of Object.keys(GENERATED_DOCUMENTS)) {
  check(!canGenerateDocument(null, id), `guest cannot build · ${id}`)
}

// 6. a visible summary, so the demo can be explained in one screen
console.log('\nWho sees what')
console.log('─'.repeat(72))
for (const role of ROLES) {
  const open = DOCUMENTS.filter((doc) => canOpenDocument(role, doc.slug))
  console.log(
    `${ROLE_LABEL[role].padEnd(13)} ${String(open.length).padStart(2)}/${DOCUMENTS.length} documents · ${open
      .map((doc) => doc.slug.replace('reports/', '').replace('.pdf', ''))
      .join(', ')}`
  )
}
const guests = DOCUMENTS.filter((doc) => canOpenDocument(null, doc.slug))
console.log(`Guest         ${String(guests.length).padStart(2)}/${DOCUMENTS.length} documents · ${guests
  .map((doc) => doc.slug)
  .join(', ')}`)

console.log(
  failures === 0
    ? '\nDOCUMENT POLICY HOLDS — sensitive files are private, every role is enforced'
    : `\n${failures} DOCUMENT POLICY FAILURE(S)`
)
process.exit(failures === 0 ? 0 : 1)
