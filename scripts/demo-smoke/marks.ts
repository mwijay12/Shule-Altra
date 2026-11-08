/**
 * @fileOverview The marks importer, tested the way a teacher will break it.
 *
 * A school's spreadsheet is never clean: `Adm No` in one column, `NAMBARI` in
 * another, subjects spelled by hand, a `-` where a mark is missing, a learner
 * who transferred out last term, and the same row pasted twice because the file
 * was edited on two laptops.
 *
 * This suite builds a real .xlsx in memory (not a JS object pretending to be a
 * spreadsheet), reads it back through the same path the browser uses, and
 * asserts what the preview would tell a teacher.
 *
 * Run with: npm run demo:marks
 */

import * as XLSX from 'xlsx'

import {
  canonicalSubject,
  mapHeaders,
  marksTemplateRows,
  parseMarks,
  parseScore,
} from '@/lib/academics/marks-import'

let failures = 0
const check = (ok: boolean, label: string, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? ` · ${detail}` : ''}`)
}

const SUBJECTS = [
  'Mathematics',
  'English',
  'Kiswahili',
  'Civics',
  'Physics',
  'Chemistry',
  'Biology',
  'Geography',
  'History',
  'Commerce',
]

const learners = [
  { id: 'ALT-2026-001', name: 'AMINA HASSAN MWINYI', class: 'Form 2' },
  { id: 'ALT-2026-004', name: 'BARAKA JOSEPH MUSHI', class: 'Form 2' },
  { id: 'ALT-2026-012', name: 'NEEMA SAID KOMBA', class: 'Form 1' },
]

/* -------------------------------------------------------------------------- */
/*  Values                                                                    */
/* -------------------------------------------------------------------------- */

check(parseScore('78') === 78, 'plain score')
check(parseScore(' 78% ') === 78, 'score with a percent sign')
check(parseScore('78,5') === 78.5, 'comma decimal, as typed on a phone')
check(parseScore('78 / 100') === 78, 'score written as a fraction')
check(parseScore('-') === null, 'a dash means not yet marked, not zero')
check(parseScore('') === null, 'an empty cell is not a zero')
check(parseScore('absent') === null, '"absent" is not a number')

check(canonicalSubject('mathematics', SUBJECTS) === 'Mathematics', 'lowercase subject')
check(canonicalSubject(' MATHS ', SUBJECTS) === 'Mathematics', 'shorthand subject')
check(canonicalSubject('hisabati', SUBJECTS) === 'Mathematics', 'Swahili subject name')
check(canonicalSubject('Kemia', SUBJECTS) === 'Chemistry', 'Swahili science subject')
check(canonicalSubject('Divinity', SUBJECTS) === null, 'a subject the school does not offer is refused')

const headers = mapHeaders(['Adm No', 'Jina', 'Somo', 'Alama'])
check(headers.missing.length === 0, 'Swahili headers are understood')
check(headers.columns.admissionNo === 0 && headers.columns.score === 3, 'columns map positionally')

const broken = mapHeaders(['Name', 'Class'])
check(broken.missing.some((entry) => entry.includes('score')), 'a sheet with no score column is refused')

/* -------------------------------------------------------------------------- */
/*  A real spreadsheet                                                        */
/* -------------------------------------------------------------------------- */

const messy = [
  { 'Adm No': 'ALT-2026-001', Jina: 'AMINA HASSAN MWINYI', Somo: 'Mathematics', Alama: '78' },
  { 'Adm No': 'ALT-2026-001', Jina: 'AMINA HASSAN MWINYI', Somo: 'English', Alama: '64%' },
  { 'Adm No': 'ALT-2026-004', Jina: 'BARAKA JOSEPH MUSHI', Somo: 'maths', Alama: 55 },
  { 'Adm No': 'ALT-2026-004', Jina: 'BARAKA JOSEPH MUSHI', Somo: 'Biology', Alama: '-' },
  { 'Adm No': 'ALT-2026-012', Jina: 'NEEMA SAID KOMBA', Somo: 'Kiswahili', Alama: 101 },
  { 'Adm No': 'ALT-2026-999', Jina: 'GHOST LEARNER', Somo: 'History', Alama: 60 },
  { 'Adm No': 'ALT-2026-001', Jina: 'AMINA HASSAN MWINYI', Somo: 'Mathematics', Alama: '82' },
  { 'Adm No': '', Jina: '', Somo: '', Alama: '' },
  { 'Adm No': 'ALT-2026-004', Jina: 'BARAKA JOSEPH MUSHI', Somo: 'Divinity', Alama: 70 },
]

const book = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(messy), 'Marks')
const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })

const reread = XLSX.read(buffer, { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(reread.Sheets[reread.SheetNames[0]], { defval: '' })

const result = parseMarks(rows, learners, { term: 'Term 2', examType: 'Annual', subjects: SUBJECTS })

check(result.stats.read === 8, 'blank rows are skipped', `${result.stats.read} read of 9`)
check(result.stats.valid === 3, 'only usable marks are kept', `${result.stats.valid} valid`)
check(result.stats.learners === 2, 'two learners have usable marks', `${result.stats.learners}`)
// Errors: score 101, a learner who left, a subject the school does not teach.
// Warnings: an unmarked subject, and the pasted-twice row.
check(result.stats.errors === 3, 'three rows cannot be imported', `${result.stats.errors} errors`)
check(result.stats.warnings === 2, 'two rows import with a note', `${result.stats.warnings} warnings`)

const aminaMaths = result.rows.find((row) => row.admissionNo === 'ALT-2026-001' && row.subject === 'Mathematics')
check(aminaMaths?.score === 82, 'a duplicated row keeps the last score', `score=${aminaMaths?.score}`)
check(
  result.issues.some((issue) => issue.message.includes('Duplicate of row')),
  'the duplicate is reported by row number'
)
check(
  result.rows.every((row) => row.subject !== 'Biology'),
  'an unmarked subject is not recorded as a zero'
)
check(
  result.issues.some((issue) => issue.message.includes('outside 0–100')),
  'a score of 101 is refused, not clamped'
)
check(
  result.issues.some((issue) => issue.message.includes('No learner on the register')),
  'a learner who is not on the register is refused'
)
check(
  result.issues.some((issue) => issue.message.includes('not a subject this school offers')),
  'an unknown subject is refused'
)
check(
  result.rows.every((row) => row.term === 'Term 2' && row.examType === 'Annual'),
  'the active term and exam are applied to every row'
)
check(result.stats.average !== null && result.stats.average > 0, 'the preview shows an average', `${result.stats.average}%`)

/* -------------------------------------------------------------------------- */
/*  Template round trip                                                       */
/* -------------------------------------------------------------------------- */

const templateRows = marksTemplateRows(learners, ['Mathematics', 'English'], { term: 'Term 2', examType: 'Annual' })
check(templateRows.length === 6, 'template has a row per learner per subject', `${templateRows.length} rows`)
check('Admission No' in templateRows[0] && 'Score' in templateRows[0], 'template headers match the parser')
check(templateRows[0].Score === '', 'the score column starts empty')

const templateBook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(templateBook, XLSX.utils.json_to_sheet(templateRows), 'Marks')
const templateBuffer = XLSX.write(templateBook, { type: 'buffer', bookType: 'xlsx' })
const templateReread = XLSX.read(templateBuffer, { type: 'buffer' })
const templateBack = XLSX.utils.sheet_to_json<Record<string, unknown>>(
  templateReread.Sheets[templateReread.SheetNames[0]],
  { defval: '' }
)

const emptyParse = parseMarks(templateBack, learners, { term: 'Term 2', examType: 'Annual', subjects: SUBJECTS })
check(emptyParse.stats.valid === 0, 'a blank template imports nothing')
check(emptyParse.stats.warnings === 6, 'and says why, row by row', `${emptyParse.stats.warnings} warnings`)

console.log(
  failures === 0
    ? '\nMARKS IMPORT HOLDS — messy sheets are refused row by row, never silently'
    : `\n${failures} MARKS CHECK(S) FAILED`
)
process.exit(failures === 0 ? 0 : 1)
