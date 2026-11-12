import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { buildExpenseRegisterReport } from '@/lib/finance/expense-report'
import { buildTabularReport } from '@/lib/pdf/tabular-report'
async function main() {
  const entries = [{ id: 'a', date: '2026-11-12', category: 'Food', description: 'Lunch', amount: 1000 }, { id: 'b', date: '2026-11-11', category: 'Supplies', description: 'Paper', amount: 500 }]
  const report = buildExpenseRegisterReport(entries, new Set(['b']), new Date('2026-11-12T12:00:00Z'), true)
  assert.equal(report.summary?.[0].value, 'TZS 1,000')
  assert.equal(report.summary?.[2].value, '1')
  assert.equal(report.sections[0].rows.find(r => r.description === 'Paper')?.state, 'VOID')
  assert.throws(() => buildExpenseRegisterReport([{ ...entries[0], amount: NaN }], new Set(), new Date(), false), /invalid/i)
  assert((await PDFDocument.load(await buildTabularReport(report))).getPageCount() > 0)
  console.log('EXPENSE REPORT TESTS PASSED')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
