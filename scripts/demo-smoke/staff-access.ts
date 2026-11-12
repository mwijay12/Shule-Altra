import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { changeStaffAccess } from '@/lib/staff-access'
async function main() {
  const { firestore: db } = initializeFirebase(), id = 'access-test', ref = doc(db, 'schools', 'school-001', 'staff', id)
  await setDoc(ref, { fullName: 'Test Staff', role: 'TEACHER', duties: ['Sports teacher'] })
  await assert.rejects(() => changeStaffAccess(db, 'school-001', id, 'TEACHER', 'ADMIN', 'x', 'admin'), /reason/i)
  await assert.rejects(() => changeStaffAccess(db, 'school-001', id, 'TEACHER', 'ADMIN', 'Staff promotion', id), /own/i)
  await changeStaffAccess(db, 'school-001', id, 'TEACHER', 'BURSAR', 'Staff reassignment', 'admin')
  const current = (await getDoc(ref)).data()!
  assert.equal(current.role, 'BURSAR'); assert.deepEqual(current.duties, ['Sports teacher'])
  const history = (await getDocs(collection(db, 'schools', 'school-001', 'staffRoleChanges'))).docs.map(d => d.data()).find(d => d.staffId === id)
  assert.equal(history?.from, 'TEACHER'); assert.equal(history?.to, 'BURSAR'); assert.equal(history?.actorUid, 'admin')
  await updateDoc(ref, { role: 'VIEWER' })
  await assert.rejects(() => changeStaffAccess(db, 'school-001', id, 'BURSAR', 'ADMIN', 'Another change', 'admin'), /changed/i)
  assert.equal((await getDoc(ref)).data()!.role, 'VIEWER')
  console.log('STAFF ACCESS TESTS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
