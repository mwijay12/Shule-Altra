/**
 * @fileOverview Assessment report, using recorded marks without invented attendance or remarks.
 */

import { getCSEEGrade } from '@/lib/necta-logic';

import {
  COLORS,
  createDocument,
  downloadPdf,
  finalize,
  keyValueGrid,
  letterhead,
  rect,
  sectionTitle,
  signatureRow,
  table,
  text,
} from '@/lib/pdf/kit';

export interface GradeRow {
  subject: string;
  score: number;
  examType?: string;
}

export interface ReportCardInput {
  student: {
    id: string;
    name: string;
    className?: string;
    admissionNumber?: string;
    gender?: string;
  };
  grades: GradeRow[];
  term?: string;
  academicYear?: string;
  classAverage?: number;
  position?: number;
  classSize?: number;
  teacherRemark?: string;
  headRemark?: string;
  attendanceRate?: number;
}

export function prepareReportCard(grades: GradeRow[]) {
  if (!grades.length) throw new Error('No assessments were supplied.')
  const seen = new Set<string>()
  for (const row of grades) {
    const key = row.subject?.trim().toLowerCase()
    if (!key || seen.has(key)) throw new Error('Missing or duplicate subject; review marks before export.')
    if (!Number.isFinite(row.score) || row.score < 0 || row.score > 100) throw new Error('Invalid score; review marks before export.')
    seen.add(key)
  }
  return [...grades].sort((a, b) => b.score - a.score)
}

export async function buildReportCard(input: ReportCardInput): Promise<Uint8Array> {
  const term = input.term ?? 'Term 2';
  const year = input.academicYear ?? '2026';
  const grades = prepareReportCard(input.grades);
  const total = grades.reduce((sum, grade) => sum + grade.score, 0);
  const average = grades.length > 0 ? total / grades.length : 0;
  const best = grades[0];
  const weakest = grades[grades.length - 1];

  const ctx = await createDocument({
    title: `Report card — ${input.student.name}`,
    subject: `${term} report card`,
    reference: `RC-${year}-${(input.student.admissionNumber ?? input.student.id).replace(/[^A-Za-z0-9]/g, '').slice(-6)}`,
    issuedBy: 'Academic office',
  });

  letterhead(ctx, 'Assessment report', `${term} · Academic year ${year} · School grade scale`);

  sectionTitle(ctx, 'Learner particulars');
  keyValueGrid(ctx, [
    { label: 'Learner', value: input.student.name, emphasis: true },
    { label: 'Admission no.', value: input.student.admissionNumber ?? input.student.id },
    { label: 'Class / stream', value: input.student.className ?? 'Unassigned' },
    { label: 'Term', value: term },
    { label: 'Subjects assessed', value: `${grades.length}` },
    { label: 'Attendance', value: input.attendanceRate == null ? 'Not supplied' : `${input.attendanceRate.toFixed(1)}%` },
  ]);

  sectionTitle(ctx, 'Academic performance');
  table(
    ctx,
    [
      { key: 'subject', header: 'Subject', width: 130 },
      { key: 'score', header: 'Score', width: 46, align: 'right' },
      { key: 'grade', header: 'Grade', width: 38, align: 'center' },
      { key: 'points', header: 'Points', width: 40, align: 'center' },
      { key: 'remark', header: 'Remark', width: 90 },
    ],
    grades.map((grade) => {
      const detail = getCSEEGrade(grade.score);
      return {
        subject: grade.subject,
        score: `${grade.score.toFixed(0)}%`,
        grade: detail.grade,
        points: `${detail.points}`,
        remark: detail.remark,
      };
    }),
    { zebra: true }
  );

  // Summary band
  const cardWidth = (ctx.width - ctx.margin * 2 - 24) / 3;
  const summary = [
    { label: 'Average score', value: `${average.toFixed(1)}%`, color: COLORS.primary },
    { label: 'Division', value: 'Not calculated', color: COLORS.muted },
    {
      label: 'Class position',
      value: input.position ? `${input.position}${input.classSize ? ` / ${input.classSize}` : ''}` : 'Pending',
      color: COLORS.accent,
    },
  ];
  summary.forEach((item, index) => {
    const x = ctx.margin + index * (cardWidth + 12);
    rect(ctx, x, ctx.cursorY - 40, cardWidth, 50, { color: COLORS.soft, border: COLORS.line, borderWidth: 0.6 });
    rect(ctx, x, ctx.cursorY - 40, 3, 50, { color: item.color });
    text(ctx, item.label.toUpperCase(), x + 10, ctx.cursorY - 6, { size: 6.6, font: ctx.bold, color: COLORS.muted });
    text(ctx, item.value, x + 10, ctx.cursorY - 24, { size: 15, font: ctx.bold, color: item.color });
  });
  ctx.cursorY -= 62;

  if (best && weakest) {
    text(
      ctx,
      `Strongest subject: ${best.subject} (${best.score.toFixed(0)}%).  Focus area: ${weakest.subject} (${weakest.score.toFixed(0)}%).`,
      ctx.margin,
      ctx.cursorY,
      { size: 8, color: COLORS.ink, maxWidth: ctx.width - ctx.margin * 2 }
    );
    ctx.cursorY -= 20;
  }

  sectionTitle(ctx, 'Conduct & remarks');
  const remarks: Array<[string, string]> = [
    ['Class teacher', input.teacherRemark || 'Not supplied'],
    ['Head of school', input.headRemark || 'Not supplied'],
  ];
  remarks.forEach(([role, remark]) => {
    text(ctx, role.toUpperCase(), ctx.margin, ctx.cursorY, { size: 6.8, font: ctx.bold, color: COLORS.muted });
    ctx.cursorY -= 11;
    const wrapped = remark.match(/.{1,96}(\s|$)/g) ?? [remark];
    wrapped.forEach((line) => {
      text(ctx, line.trim(), ctx.margin, ctx.cursorY, { size: 8, color: COLORS.ink });
      ctx.cursorY -= 11;
    });
    ctx.cursorY -= 6;
  });

  signatureRow(ctx, [
    { role: 'Class teacher', name: '________________' },
    { role: 'Head of school', name: '________________' },
    { role: 'Guardian', name: '________________' },
  ]);

  return finalize(ctx, 'Assessment report · verify marks and school grading policy before use');
}

export async function downloadReportCard(input: ReportCardInput) {
  const bytes = await buildReportCard(input);
  const safeName = input.student.name.replace(/[^A-Za-z0-9]+/g, '-');
  downloadPdf(bytes, `report-card-${safeName}.pdf`);
  return bytes;
}
