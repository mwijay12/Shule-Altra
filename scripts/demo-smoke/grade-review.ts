import assert from 'node:assert/strict'
import { reviewGradeRecords } from '../../src/lib/academics/grade-review'
import type { GradeRecord } from '../../src/types/grade'
const mark = (id: string, studentId: string, subject: string, academicYear: string): GradeRecord => ({ id, studentId, subject, academicYear, score: 70, term: 'Term 1', examType: 'Annual' })
const rows = [mark('a', 's1', 'Math', '2026'), mark('b', 's1', 'Math', '2026'), mark('c', 's1', 'Math', '2025'), mark('d', 's1', 'English', ''), mark('e', 'other', 'Math', '2026')]
const review = reviewGradeRecords(rows, new Set(['s1']), '2026')
assert.deepEqual(review.duplicates.map(g => g.map(r => r.id)), [['a', 'b']])
assert.deepEqual(review.missingYear.map(g => g.id), ['d'])
assert.equal(reviewGradeRecords(rows, new Set(['s1']), '2025').duplicates.length, 0, 'records from different years are not duplicates')
assert.equal(rows.length, 5, 'review is non-destructive')
assert.equal(reviewGradeRecords(rows, new Set(['other']), '2026').duplicates.length, 0)
console.log('GRADE REVIEW CHECKS PASSED')
