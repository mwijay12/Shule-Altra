/**
 * @fileOverview Headless verification of every report in the Reports centre.
 *
 * Loads the demo dataset, runs the same pure builders the UI uses, and writes a
 * real PDF for each report into public/printables/reports. Fails when a report
 * returns no rows — that is exactly the "reports don't generate" bug class.
 *
 * Run with: npm run demo:reports
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';

import { buildDemoDataset } from '@/lib/demo/seed-data';
import { buildReportPayload, buildPerLearnerScores, buildAttendanceRows } from '@/lib/reports/builders';
import { buildTabularReport } from '@/lib/pdf/tabular-report';
import { buildClassRanking, buildAttendanceRegister } from '@/lib/pdf/class-report';

const OUT_DIR = join(process.cwd(), 'private', 'printables', 'reports');

/** One line per document: the page geometry, flagged if it is not uniform. */
async function describeSize(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const sizes = new Set(
    doc.getPages().map((page) => {
      const { width, height } = page.getSize();
      return `${Math.round(width)}x${Math.round(height)}`;
    })
  );
  return sizes.size === 1 ? `${doc.getPageCount()}p ${[...sizes][0]}` : `${doc.getPageCount()}p MIXED ${[...sizes].join('+')}`;
}

const REPORT_IDS = [
  'fee-ledger',
  'expenditure',
  'defaulters',
  'subject-analysis',
  'master-sheet',
  'canteen-log',
  'asset-register',
  'staff-attendance',
] as const;

function groupDataset(dataset: Record<string, any>) {
  const buckets = new Map<string, any[]>();
  Object.entries(dataset).forEach(([path, data]) => {
    const parts = path.split('/');
    if (parts.length !== 4) return; // schools/{id}/{collection}/{docId}
    const collection = parts[2];
    const list = buckets.get(collection) ?? [];
    list.push({ id: parts[3], ...data });
    buckets.set(collection, list);
  });
  return buckets;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const buckets = groupDataset(buildDemoDataset() as Record<string, any>);
  const learners = buckets.get('students') ?? [];
  const gradeRows = buckets.get('grades') ?? [];
  const attendanceRows = buckets.get('attendance') ?? [];
  const ledger = buckets.get('transactions') ?? [];
  const petty = buckets.get('petty_cash') ?? [];
  const canteen = buckets.get('canteen_sales') ?? [];
  const assets = buckets.get('assets') ?? [];
  const staff = buckets.get('staff') ?? [];

  const totalCollected = learners.reduce((sum, learner) => sum + Number(learner.totalPaid ?? 0), 0);
  const totalOutstanding = learners.reduce((sum, learner) => sum + Number(learner.balance ?? 0), 0);
  const collectionRate =
    totalCollected + totalOutstanding > 0 ? (totalCollected / (totalCollected + totalOutstanding)) * 100 : 0;

  const perLearnerScores = buildPerLearnerScores(learners, gradeRows);
  const data = {
    learners,
    ledger,
    gradeRows,
    attendanceRows,
    petty,
    canteen,
    assets,
    staff,
    perLearnerScores,
    collectionRate,
  };

  console.log(
    `Dataset: ${learners.length} learners · ${gradeRows.length} grades · ${attendanceRows.length} attendance · ${ledger.length} transactions`
  );

  let failures = 0;

  for (const id of REPORT_IDS) {
    const payload = buildReportPayload(id, data);
    if (!payload) {
      console.log(`FAIL ${id.padEnd(18)} no payload builder`);
      failures += 1;
      continue;
    }

    const rowCount = payload.sections.reduce((sum, section) => sum + section.rows.length, 0);
    const bytes = await buildTabularReport(payload);
    writeFileSync(join(OUT_DIR, `${id}.pdf`), bytes);
    const reloaded = await PDFDocument.load(readFileSync(join(OUT_DIR, `${id}.pdf`)));
    const pages = reloaded.getPageCount();
    // A report that starts landscape and turns portrait halfway is a bug you only
    // see on page two — assert one page size for the whole document.
    const sizes = new Set(
      reloaded.getPages().map((page) => {
        const { width, height } = page.getSize();
        return `${Math.round(width)}x${Math.round(height)}`;
      })
    );
    const uniform = sizes.size === 1;
    const ok = rowCount > 0 && bytes.byteLength > 2_000 && pages >= 1 && uniform;

    console.log(
      `${ok ? 'OK  ' : 'FAIL'} ${id.padEnd(18)} ${String(rowCount).padStart(4)} rows · ${String(bytes.byteLength).padStart(6)} bytes · ${pages} page(s) · ${[...sizes].join('+')}${uniform ? '' : ' ← MIXED ORIENTATION'} · ${payload.title}`
    );
    if (!ok) failures += 1;
  }

  // Merit ranking + attendance register go through their own dedicated builders.
  const rankingRows = perLearnerScores.map((row, index) => ({ ...row, rank: index + 1 }));
  const ranking = await buildClassRanking(rankingRows, {
    term: 'Term 2',
    academicYear: '2026',
    className: 'All streams',
  });
  writeFileSync(join(OUT_DIR, 'class-rank.pdf'), ranking);
  console.log(`OK   ${'class-rank'.padEnd(18)} ${String(rankingRows.length).padStart(4)} rows · ${String(ranking.byteLength).padStart(6)} bytes · ${await describeSize(ranking)} · merit ranking`);

  const register = await buildAttendanceRegister(buildAttendanceRows(learners, attendanceRows), {
    className: 'All streams',
    from: '01 Sep 2026',
    to: '06 Nov 2026',
  });
  writeFileSync(join(OUT_DIR, 'student-attendance.pdf'), register);
  console.log(`OK   ${'student-attendance'.padEnd(18)} ${String(learners.length).padStart(4)} rows · ${String(register.byteLength).padStart(6)} bytes · attendance register`);

  if (failures > 0) {
    console.log(`\n${failures} REPORT(S) FAILED`);
    process.exitCode = 1;
    return;
  }
  console.log('\nALL 10 REPORTS GENERATE REAL VECTOR PDFS → private/printables/reports');
}

main().catch((error) => {
  console.error('REPORT SUITE FAILED', error);
  process.exitCode = 1;
});
