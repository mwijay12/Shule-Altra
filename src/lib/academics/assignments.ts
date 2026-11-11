import { O_LEVEL_CLASSES } from '@/lib/academics/config'
import { SUBJECTS_SECONDARY } from '@/data/fixtures/tanzanian-names'
import { collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'

export const assignmentId = (className: string, subject: string) => `${className}|${subject}`
export type TeachingAssignment = { id: string; className: string; subject: string }
export function canTeach(assignments: TeachingAssignment[], className: string, subject: string) {
  return assignments.some(a => a.className === className && a.subject === subject)
}
export function validAssignment(className: string, subject: string) {
  return O_LEVEL_CLASSES.some(item => item === className) && SUBJECTS_SECONDARY.includes(subject)
}

export async function saveAssessment(db: Firestore, input: { studentId: string; className: string; subject: string; score: number; term: string; examType: string; year: string; actorUid: string }) {
  if (!input.studentId || !input.actorUid || !validAssignment(input.className, input.subject) || !Number.isFinite(input.score) || input.score < 0 || input.score > 100 || !['Term 1', 'Term 2', 'Term 3'].includes(input.term) || !['Mid-Term', 'Annual', 'Mock'].includes(input.examType) || !/^\d{4}$/.test(input.year)) throw new Error('Check the student, subject, score and exam details.')
  const encoded = [input.studentId, input.term, input.examType, input.subject, input.year].map(encodeURIComponent).join('|')
  const gradeRef = doc(collection(db, 'schools', 'school-001', 'grades'), `entry|${encoded}`)
  return runTransaction(db, async tx => {
    const previous = await tx.get(gradeRef)
    if (previous.exists()) throw new Error('A mark for this subject and exam was already entered. Ask an administrator to review it.')
    tx.set(gradeRef, { studentId: input.studentId, class: input.className, subject: input.subject, score: input.score, term: input.term, examType: input.examType, academicYear: input.year, recordedByUid: input.actorUid, createdAt: serverTimestamp() })
  })
}
