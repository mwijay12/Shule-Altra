import type { TabularReportInput } from '@/lib/pdf/tabular-report'
import type { ExpenseRow } from '@/lib/finance/expenses'

/** New register only; historic petty-cash requests are a separate report. */
export function buildExpenseRegisterReport(expenses: ExpenseRow[], voidIds: ReadonlySet<string>, generatedAt: Date, demo: boolean): TabularReportInput {
  for (const row of expenses) {
    if (!row.id || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || typeof row.description !== 'string' || !Number.isSafeInteger(row.amount) || row.amount <= 0) throw new Error('An expense record is invalid. Review it before generating a report.')
  }
  const active = expenses.filter(e => !voidIds.has(e.id))
  const total = active.reduce((sum, e) => sum + e.amount, 0)
  if (!Number.isSafeInteger(total)) throw new Error('The expense total is too large to display accurately.')
  const rows = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).map(row => ({
    date: row.date, description: row.description, category: row.category || 'Unspecified', payee: row.payee || '—', amount: `TZS ${row.amount.toLocaleString('en-US')}`, state: voidIds.has(row.id) ? 'VOID' : 'Active',
  }))
  return {
    title: 'Recorded expense register',
    subtitle: demo ? 'Demo records · all dates' : 'Recorded entries · all dates',
    reference: `EXP-${generatedAt.toISOString().slice(0, 10).replace(/-/g, '')}`,
    meta: [{ label: 'Generated', value: generatedAt.toISOString() }, { label: 'Scope', value: 'All dates · new register' }],
    summary: [{ label: 'Active total', value: `TZS ${total.toLocaleString('en-US')}`, tone: 'neutral' }, { label: 'Active entries', value: String(active.length), tone: 'neutral' }, { label: 'Voided entries', value: String(expenses.length - active.length), tone: 'warn' }],
    sections: [{ title: 'Recorded expenses', columns: [{ key: 'date', header: 'Date', width: 60 }, { key: 'description', header: 'Description', width: 140 }, { key: 'category', header: 'Category', width: 65 }, { key: 'payee', header: 'Paid to', width: 80 }, { key: 'amount', header: 'Amount', width: 75, align: 'right' }, { key: 'state', header: 'Status', width: 48 }], rows, compact: true }],
    declaration: ['Voided entries are excluded from the active total. This is not a cash balance or payment verification.', 'Legacy petty-cash requests are not included. Entries and voids are read separately and may change while the report is prepared.'],
    signatures: [{ role: 'Prepared by', name: '________________' }, { role: 'Reviewed by', name: '________________' }],
  }
}
