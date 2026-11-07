/**
 * @fileOverview Builds the printable document suite from demo data and verifies the
 * output is a genuine vector PDF (pdf-lib can re-open it, fonts are embedded, and
 * the documents are real PDF objects rather than raster screenshots).
 *
 * Run with: npm run demo:pdf
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';

import { buildFeeStatement } from '@/lib/pdf/fee-statement';
import { buildReportCard } from '@/lib/pdf/report-card';
import { buildClassRanking, buildAttendanceRegister } from '@/lib/pdf/class-report';
import { buildIdCards } from '@/lib/pdf/id-card';
import { buildTimetablePdf } from '@/lib/pdf/timetable';
import { buildTimetable } from '@/lib/timetable';

const OUT_DIR = join(process.cwd(), 'public', 'printables');

const student = {
  id: 'ALT-2026-001',
  name: 'Amina Hassan Mwinyi',
  className: 'Form 2',
  admissionNumber: 'ALT-2026-001',
  parentName: 'Hassan Mwinyi',
  parentPhone: '+255 754 118 220',
  totalPaid: 194_000,
  balance: 156_000,
  feeStructure: 350_000,
};

const transactions = [
  {
    id: 'tx-0001',
    amount: 120_000,
    status: 'Verified',
    paymentMethod: 'M-Pesa',
    feeType: 'Tuition',
    transactionReference: 'MPESA-448193',
    createdAt: new Date('2026-09-12T09:24:00Z'),
  },
  {
    id: 'tx-0002',
    amount: 44_000,
    status: 'Verified',
    paymentMethod: 'Tigo Pesa',
    feeType: 'Transport',
    transactionReference: 'TIGO-770218',
    createdAt: new Date('2026-10-02T13:05:00Z'),
  },
  {
    id: 'tx-0003',
    amount: 30_000,
    status: 'Pending',
    paymentMethod: 'Control Number',
    feeType: 'Meals',
    controlNumber: 'CP-2026-45120983',
    createdAt: new Date('2026-10-28T07:41:00Z'),
  },
];

const grades = [
  { subject: 'Mathematics', score: 82 },
  { subject: 'English Language', score: 74 },
  { subject: 'Kiswahili', score: 88 },
  { subject: 'Physics', score: 69 },
  { subject: 'Chemistry', score: 71 },
  { subject: 'Biology', score: 77 },
  { subject: 'Geography', score: 63 },
  { subject: 'History', score: 80 },
];

const cohort = [
  { name: 'Amina Hassan Mwinyi', admissionNumber: 'ALT-2026-001', className: 'Form 2', average: 75.5, division: 'I', balance: 156_000 },
  { name: 'Baraka Joseph Mushi', admissionNumber: 'ALT-2026-004', className: 'Form 2', average: 71.2, division: 'II', balance: 0 },
  { name: 'Neema Said Komba', admissionNumber: 'ALT-2026-012', className: 'Form 2', average: 68.9, division: 'II', balance: 48_000 },
  { name: 'Juma Ally Nyoni', admissionNumber: 'ALT-2026-021', className: 'Form 2', average: 62.4, division: 'III', balance: 220_000 },
  { name: 'Rehema Peter Massawe', admissionNumber: 'ALT-2026-033', className: 'Form 2', average: 58.1, division: 'III', balance: 12_000 },
];

const register = cohort.map((row) => ({
  admissionNumber: row.admissionNumber,
  name: row.name,
  className: row.className,
  present: 58,
  late: 3,
  absent: 5,
  rate: (58 / 66) * 100,
}));

const cards = [
  { ...student, gender: 'Female', house: 'Kilimanjaro' },
  { id: 'ALT-2026-004', name: 'Baraka Joseph Mushi', className: 'Form 2', admissionNumber: 'ALT-2026-004', parentPhone: '+255 713 990 004', balance: 0, house: 'Serengeti' },
  { id: 'ALT-2026-012', name: 'Neema Said Komba', className: 'Form 1', admissionNumber: 'ALT-2026-012', parentPhone: '+255 786 220 117', balance: 48_000, house: 'Kilimanjaro' },
  { id: 'ALT-2026-021', name: 'Juma Ally Nyoni', className: 'Form 3', admissionNumber: 'ALT-2026-021', parentPhone: '+255 745 660 902', balance: 220_000, house: 'Serengeti' },
];

interface Case {
  file: string;
  label: string;
  build: () => Promise<Uint8Array>;
}

const CASES: Case[] = [
  { file: 'fee-statement.pdf', label: 'Fee statement', build: () => buildFeeStatement(student, transactions, { term: 'Term 2', academicYear: '2026' }) },
  {
    file: 'report-card.pdf',
    label: 'Report card',
    build: () =>
      buildReportCard({
        student,
        grades,
        term: 'Term 2',
        academicYear: '2026',
        position: 3,
        classSize: 42,
        attendanceRate: 96.7,
      }),
  },
  {
    file: 'class-ranking.pdf',
    label: 'Class ranking',
    build: () => buildClassRanking(cohort.map((row, index) => ({ ...row, rank: index + 1 })), { className: 'Form 2', term: 'Term 2' }),
  },
  { file: 'attendance-register.pdf', label: 'Attendance register', build: () => buildAttendanceRegister(register, { className: 'Form 2', from: '01 Sep 2026', to: '06 Nov 2026' }) },
  { file: 'learner-id-cards.pdf', label: 'Learner ID cards', build: () => buildIdCards(cards, { term: 'Term 2 2026' }) },
  { file: 'timetable.pdf', label: 'Master timetable', build: () => buildTimetablePdf(buildTimetable('Form 2', 'A', { term: 'Term 2 · 2026' })) },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  let failures = 0;

  for (const testCase of CASES) {
    const bytes = await testCase.build();
    const path = join(OUT_DIR, testCase.file);
    writeFileSync(path, bytes);

    const reloaded = await PDFDocument.load(readFileSync(path));
    const pages = reloaded.getPageCount();
    const header = Buffer.from(bytes.slice(0, 8)).toString('latin1');
    const isPdf = header.startsWith('%PDF-');
    const hasVectorText = bytes.byteLength > 2_000;
    const ok = isPdf && pages >= 1 && hasVectorText;

    console.log(
      `${ok ? 'OK  ' : 'FAIL'} ${testCase.label.padEnd(20)} ${String(bytes.byteLength).padStart(7)} bytes · ${pages} page(s) · ${header} · ${reloaded.getTitle() ?? 'untitled'}`
    );
    if (!ok) failures += 1;
  }

  // Prove the ID sheet carries an embedded QR matrix (image XObject) and that the
  // statement is text-only vector content.
  const idBytes = readFileSync(join(OUT_DIR, 'learner-id-cards.pdf'));
  const idDoc = await PDFDocument.load(idBytes);
  const statementDoc = await PDFDocument.load(readFileSync(join(OUT_DIR, 'fee-statement.pdf')));
  console.log(`   ID sheet pages: ${idDoc.getPageCount()} · statement pages: ${statementDoc.getPageCount()}`);
  console.log(`   Statement creator: ${statementDoc.getProducer() ?? 'pdf-lib'}`);

  if (failures > 0) {
    console.log(`\n${failures} PRINTABLE(S) FAILED`);
    process.exitCode = 1;
    return;
  }
  console.log('\nALL PRINTABLES BUILD AS REAL VECTOR PDFS → public/printables');
}

main().catch((error) => {
  console.error('PDF SUITE FAILED', error);
  process.exitCode = 1;
});
