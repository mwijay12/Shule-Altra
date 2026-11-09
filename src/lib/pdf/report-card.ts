/**
 * @fileOverview Termly report card, vector PDF with computed grades, division and remarks.
 */

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

function gradeOf(score: number) {
  if (score >= 75) return { grade: 'A', points: 1, remark: 'Excellent' };
  if (score >= 65) return { grade: 'B', points: 2, remark: 'Very good' };
  if (score >= 55) return { grade: 'C', points: 3, remark: 'Good' };
  if (score >= 45) return { grade: 'D', points: 4, remark: 'Satisfactory' };
  if (score >= 35) return { grade: 'E', points: 5, remark: 'Needs support' };
  return { grade: 'F', points: 6, remark: 'Critical' };
}

function divisionOf(points: number, subjects: number) {
  const averagePoints = subjects > 0 ? points / subjects : 6;
  if (averagePoints <= 1.6) return 'I';
  if (averagePoints <= 2.4) return 'II';
  if (averagePoints <= 3.2) return 'III';
  if (averagePoints <= 4.2) return 'IV';
  return 'FAIL';
}

export async function buildReportCard(input: ReportCardInput): Promise<Uint8Array> {
  const term = input.term ?? 'Term 2';
  const year = input.academicYear ?? '2026';
  const grades = [...input.grades].sort((a, b) => b.score - a.score);
  const total = grades.reduce((sum, grade) => sum + grade.score, 0);
  const average = grades.length > 0 ? total / grades.length : 0;
  const points = grades.reduce((sum, grade) => sum + gradeOf(grade.score).points, 0);
  const division = divisionOf(points, grades.length);
  const best = grades[0];
  const weakest = grades[grades.length - 1];

  const ctx = await createDocument({
    title: `Report card — ${input.student.name}`,
    subject: `${term} report card`,
    reference: `RC-${year}-${(input.student.admissionNumber ?? input.student.id).replace(/[^A-Za-z0-9]/g, '').slice(-6)}`,
    issuedBy: 'Academic office',
  });

  letterhead(ctx, 'Termly report card', `${term} · Academic year ${year} · NECTA grading scale`);

  sectionTitle(ctx, 'Learner particulars');
  keyValueGrid(ctx, [
    { label: 'Learner', value: input.student.name, emphasis: true },
    { label: 'Admission no.', value: input.student.admissionNumber ?? input.student.id },
    { label: 'Class / stream', value: input.student.className ?? 'Unassigned' },
    { label: 'Term', value: term },
    { label: 'Subjects assessed', value: `${grades.length}` },
    { label: 'Attendance', value: `${(input.attendanceRate ?? 96.7).toFixed(1)}%` },
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
      const detail = gradeOf(grade.score);
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
    { label: 'Division', value: division, color: division === 'FAIL' ? COLORS.danger : COLORS.success },
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
    ['Class teacher', input.teacherRemark ?? 'A committed learner who participates actively in class activities.'],
    [
      'Head of school',
      input.headRemark ??
        (average >= 65
          ? 'Commendable performance. Keep the momentum in the coming term.'
          : 'Performance requires closer supervision at home and in school.'),
    ],
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
    { role: 'Head of school', name: 'Dr. A. Mushi' },
    { role: 'Guardian', name: '________________' },
  ]);

  return finalize(ctx, 'Computer-generated report card · vector PDF · valid without a rubber stamp');
}

export async function downloadReportCard(input: ReportCardInput) {
  const bytes = await buildReportCard(input);
  const safeName = input.student.name.replace(/[^A-Za-z0-9]+/g, '-');
  downloadPdf(bytes, `report-card-${safeName}.pdf`);
  return bytes;
}
