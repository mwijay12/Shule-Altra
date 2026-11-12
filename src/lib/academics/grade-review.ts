import type { GradeRecord } from '@/types/grade'

/** Review only: never choose a winning record or silently change marks. */
export function reviewGradeRecords(grades: GradeRecord[], studentIds: ReadonlySet<string>, year: string) {
  const missingYear: GradeRecord[] = []
  const groups = new Map<string, GradeRecord[]>()
  for (const grade of grades) {
    if (!studentIds.has(grade.studentId)) continue
    if (!grade.academicYear) { missingYear.push(grade); continue }
    if (grade.academicYear !== year) continue
    const key = JSON.stringify([grade.studentId, grade.subject])
    const list = groups.get(key) ?? []
    list.push(grade)
    groups.set(key, list)
  }
  return { missingYear, duplicates: [...groups.values()].filter(group => group.length > 1) }
}
