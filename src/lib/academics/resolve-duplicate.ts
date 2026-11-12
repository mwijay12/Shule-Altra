import { collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import type { GradeRecord } from '@/types/grade'

/** Archive and remove one reviewed duplicate; never choose which mark to keep. */
export async function resolveDuplicate(db: Firestore, keep: GradeRecord, remove: GradeRecord, reason: string, actorUid: string) {
  const message = reason.trim()
  if (!actorUid || message.length < 5 || message.length > 500) throw new Error('Enter a reason of 5–500 characters and sign in as an administrator.')
  if (!keep.id || !remove.id || keep.id === remove.id) throw new Error('Choose two different records.')
  const root = collection(db, 'schools', 'school-001', 'grades')
  const keepRef = doc(root, keep.id), removeRef = doc(root, remove.id)
  const historyRef = doc(collection(db, 'schools', 'school-001', 'gradeCorrections'))
  return runTransaction(db, async tx => {
    const [keptSnap, removedSnap] = await Promise.all([tx.get(keepRef), tx.get(removeRef)])
    if (!keptSnap.exists() || !removedSnap.exists()) throw new Error('A record changed or no longer exists. Refresh and review again.')
    const kept = keptSnap.data(), removed = removedSnap.data()
    const fields = ['studentId', 'subject', 'academicYear', 'term', 'examType', 'score'] as const
    if (fields.some(field => kept[field] !== keep[field] || removed[field] !== remove[field])) throw new Error('A record changed since review. Refresh and review again.')
    const scope = ['studentId', 'subject', 'academicYear', 'term', 'examType'] as const
    if (!removed.academicYear || scope.some(field => !removed[field] || removed[field] !== kept[field])) throw new Error('These records are not duplicates in the same exam and year.')
    tx.set(historyRef, { action: 'remove_duplicate', keptId: keep.id, removedId: remove.id, keptSnapshot: kept, removedSnapshot: removed, reason: message, actorUid, createdAt: serverTimestamp() })
    tx.delete(removeRef)
  })
}
