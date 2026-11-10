import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildIdCards, layoutIdCardName } from '@/lib/pdf/id-card';
import { buildTimetable, summarizeTimetable, TIMETABLE_CLASSES, TIMETABLE_STREAMS } from '@/lib/timetable';

async function main() {
  for (const className of TIMETABLE_CLASSES) {
    for (const stream of TIMETABLE_STREAMS) {
      const timetable = buildTimetable(className, stream);
      assert.deepEqual(summarizeTimetable(timetable), { teaching: 40, free: 0, breaks: 10, capacity: 40 });
      timetable.grid[0][0] = null;
      assert.deepEqual(summarizeTimetable(timetable), { teaching: 39, free: 1, breaks: 10, capacity: 40 });
    }
  }
  console.log('OK   all example timetables distinguish breaks from unallocated lessons');

  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const names = [
    'ZAINAB EMMANUEL MALLYA',
    'AUGUSTINO CASTRO SWAI',
    'ELIZABETH MWANAHAMISI CHRISTOPHER MWAKYUSA',
    'ALEXANDER SUPERLONGSINGLEBARRELLEDSURNAME MWAKALINGA',
  ];
  for (const width of [108.65, 152.65]) {
    for (const name of names) {
      const { lines, size } = layoutIdCardName(name, bold, width);
      assert.ok(lines.length <= 3, `${name}: ${lines.length} lines`);
      assert.equal(lines.join('').replace(/\s/g, ''), name.replace(/\s/g, ''));
      assert.ok(lines.every((line) => bold.widthOfTextAtSize(line, size) <= width + 0.01));
      assert.ok(91 - (lines.length - 1) * 10.5 > 62 + 7.4, 'name clears admission number');
    }
  }
  const pdf = await buildIdCards(names.map((name, index) => ({ id: `ALT-2026-${index}`, name, class: 'Form 2' })));
  assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
  console.log('OK   long names fit above the admission number on four-up ID cards');
  console.log('DATA INTEGRITY REGRESSIONS PASSED');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
