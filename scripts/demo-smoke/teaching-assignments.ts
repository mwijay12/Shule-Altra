import assert from 'node:assert/strict'
import { assignmentId, canTeach, validAssignment, saveAssessment } from '../../src/lib/academics/assignments'
import { O_LEVEL_CLASSES } from '../../src/lib/academics/config'
import { SUBJECTS_SECONDARY } from '../../src/data/fixtures/tanzanian-names'

async function main() {
  const className = O_LEVEL_CLASSES[0], subject = SUBJECTS_SECONDARY[0]
  assert(validAssignment(className, subject))
  assert(!validAssignment('Unknown class', subject))
  const assignments = [{ id: assignmentId(className, subject), className, subject }]
  assert(canTeach(assignments, className, subject))
  assert(!canTeach(assignments, className, 'Unassigned'))
  await assert.rejects(() => saveAssessment(null as never, { studentId: 's', className, subject, score: NaN, term: 'Term 1', examType: 'Annual', year: '2026', actorUid: 't' }), /Check/)
  console.log('TEACHING ASSIGNMENT VALIDATION PASSED (no live security rules tested)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
