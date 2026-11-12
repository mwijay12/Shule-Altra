'use client'
import * as React from 'react'
import { collection, orderBy, query } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { EXPENSE_CATEGORIES, recordExpense, filterExpenses, expensesCsv, type ExpenseRow } from '@/lib/finance/expenses'
import { formatTZS } from '@/lib/finance-engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ExpenseRegister() {
  const db = useFirestore(), { user, role } = useAuth(), { toast } = useToast()
  const [busy, setBusy] = React.useState(false)
  const [from, setFrom] = React.useState(''), [to, setTo] = React.useState(''), [category, setCategory] = React.useState(''), [search, setSearch] = React.useState('')
  const q = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'expense_entries'), orderBy('date', 'desc')), [db])
  const { data, isLoading, error } = useCollection<ExpenseRow>(q)
  const invalidRange = !!from && !!to && from > to
  const filtered = React.useMemo(() => filterExpenses(data ?? [], { from, to, category, search }), [data, from, to, category, search])
  function exportCsv() {
    if (isLoading || error || invalidRange || !filtered.length) return
    const url = URL.createObjectURL(new Blob([expensesCsv(filtered)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'expense-register.csv'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BURSAR' || role === 'ACCOUNTANT'
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget, values = new FormData(form)
    if (!user || !allowed || busy) return
    setBusy(true)
    try {
      await recordExpense(db, { date: String(values.get('date') ?? ''), category: String(values.get('category') ?? ''), description: String(values.get('description') ?? ''), amount: Number(values.get('amount')), payee: String(values.get('payee') ?? ''), reference: String(values.get('reference') ?? ''), actorUid: user.uid, actorEmail: user.email ?? '' })
      form.reset(); toast({ title: 'Expense recorded', description: 'This records a payment already made; it does not move money.' })
    } catch (e) { toast({ variant: 'destructive', title: 'Expense not recorded', description: e instanceof Error ? e.message : 'Check your connection and try again.' }) }
    finally { setBusy(false) }
  }
  return <div className="space-y-5">
    <div className="rounded-2xl border bg-card p-5 space-y-2"><h2 className="text-lg font-semibold">Spending & petty cash</h2><p className="text-sm text-muted-foreground">Record expenses already paid, separately from student fees. Entries are not approvals, a cash balance, or proof of payment. Existing petty-cash requests and old expenditure reports are separate and are not included here. Corrections and receipt attachments are not available yet.</p></div>
    {allowed && <form onSubmit={submit} className="rounded-2xl border bg-card p-5 grid gap-4 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">Record a paid expense</h3>
      <label className="text-sm space-y-1"><span>Date paid</span><Input type="date" name="date" required /></label>
      <label className="text-sm space-y-1"><span>Category</span><select name="category" className="h-10 w-full rounded-md border bg-background px-3" required defaultValue=""><option value="" disabled>Choose category</option>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="text-sm space-y-1"><span>Description</span><Input name="description" minLength={3} maxLength={300} required /></label>
      <label className="text-sm space-y-1"><span>Amount (TZS)</span><Input type="number" name="amount" min="1" max="1000000000000" step="1" required /></label>
      <label className="text-sm space-y-1"><span>Paid to (optional)</span><Input name="payee" maxLength={120} /></label>
      <label className="text-sm space-y-1"><span>Receipt or payment reference (optional)</span><Input name="reference" maxLength={120} /></label>
      <div className="sm:col-span-2"><Button disabled={busy || !!error || isLoading}>{busy ? 'Saving…' : 'Record expense'}</Button></div>
    </form>}
    <section className="rounded-2xl border bg-card p-5 space-y-4"><h3 className="font-semibold">Expense register</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm space-y-1"><span>From</span><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="text-sm space-y-1"><span>To</span><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <label className="text-sm space-y-1"><span>Category filter</span><select aria-label="Category filter" value={category} onChange={e => setCategory(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3"><option value="">All categories</option>{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-sm space-y-1"><span>Search details</span><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Description, payee or reference" /></label>
      </div>
      {invalidRange && <p role="alert" className="text-sm text-destructive">Start date must not be after end date.</p>}
      {isLoading ? <p className="text-sm">Loading expenses…</p> : error ? <p role="alert" className="text-sm text-destructive">Expenses could not be loaded. Check your access and connection.</p> : invalidRange ? null : !filtered.length ? <p className="text-sm text-muted-foreground">No expenses match these filters.</p> : <><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{filtered.length} matching entries · recorded total: {formatTZS(filtered.reduce((sum, item) => sum + (typeof item.amount === 'number' && Number.isFinite(item.amount) ? item.amount : 0), 0))}. Not a cash balance.</p><Button type="button" variant="outline" onClick={exportCsv}>Export matching CSV</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm text-left"><thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Description</th><th className="p-2">Category</th><th className="p-2">Paid to / reference</th><th className="p-2 text-right">Amount</th></tr></thead><tbody>{filtered.map(item => <tr key={item.id} className="border-b"><td className="p-2">{item.date}</td><td className="p-2">{item.description}</td><td className="p-2">{item.category}</td><td className="p-2">{item.payee || '—'}{item.reference ? ` · ${item.reference}` : ''}</td><td className="p-2 text-right">{formatTZS(item.amount)}</td></tr>)}</tbody></table></div></>}
    </section>
  </div>
}
