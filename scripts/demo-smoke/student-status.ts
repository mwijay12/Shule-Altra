import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { changeStudentStatus } from '@/lib/student-status'

async function main() {
  const { firestore: db } = initializeFirebase()
  const ref = doc(db, 'schools', 'school-001', 'students', 'STATUS-TEST')
  await setDoc(ref, { name: 'Test learner', status: 'Active', balance: 70000, conductPoints: 0 })
  const actor = { uid: 'demo-admin', email: 'admin@example.com' }
  await assert.rejects(() => changeStudentStatus(db, 'STATUS-TEST', 'Suspended', 'no', actor), /reason/i)
  await changeStudentStatus(db, 'STATUS-TEST', 'Suspended', 'Temporary suspension', actor)
  await changeStudentStatus(db, 'STATUS-TEST', 'Archived', 'Duplicate admission', actor)
  await changeStudentStatus(db, 'STATUS-TEST', 'Active', 'Corrected mistake', actor)
  await assert.rejects(() => changeStudentStatus(db, 'STATUS-TEST', 'Active', 'Already active', actor), /already/)
  await assert.rejects(() => changeStudentStatus(db, 'MISSING-STATUS', 'Archived', 'Duplicate record', actor), /no longer exists/)
  const data = (await getDoc(ref)).data()!
  assert.equal(data.status, 'Active'); assert.equal(data.balance, 70000); assert.equal(data.conductPoints, 0)
  const history = await getDocs(collection(db, 'schools', 'school-001', 'students', 'STATUS-TEST', 'statusHistory'))
  assert.equal(history.size, 3)
  assert.deepEqual(history.docs.map(row => row.data().reason).sort(), ['Corrected mistake', 'Duplicate admission', 'Temporary suspension'])
  console.log('STUDENT STATUS REGRESSIONS PASSED')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
