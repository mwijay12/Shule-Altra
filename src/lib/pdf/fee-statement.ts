/**
 * @fileOverview Official fee statement — vector PDF generated from live ledger rows.
 */

import {
  COLORS,
  createDocument,
  downloadPdf,
  finalize,
  keyValueGrid,
  letterhead,
  money,
  rect,
  sectionTitle,
  signatureRow,
  table,
  text,
} from '@/lib/pdf/kit';

export interface StatementStudent {
  id: string;
  name: string;
  className?: string;
  admissionNumber?: string;
  parentName?: string;
  parentPhone?: string;
  totalPaid?: number;
  balance?: number;
  feeStructure?: number;
}

export interface StatementTransaction {
  id?: string;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  feeType?: string;
  transactionReference?: string;
  controlNumber?: string;
  createdAt?: any;
}

function dateOf(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export async function buildFeeStatement(
  student: StatementStudent,
  transactions: StatementTransaction[],
  options: { term?: string; academicYear?: string } = {}
): Promise<Uint8Array> {
  const term = options.term ?? 'Term 2';
  const year = options.academicYear ?? '2026';
  const rows = [...transactions].sort((a, b) => {
    const aTime = dateOf(a.createdAt)?.getTime() ?? 0;
    const bTime = dateOf(b.createdAt)?.getTime() ?? 0;
    return aTime - bTime;
  });

  const paid = student.totalPaid ?? rows.filter((row) => row.status !== 'Failed' && row.status !== 'Pending').reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const pending = rows.filter((row) => row.status === 'Pending').reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  const billed = student.feeStructure ?? paid + Number(student.balance ?? 0);
  const balance = student.balance ?? Math.max(0, billed - paid);
  const reference = `FEE-${year}-${(student.admissionNumber ?? student.id).replace(/[^A-Za-z0-9]/g, '').slice(-6)}`;

  const ctx = await createDocument({
    title: `Fee statement — ${student.name}`,
    subject: 'Fee statement of account',
    reference,
    issuedBy: 'Bursar',
  });

  letterhead(ctx, 'Fee statement of account', `${term} · Academic year ${year}`);
  sectionTitle(ctx, 'Learner particulars');

  keyValueGrid(ctx, [
    { label: 'Learner', value: student.name, emphasis: true },
    { label: 'Admission no.', value: student.admissionNumber ?? student.id },
    { label: 'Class / stream', value: student.className ?? 'Unassigned' },
    { label: 'Guardian', value: student.parentName ?? 'On file' },
    { label: 'Guardian contact', value: student.parentPhone ?? 'On file' },
    { label: 'Statement ref.', value: reference },
  ]);

  // Summary cards
  const cardWidth = (ctx.width - ctx.margin * 2 - 24) / 3;
  const summary = [
    { label: 'Total billed', value: money(billed), color: COLORS.navy },
    { label: 'Total paid', value: money(paid), color: COLORS.success },
    { label: 'Outstanding', value: money(balance), color: balance > 0 ? COLORS.danger : COLORS.success },
  ];
  summary.forEach((item, index) => {
    const x = ctx.margin + index * (cardWidth + 12);
    rect(ctx, x, ctx.cursorY - 42, cardWidth, 52, { color: COLORS.soft, border: COLORS.line, borderWidth: 0.6 });
    rect(ctx, x, ctx.cursorY - 42, 3, 52, { color: item.color });
    text(ctx, item.label.toUpperCase(), x + 10, ctx.cursorY - 6, {
      size: 6.6,
      font: ctx.bold,
      color: COLORS.muted,
    });
    text(ctx, item.value, x + 10, ctx.cursorY - 24, {
      size: 13,
      font: ctx.bold,
      color: item.color,
      maxWidth: cardWidth - 16,
    });
  });
  ctx.cursorY -= 66;

  sectionTitle(ctx, `Payment history (${rows.length} entries)`);
  table(
    ctx,
    [
      { key: 'date', header: 'Date', width: 58 },
      { key: 'reference', header: 'Reference', width: 92 },
      { key: 'type', header: 'Fee type', width: 56 },
      { key: 'method', header: 'Method', width: 66 },
      { key: 'status', header: 'Status', width: 52 },
      { key: 'amount', header: 'Amount', width: 66, align: 'right' },
    ],
    rows.slice(-24).map((row) => {
      const created = dateOf(row.createdAt);
      return {
        date: created ? created.toLocaleDateString('en-GB') : '—',
        reference: row.transactionReference ?? row.controlNumber ?? row.id ?? '—',
        type: row.feeType ?? 'Tuition',
        method: row.paymentMethod ?? 'Control number',
        status: row.status ?? 'Verified',
        amount: money(Number(row.amount ?? 0)),
      };
    }),
    { compact: true, zebra: true }
  );

  if (pending > 0) {
    text(ctx, `Note: ${money(pending)} is recorded but not yet verified by the bank gateway.`, ctx.margin, ctx.cursorY, {
      size: 7.6,
      font: ctx.italic,
      color: COLORS.warning,
    });
    ctx.cursorY -= 18;
  }

  ctx.cursorY -= 6;
  sectionTitle(ctx, 'Declaration');
  const lines = [
    'This statement is produced from the institutional ledger and reflects every payment captured to date.',
    'Payments should quote the learner admission number and the control number shown on the fee bill.',
    'Any discrepancy must be reported to the bursar within 14 days of the issue date below.',
  ];
  lines.forEach((line) => {
    text(ctx, `• ${line}`, ctx.margin, ctx.cursorY, { size: 7.8, color: COLORS.ink, maxWidth: ctx.width - ctx.margin * 2 });
    ctx.cursorY -= 12;
  });
  ctx.cursorY -= 8;

  signatureRow(ctx, [
    { role: 'Bursar', name: 'J. Mwakalinga' },
    { role: 'Head of school', name: 'Dr. A. Mushi' },
    { role: 'Guardian acknowledgement', name: student.parentName ?? '________________' },
  ]);

  return finalize(ctx, 'Computer-generated fee statement · vector PDF · verify against the institutional ledger');
}

export async function downloadFeeStatement(
  student: StatementStudent,
  transactions: StatementTransaction[],
  options?: { term?: string; academicYear?: string }
) {
  const bytes = await buildFeeStatement(student, transactions, options);
  const safeName = student.name.replace(/[^A-Za-z0-9]+/g, '-');
  downloadPdf(bytes, `fee-statement-${safeName}.pdf`);
  return bytes;
}
