import { collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'

export type StudentStatus = 'Active' | 'Suspended' | 'Archived'
export function studentStatus(value: unknown): StudentStatus {
  return value === 'Suspended' || value === 'Archived' ? value : 'Active'
}

/** Record the status and its reason together, preserving all other records. */
export async function changeStudentStatus(db: Firestore, studentId: string, next: StudentStatus, reason: string, actor: { uid: string; email: string }) {
  const message = reason.trim()
  if (!studentId || !actor.uid) throw new Error('Sign in as an administrator before changing a status.')
  if (!['Active', 'Suspended', 'Archived'].includes(next)) throw new Error('Choose a valid status.')
  if (message.length < 5 || message.length > 500) throw new Error('Enter a reason between 5 and 500 characters.')
  const studentRef = doc(db, 'schools', 'school-001', 'students', studentId)
  const historyRef = doc(collection(db, 'schools', 'school-001', 'students', studentId, 'statusHistory'))
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(studentRef)
    if (!snapshot.exists()) throw new Error('Student no longer exists. Refresh the register and try again.')
    const previous = studentStatus(snapshot.data().status)
    if (previous === next) throw new Error('This student already has that status.')
    transaction.update(studentRef, { status: next, statusUpdatedAt: serverTimestamp() })
    transaction.set(historyRef, { from: previous, to: next, reason: message, actorUid: actor.uid, actorEmail: actor.email, createdAt: serverTimestamp() })
    return { previous, next }
  })
}
