import assert from 'node:assert/strict'
import { buildReportCard, prepareReportCard } from '../../src/lib/pdf/report-card'
import { PDFDocument } from 'pdf-lib'

async function main() {
  const grades = [{ subject: 'Mathematics', score: 40 }, { subject: 'English', score: 75 }]
  assert.deepEqual(prepareReportCard(grades).map(g => g.subject), ['English', 'Mathematics'])
  assert.equal(grades[0].subject, 'Mathematics')
  assert.throws(() => prepareReportCard([{ subject: 'Math', score: 50 }, { subject: ' math ', score: 60 }]), /duplicate/i)
  assert.throws(() => prepareReportCard([{ subject: 'Math', score: NaN }]), /score/i)
  assert.throws(() => prepareReportCard([]), /No assessments/)
  const pdf = await buildReportCard({ student: { id: 'test', name: 'Test Learner' }, grades, term: 'Term 1 · Annual', academicYear: '2026' })
  assert.ok((await PDFDocument.load(pdf)).getPageCount() > 0)
  console.log('ASSESSMENT REPORT CHECKS PASSED')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
