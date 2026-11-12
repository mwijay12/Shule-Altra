import './dom'
import assert from 'node:assert/strict'
import { initializeFirebase } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { recordExpense, filterExpenses, expensesCsv } from '@/lib/finance/expenses'
async function main() {
  const { firestore: db } = initializeFirebase()
  const input = { date: '2026-11-12', category: 'Supplies', description: '  Paper  ', amount: 12000, payee: ' Shop ', reference: ' R-1 ', actorUid: 'finance-user', actorEmail: 'finance@example.com' }
  await assert.rejects(() => recordExpense(db, { ...input, amount: 0 }), /amount/i)
  await assert.rejects(() => recordExpense(db, { ...input, amount: 2.5 }), /amount/i)
  await assert.rejects(() => recordExpense(db, { ...input, date: '2026-02-30' }), /date/i)
  const ref = await recordExpense(db, input)
  const docs = await getDocs(collection(db, 'schools', 'school-001', 'expense_entries'))
  const record = docs.docs.find(d => d.id === ref.id)?.data()
  assert.equal(record?.description, 'Paper'); assert.equal(record?.amount, 12000); assert.equal(record?.recordedByUid, 'finance-user')
  const rows = [{ id: 'a', date: '2026-11-12', category: 'Supplies', description: '=HYPERLINK(\"test\")', amount: 12000, payee: 'shop', reference: 'x' }, { id: 'b', date: '2026-10-01', category: 'Food', description: 'Lunch', amount: 1000 }]
  assert.deepEqual(filterExpenses(rows, { from: '2026-11-01', to: '', category: 'Supplies', search: 'SHOP' }).map(r => r.id), ['a'])
  assert.deepEqual(filterExpenses(rows, { from: '', to: '2026-10-01', category: '', search: '' }).map(r => r.id), ['b'])
  const csv = expensesCsv(rows); assert(csv.includes("'=HYPERLINK(")); assert(csv.includes('\"\"test\"\"')); assert(!csv.includes('Food,Lunch'))
  console.log('EXPENSE REGISTER TESTS PASSED (demo store)')
}
main().catch(e => { console.error(e); process.exitCode = 1 })
