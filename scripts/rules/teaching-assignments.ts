import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'

// Run ONLY against the Firestore emulator. Never point this at a real project.
async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Start the Firestore emulator first.')
  const env = await initializeTestEnvironment({ projectId: 'demo-shule-rules', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
  const root = 'schools/school-001'
  try {
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore()
      await Promise.all([
        setDoc(doc(db, `${root}/staff/admin`), { role: 'ADMIN', active: true }),
        setDoc(doc(db, `${root}/staff/teacher`), { role: 'TEACHER', active: true }),
        setDoc(doc(db, `${root}/staff/inactive`), { role: 'TEACHER', active: false }),
        setDoc(doc(db, `${root}/staff/other`), { role: 'TEACHER', active: true }),
        setDoc(doc(db, `${root}/students/s1`), { class: 'Form 1', name: 'Test learner' }),
        setDoc(doc(db, `${root}/students/s2`), { class: 'Form 2', name: 'Test learner 2' }),
        setDoc(doc(db, `${root}/staff/teacher/teachingAssignments/Form 1|Mathematics`), { className: 'Form 1', subject: 'Mathematics' }),
        setDoc(doc(db, `${root}/staff/inactive/teachingAssignments/Form 1|Mathematics`), { className: 'Form 1', subject: 'Mathematics' }),
      ])
    })
    const admin = env.authenticatedContext('admin').firestore()
    const teacher = env.authenticatedContext('teacher').firestore()
    const inactive = env.authenticatedContext('inactive').firestore()
    const other = env.authenticatedContext('other').firestore()
    const anonymous = env.unauthenticatedContext().firestore()
    const assignment = `${root}/staff/teacher/teachingAssignments/Form 1|Mathematics`
    const record = { studentId: 's1', class: 'Form 1', subject: 'Mathematics', score: 70, term: 'Term 1', examType: 'Annual', academicYear: '2026', recordedByUid: 'teacher' }
    const gradeId = 'entry|s1|Term 1|Annual|Mathematics|2026'
    const gradePath = `${root}/grades/${gradeId}`
    await assertSucceeds(getDoc(doc(teacher, assignment)))
    await assertFails(getDoc(doc(other, assignment)))
    await assertFails(setDoc(doc(teacher, `${root}/staff/teacher/teachingAssignments/Form 1|English`), { className: 'Form 1', subject: 'English' }))
    await assertSucceeds(setDoc(doc(admin, `${root}/staff/teacher/teachingAssignments/Form 1|English`), { className: 'Form 1', subject: 'English' }))
    await assertFails(setDoc(doc(other, gradePath), { ...record, recordedByUid: 'other' }))
    await assertFails(setDoc(doc(inactive, gradePath), { ...record, recordedByUid: 'inactive' }))
    await assertFails(setDoc(doc(anonymous, gradePath), record))
    await assertFails(setDoc(doc(teacher, `${root}/grades/random-id`), record))
    await assertFails(setDoc(doc(teacher, gradePath), { ...record, score: 101 }))
    await assertFails(setDoc(doc(teacher, gradePath), { ...record, recordedByUid: 'other' }))
    await assertFails(setDoc(doc(teacher, `${root}/grades/entry|s2|Term 1|Annual|Mathematics|2026`), { ...record, studentId: 's2', class: 'Form 1' }))
    await assertFails(updateDoc(doc(teacher, `${root}/students/s2`), { class: 'Form 1' }))
    await assertFails(updateDoc(doc(teacher, `${root}/staff/teacher`), { duties: ['Driver'] }))
    await assertSucceeds(updateDoc(doc(admin, `${root}/staff/teacher`), { duties: ['Sports teacher'] }))
    await assertSucceeds(setDoc(doc(teacher, gradePath), record))
    await assertFails(updateDoc(doc(teacher, gradePath), { score: 80 }))
    await assertFails(deleteDoc(doc(teacher, gradePath)))
    await assertSucceeds(updateDoc(doc(admin, gradePath), { score: 80 }))
    await assertSucceeds(deleteDoc(doc(admin, gradePath)))
    const correction = `${root}/gradeCorrections/correction1`
    const audit = { action: 'remove_duplicate', actorUid: 'admin', keptId: 'a', removedId: 'b', reason: 'Reviewed original marks' }
    await assertFails(setDoc(doc(teacher, correction), { ...audit, actorUid: 'teacher' }))
    await assertSucceeds(setDoc(doc(admin, correction), audit))
    await assertFails(updateDoc(doc(admin, correction), { reason: 'changed' }))
    await assertFails(deleteDoc(doc(admin, correction)))
    await assertFails(getDoc(doc(teacher, correction)))
    console.log('FIRESTORE TEACHING RULES TESTS PASSED')
  } finally { await env.cleanup() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
