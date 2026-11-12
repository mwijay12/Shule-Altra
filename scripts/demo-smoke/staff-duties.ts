import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { saveStaffDuties, validateDuties } from '@/lib/staff-duties'
import { staffSchema } from '@/lib/validations/staff'

async function main() {
  const { firestore: db } = initializeFirebase()
  const ref = doc(db, 'schools', 'school-001', 'staff', 'duties-test')
  await setDoc(ref, { fullName: 'Test staff', role: 'TEACHER', active: true })
  const empty = { duties: [], classTeacherClasses: [] }
  const assigned = { duties: ['Class teacher', 'Sports teacher'] as const, classTeacherClasses: ['Form 1'] }
  const selection = { duties: [...assigned.duties], classTeacherClasses: assigned.classTeacherClasses }
  assert.throws(() => validateDuties({ duties: ['Class teacher'], classTeacherClasses: [] }), /class/i)
  assert.throws(() => validateDuties({ duties: ['Driver'], classTeacherClasses: ['Form 1'] }), /class teacher/i)
  await saveStaffDuties(db, 'school-001', 'duties-test', empty, selection)
  const saved = (await getDoc(ref)).data()!
  assert.deepEqual(saved.duties, selection.duties); assert.equal(saved.role, 'TEACHER'); assert.equal(saved.active, true)
  await updateDoc(ref, { duties: ['Driver'], classTeacherClasses: [] })
  await assert.rejects(() => saveStaffDuties(db, 'school-001', 'duties-test', selection, empty), /changed/i)
  assert.deepEqual((await getDoc(ref)).data()!.duties, ['Driver'])
  const staff = { fullName: 'Test Person', email: 'person@example.com', phone: '0712345678', department: 'Finance', joinedDate: '2026-01-01' }
  assert(staffSchema.safeParse({ ...staff, role: 'BURSAR' }).success)
  assert(staffSchema.safeParse({ ...staff, role: 'VIEWER' }).success)
  assert(!staffSchema.safeParse({ ...staff, role: 'DRIVER' }).success)
  console.log('STAFF DUTIES TESTS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
