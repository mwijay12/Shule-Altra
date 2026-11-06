/**
 * @fileOverview Class ranking + attendance register printables (vector PDF).
 */

import {
  COLORS,
  createDocument,
  downloadPdf,
  finalize,
  keyValueGrid,
  letterhead,
  money,
  sectionTitle,
  signatureRow,
  table,
  text,
} from '@/lib/pdf/kit';

export interface RankingRow {
  rank: number;
  name: string;
  admissionNumber: string;
  className: string;
  average: number;
  division: string;
  balance: number;
}

export async function buildClassRanking(
  rows: RankingRow[],
  options: { term?: string; className?: string; academicYear?: string } = {}
): Promise<Uint8Array> {
  const term = options.term ?? 'Term 2';
  const year = options.academicYear ?? '2026';
  const className = options.className ?? 'All streams';
  const sorted = [...rows].sort((a, b) => b.average - a.average);

  const ctx = await createDocument({
    title: `Class ranking — ${className}`,
    subject: 'Merit ranking report',
    reference: `RANK-${year}-${className.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)}`,
    issuedBy: 'Academic office',
  });

  letterhead(ctx, 'Class merit ranking', `${className} · ${term} · Academic year ${year}`);
  keyValueGrid(ctx, [
    { label: 'Cohort', value: className, emphasis: true },
    { label: 'Learners ranked', value: `${sorted.length}` },
    { label: 'Term', value: term },
    { label: 'Top average', value: sorted[0] ? `${sorted[0].average.toFixed(1)}%` : '—' },
    {
      label: 'Cohort average',
      value: sorted.length
        ? `${(sorted.reduce((sum, row) => sum + row.average, 0) / sorted.length).toFixed(1)}%`
        : '—',
    },
    { label: 'Generated', value: new Date().toLocaleDateString('en-GB') },
  ]);

  sectionTitle(ctx, 'Merit order');
  table(
    ctx,
    [
      { key: 'rank', header: '#', width: 26, align: 'right' },
      { key: 'name', header: 'Learner', width: 140 },
      { key: 'admission', header: 'Admission no.', width: 80 },
      { key: 'stream', header: 'Stream', width: 60 },
      { key: 'average', header: 'Average', width: 48, align: 'right' },
      { key: 'division', header: 'Div', width: 32, align: 'center' },
      { key: 'balance', header: 'Fee balance', width: 74, align: 'right' },
    ],
    sorted.map((row, index) => ({
      rank: `${index + 1}`,
      name: row.name,
      admission: row.admissionNumber,
      stream: row.className,
      average: `${row.average.toFixed(1)}%`,
      division: row.division,
      balance: money(row.balance),
    })),
    { compact: true, zebra: true }
  );

  text(ctx, 'Ranking uses the mean of all assessed subjects for the selected term.', ctx.margin, ctx.cursorY, {
    size: 7.4,
    font: ctx.italic,
    color: COLORS.muted,
  });
  ctx.cursorY -= 30;

  signatureRow(ctx, [
    { role: 'Academic master', name: 'S. Kimaro' },
    { role: 'Head of school', name: 'Dr. A. Mushi' },
  ]);

  return finalize(ctx, 'Computer-generated merit ranking · vector PDF · official academic record');
}

export interface RegisterRow {
  admissionNumber: string;
  name: string;
  className: string;
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export async function buildAttendanceRegister(
  rows: RegisterRow[],
  options: { from?: string; to?: string; className?: string } = {}
): Promise<Uint8Array> {
  const ctx = await createDocument({
    title: 'Attendance register',
    subject: 'Attendance summary sheet',
    reference: `ATT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
    issuedBy: 'Registry',
  });

  letterhead(
    ctx,
    'Attendance register',
    `${options.className ?? 'All streams'} · ${options.from ?? 'term start'} to ${options.to ?? 'today'}`
  );

  keyValueGrid(ctx, [
    { label: 'Cohort', value: options.className ?? 'All streams', emphasis: true },
    { label: 'Learners', value: `${rows.length}` },
    { label: 'Reporting window', value: `${options.from ?? '—'} → ${options.to ?? '—'}` },
    { label: 'Present entries', value: `${rows.reduce((sum, row) => sum + row.present, 0)}` },
    { label: 'Absent entries', value: `${rows.reduce((sum, row) => sum + row.absent, 0)}` },
    {
      label: 'Mean presence',
      value: rows.length
        ? `${(rows.reduce((sum, row) => sum + row.rate, 0) / rows.length).toFixed(1)}%`
        : '—',
    },
  ]);

  sectionTitle(ctx, 'Register detail', COLORS.accent);
  table(
    ctx,
    [
      { key: 'admission', header: 'Admission no.', width: 82 },
      { key: 'name', header: 'Learner', width: 140 },
      { key: 'stream', header: 'Class', width: 60 },
      { key: 'present', header: 'Present', width: 46, align: 'right' },
      { key: 'late', header: 'Late', width: 38, align: 'right' },
      { key: 'absent', header: 'Absent', width: 42, align: 'right' },
      { key: 'rate', header: 'Rate', width: 44, align: 'right' },
    ],
    rows.map((row) => ({
      admission: row.admissionNumber,
      name: row.name,
      stream: row.className,
      present: `${row.present}`,
      late: `${row.late}`,
      absent: `${row.absent}`,
      rate: `${row.rate.toFixed(1)}%`,
    })),
    { compact: true, zebra: true }
  );

  ctx.cursorY -= 10;
  signatureRow(ctx, [
    { role: 'Class teacher', name: '________________' },
    { role: 'Registry', name: 'M. Ndosi' },
  ]);

  return finalize(ctx, 'Computer-generated attendance register · vector PDF · registry copy');
}

export async function downloadClassRanking(rows: RankingRow[], options?: Parameters<typeof buildClassRanking>[1]) {
  const bytes = await buildClassRanking(rows, options);
  downloadPdf(bytes, `class-ranking-${(options?.className ?? 'all').replace(/\s+/g, '-').toLowerCase()}.pdf`);
  return bytes;
}

export async function downloadAttendanceRegister(
  rows: RegisterRow[],
  options?: Parameters<typeof buildAttendanceRegister>[1]
) {
  const bytes = await buildAttendanceRegister(rows, options);
  downloadPdf(bytes, `attendance-register-${new Date().toISOString().slice(0, 10)}.pdf`);
  return bytes;
}
