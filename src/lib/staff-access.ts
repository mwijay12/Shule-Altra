import { collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import type { StaffRole } from '@/types/staff'
export const STAFF_ACCESS_ROLES: StaffRole[] = ['VIEWER', 'TEACHER', 'ACCOUNTANT', 'BURSAR', 'ADMIN']
export async function changeStaffAccess(db: Firestore, schoolId: string, staffId: string, previousRole: StaffRole, nextRole: StaffRole, reason: string, actorUid: string) {
  const why = reason.trim()
  if (!schoolId || !staffId || !actorUid || staffId === actorUid) throw new Error('You cannot change your own access role here.')
  if (!STAFF_ACCESS_ROLES.includes(previousRole) || !STAFF_ACCESS_ROLES.includes(nextRole) || previousRole === nextRole) throw new Error('Choose a different supported role.')
  if (why.length < 5 || why.length > 500) throw new Error('Enter a reason between 5 and 500 characters.')
  const ref = doc(db, 'schools', schoolId, 'staff', staffId)
  const history = doc(collection(db, 'schools', schoolId, 'staffRoleChanges'))
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists() || snap.data().role !== previousRole) throw new Error('The staff role changed or the record no longer exists. Close and review again.')
    tx.update(ref, { role: nextRole, roleUpdatedAt: serverTimestamp() })
    tx.set(history, { staffId, from: previousRole, to: nextRole, reason: why, actorUid, createdAt: serverTimestamp() })
  })
}
