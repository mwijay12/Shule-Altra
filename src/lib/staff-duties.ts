import { doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'
import { O_LEVEL_CLASSES } from '@/lib/academics/config'

export const STAFF_DUTIES = ['Academic coordinator', 'Discipline teacher', 'Class teacher', 'Duty teacher', 'Sports teacher', 'Driver', 'Hostel staff'] as const
export type StaffDuty = typeof STAFF_DUTIES[number]
export type DutySelection = { duties: StaffDuty[]; classTeacherClasses: string[] }

export function validateDuties(selection: DutySelection) {
  if (!Array.isArray(selection.duties) || !Array.isArray(selection.classTeacherClasses) || selection.duties.some(d => !STAFF_DUTIES.includes(d)) || selection.classTeacherClasses.some(c => !O_LEVEL_CLASSES.some(valid => valid === c))) throw new Error('Invalid staff duty or class.')
  if (new Set(selection.duties).size !== selection.duties.length || new Set(selection.classTeacherClasses).size !== selection.classTeacherClasses.length) throw new Error('Duplicate duties or classes are not allowed.')
  if (!selection.duties.includes('Class teacher') && selection.classTeacherClasses.length) throw new Error('Select class teacher before choosing classes.')
  if (selection.duties.includes('Class teacher') && !selection.classTeacherClasses.length) throw new Error('Choose at least one class for the class teacher.')
}
const normalized = (value: unknown): string[] => Array.isArray(value) ? [...value].sort() : []
export async function saveStaffDuties(db: Firestore, schoolId: string, staffId: string, previous: DutySelection, selection: DutySelection) {
  if (!schoolId || !staffId) throw new Error('Staff record is unavailable.')
  validateDuties(selection)
  const ref = doc(db, 'schools', schoolId, 'staff', staffId)
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('Staff record no longer exists.')
    const current = snap.data()
    if (JSON.stringify(normalized(current.duties)) !== JSON.stringify(normalized(previous.duties)) || JSON.stringify(normalized(current.classTeacherClasses)) !== JSON.stringify(normalized(previous.classTeacherClasses))) throw new Error('Duties changed in another session. Close and reopen this dialog before saving.')
    tx.update(ref, { duties: selection.duties, classTeacherClasses: selection.classTeacherClasses, dutiesUpdatedAt: serverTimestamp() })
  })
}
