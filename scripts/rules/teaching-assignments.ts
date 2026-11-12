import { readFileSync } from 'node:fs'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'

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
    const expensePath = `${root}/expense_entries/expense1`
    const expense = { date: '2026-11-12', category: 'Supplies', description: 'Paper purchase', amount: 5000, payee: '', reference: '', recordedByUid: 'admin', recordedByEmail: '', createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(teacher, expensePath), { ...expense, recordedByUid: 'teacher' }))
    await assertFails(setDoc(doc(admin, expensePath), { ...expense, amount: -1 }))
    await assertFails(setDoc(doc(admin, expensePath), { ...expense, recordedByUid: 'other' }))
    await assertSucceeds(setDoc(doc(admin, expensePath), expense))
    await assertFails(updateDoc(doc(admin, expensePath), { amount: 1 }))
    await assertFails(deleteDoc(doc(admin, expensePath)))
    await assertFails(getDoc(doc(teacher, expensePath)))
    const roleHistoryPath = `${root}/staffRoleChanges/change1`
    const roleHistory = { staffId: 'teacher', from: 'TEACHER', to: 'BURSAR', reason: 'Changed duties', actorUid: 'admin', createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(teacher, roleHistoryPath), { ...roleHistory, actorUid: 'teacher' }))
    await assertSucceeds(setDoc(doc(admin, roleHistoryPath), roleHistory))
    await assertFails(updateDoc(doc(admin, roleHistoryPath), { reason: 'Changed' }))
    await assertFails(deleteDoc(doc(admin, roleHistoryPath)))
    await assertFails(getDoc(doc(teacher, roleHistoryPath)))
    const sidebarPath = `${root}/config/sidebar`
    await assertFails(setDoc(doc(teacher, sidebarPath), { hidden: ['finance'], revision: 1 }))
    await assertSucceeds(setDoc(doc(admin, sidebarPath), { hidden: ['finance'], revision: 1 }))
    await assertSucceeds(getDoc(doc(teacher, sidebarPath)))
    await assertFails(getDoc(doc(anonymous, sidebarPath)))
    const supplierPath = `${root}/suppliers/supplier1`
    const supplier = { name: 'Test supplier', contactName: '', phone: '0712345678', email: '', category: 'Supplies', notes: '', revision: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedByUid: 'admin' }
    await assertFails(setDoc(doc(teacher, supplierPath), { ...supplier, updatedByUid: 'teacher' }))
    await assertFails(setDoc(doc(admin, supplierPath), { ...supplier, phone: 'invalid' }))
    await assertSucceeds(setDoc(doc(admin, supplierPath), supplier))
    await assertFails(getDoc(doc(teacher, supplierPath)))
    await assertFails(updateDoc(doc(admin, supplierPath), { name: 'Changed', updatedAt: serverTimestamp(), revision: 1 }))
    await assertSucceeds(updateDoc(doc(admin, supplierPath), { name: 'Changed', updatedAt: serverTimestamp(), revision: 2 }))
    await assertFails(deleteDoc(doc(admin, supplierPath)))
    console.log('FIRESTORE TEACHING AND FINANCE RULES TESTS PASSED')
  } finally { await env.cleanup() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
