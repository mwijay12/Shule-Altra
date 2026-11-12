import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore'

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
