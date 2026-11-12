import { addDoc, collection, doc, runTransaction, serverTimestamp, type Firestore } from 'firebase/firestore'

export const EXPENSE_CATEGORIES = ['Supplies', 'Food', 'Transport', 'Utilities', 'Maintenance', 'Salaries', 'Other'] as const
export type ExpenseInput = { date: string; category: string; description: string; amount: number; payee: string; reference: string; actorUid: string; actorEmail: string }
export function validateExpense(input: ExpenseInput) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date)
  const parsed = match ? new Date(`${input.date}T00:00:00Z`) : null
  if (!match || !parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.date) throw new Error('Choose a valid expense date.')
  if (!EXPENSE_CATEGORIES.some(c => c === input.category)) throw new Error('Choose an expense category.')
  if (input.description.trim().length < 3 || input.description.trim().length > 300) throw new Error('Enter a description of 3–300 characters.')
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000_000) throw new Error('Enter a positive whole-shilling amount up to TZS 1 trillion.')
  if (input.payee.trim().length > 120 || input.reference.trim().length > 120 || !input.actorUid) throw new Error('Check payee, reference and signed-in user.')
}
export async function recordExpense(db: Firestore, input: ExpenseInput) {
  validateExpense(input)
  return addDoc(collection(db, 'schools', 'school-001', 'expense_entries'), {
    date: input.date, category: input.category, description: input.description.trim(), amount: input.amount,
    payee: input.payee.trim(), reference: input.reference.trim(), recordedByUid: input.actorUid,
    recordedByEmail: input.actorEmail, createdAt: serverTimestamp(),
  })
}

export type ExpenseRow = { id: string; date: string; category: string; description: string; amount: number; payee?: string; reference?: string; recordedByUid?: string }
export type ExpenseFilter = { from: string; to: string; category: string; search: string }
export function filterExpenses(rows: ExpenseRow[], filter: ExpenseFilter): ExpenseRow[] {
  const search = filter.search.trim().toLocaleLowerCase()
  return rows.filter(row => (!filter.from || row.date >= filter.from) && (!filter.to || row.date <= filter.to)
    && (!filter.category || row.category === filter.category)
    && (!search || [row.description, row.payee, row.reference].some(value => (value ?? '').toLocaleLowerCase().includes(search))))
}
function csvCell(value: unknown): string {
  let text = String(value ?? '')
  // Neutralise formula-leading text before quoting; spreadsheets may ignore whitespace.
  if (/^[\s\x00-\x1f]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}
export function expensesCsv(rows: ExpenseRow[]): string {
  const headers = ['Date paid', 'Category', 'Description', 'Amount TZS', 'Paid to', 'Reference', 'Recorded by UID', 'Record ID']
  return '\ufeff' + [headers, ...rows.map(row => [row.date, row.category, row.description, row.amount, row.payee ?? '', row.reference ?? '', row.recordedByUid ?? '', row.id])].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

/** Mark one incorrect entry void; keep its original details and the reason. */
export async function voidExpense(db: Firestore, expenseId: string, reason: string, actorUid: string) {
  const why = reason.trim()
  if (!expenseId || !actorUid || why.length < 5 || why.length > 500) throw new Error('Enter a reason between 5 and 500 characters.')
  const expenseRef = doc(db, 'schools', 'school-001', 'expense_entries', expenseId)
  const voidRef = doc(db, 'schools', 'school-001', 'expense_voids', expenseId)
  await runTransaction(db, async tx => {
    const [expense, existing] = await Promise.all([tx.get(expenseRef), tx.get(voidRef)])
    if (!expense.exists()) throw new Error('This expense no longer exists.')
    if (existing.exists()) throw new Error('This expense was already voided.')
    tx.set(voidRef, { reason: why, actorUid, createdAt: serverTimestamp() })
  })
}
