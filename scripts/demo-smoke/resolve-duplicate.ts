import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { resolveDuplicate } from '@/lib/academics/resolve-duplicate'
import type { GradeRecord } from '@/types/grade'

async function main() {
  const { firestore: db } = initializeFirebase()
  const data = { studentId: 'duplicate-test-student', subject: 'Math', academicYear: '2026', term: 'Term 1', examType: 'Annual', score: 70 }
  const keep: GradeRecord = { id: 'duplicate-test-keep', ...data }, remove: GradeRecord = { id: 'duplicate-test-remove', ...data, score: 80 }
  const ref = (id: string) => doc(db, 'schools', 'school-001', 'grades', id)
  await setDoc(ref(keep.id), data); await setDoc(ref(remove.id), { ...data, score: 80 })
  await assert.rejects(() => resolveDuplicate(db, keep, remove, 'no', 'admin'), /reason/i)
  await updateDoc(ref(remove.id), { score: 81 })
  await assert.rejects(() => resolveDuplicate(db, keep, remove, 'Compare original sheet', 'admin'), /changed/i)
  assert((await getDoc(ref(remove.id))).exists())
  await updateDoc(ref(remove.id), { score: 80 })
  await resolveDuplicate(db, keep, remove, 'Compared with signed original', 'admin')
  assert((await getDoc(ref(keep.id))).exists()); assert(!(await getDoc(ref(remove.id))).exists())
  const history = await getDocs(collection(db, 'schools', 'school-001', 'gradeCorrections'))
  const entry = history.docs.map(d => d.data()).find(x => x.removedId === remove.id)
  assert.equal(entry?.removedSnapshot.score, 80); assert.equal(entry?.keptSnapshot.score, 70); assert.equal(entry?.reason, 'Compared with signed original')
  await assert.rejects(() => resolveDuplicate(db, keep, remove, 'Another review', 'admin'), /no longer exists/i)
  console.log('DUPLICATE CORRECTION REGRESSIONS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
