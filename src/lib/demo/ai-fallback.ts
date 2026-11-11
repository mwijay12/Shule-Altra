/** Deterministic student comment from recorded data; no model or invented values. */
export interface LocalProgressInput {
  studentName: string;
  classLevel?: string;
  conductPoints?: number;
  attendanceStatus?: string;
  scores: Array<{ subject?: unknown; score?: unknown }>;
}

export function buildLocalNarrative(input: LocalProgressInput): string {
  const scores = input.scores.flatMap(row => {
    if (typeof row.score !== 'number' || !Number.isFinite(row.score) || row.score < 0 || row.score > 100) return [];
    return [{ subject: typeof row.subject === 'string' && row.subject.trim() ? row.subject.trim() : 'Unspecified subject', score: row.score }];
  });
  const name = input.studentName.trim() || 'Student';
  const level = input.classLevel ? ` (${input.classLevel})` : '';
  const lines = [`${name}${level}.`];
  if (scores.length) {
    const mean = scores.reduce((sum, row) => sum + row.score, 0) / scores.length;
    lines.push(`${scores.length} recorded assessment scores across available terms and exams average ${mean.toFixed(1)}%.`);
  } else {
    lines.push('No assessment scores are recorded.');
  }
  const status = ['Present', 'Late', 'Absent'].includes(input.attendanceStatus ?? '') ? input.attendanceStatus : null;
  lines.push(status ? `Latest recorded attendance status: ${status}.` : 'Attendance status is not recorded.');
  lines.push(typeof input.conductPoints === 'number' && Number.isFinite(input.conductPoints)
    ? `Recorded conduct score: ${input.conductPoints} points.` : 'Conduct score is not recorded.');
  lines.push('Review the source records and edit the comment before use.');
  return lines.join(' ');
}
