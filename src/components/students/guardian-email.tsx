'use client'

import * as React from 'react'
import { collection, orderBy, query, where } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { DEMO_MODE } from '@/lib/demo/config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/types/student'

type Preview = { to: string; subject: string; text: string; fingerprint: string; testMode: boolean; provider: string; copyTo: string | null }
export function GuardianEmail() {
  const db = useFirestore(); const { user } = useUser(); const { role } = useAuth()
  const [search, setSearch] = React.useState(''); const [studentId, setStudentId] = React.useState('')
  const [kind, setKind] = React.useState<'fee-reminder' | 'payment-received'>('fee-reminder')
  const [transactionId, setTransactionId] = React.useState(''); const [preview, setPreview] = React.useState<Preview | null>(null)
  const [error, setError] = React.useState(''); const [result, setResult] = React.useState(''); const [busy, setBusy] = React.useState(false)
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BURSAR' || role === 'ACCOUNTANT'
  const studentsQ = useMemoFirebase(() => allowed ? query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc')) : null, [db, allowed])
  const { data: students, isLoading: loadingStudents } = useCollection<Student>(studentsQ)
  const txQ = useMemoFirebase(() => allowed && studentId ? query(collection(db, 'schools', 'school-001', 'transactions'), where('studentId', '==', studentId)) : null, [db, studentId, allowed])
  const { data: transactions, isLoading: loadingTx } = useCollection<any>(txQ)
  const choices = (students ?? []).filter(s => s.status !== 'Archived' && `${s.name} ${s.id}`.toLowerCase().includes(search.toLowerCase()))
  const verified = (transactions ?? []).filter(t => t.status === 'Verified')
  function reset() { setPreview(null); setError(''); setResult('') }
  async function request(mode: 'preview' | 'send') {
    if (busy) return
    if (!user || DEMO_MODE) { setError('Sign in to a configured live school to use guardian email.'); return }
    if (!studentId || (kind === 'payment-received' && !transactionId)) { setError('Select a learner and, for a receipt, a payment.'); return }
    if (mode === 'send' && (!preview || !window.confirm(`Send this message to ${preview.to}? Check the recipient and content first.`))) return
    setBusy(true); setError(''); setResult('')
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/notifications/student-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mode, kind, studentId, transactionId, fingerprint: preview?.fingerprint }) })
      const body = await response.json()
      if (!response.ok) { setError(body.error || 'Could not prepare the message.'); if (response.status === 409) setPreview(null); return }
      if (mode === 'preview') setPreview(body)
      else { setPreview(null); setResult(body.message || 'Accepted by the email provider.') }
    } catch { setError('The request failed. If you tried to send, check the mailbox before retrying: delivery may be uncertain.') }
    finally { setBusy(false) }
  }
  if (!allowed) return null
  return <section className="rounded-2xl bg-card p-5 sm:p-7 space-y-5" aria-label="Email a guardian">
    <div><h2 className="text-xl font-semibold">Email a guardian</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Choose a learner and preview a fee reminder or a recorded payment. Addresses and amounts are checked again against the live register before sending. Only one recipient at a time. Do not send seeded sample records to real addresses.</p></div>
    {DEMO_MODE && <p className="text-sm text-muted-foreground">Demo mode cannot send to real guardians. Use a configured live school.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium"><span>Search by learner name or ID</span><Input value={search} onChange={e => { setSearch(e.target.value); setStudentId(''); setTransactionId(''); reset() }} placeholder="Search learners" /></label>
      <label className="space-y-1 text-sm font-medium"><span>Learner</span><select aria-label="Learner" value={studentId} onChange={e => { setStudentId(e.target.value); setTransactionId(''); reset() }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{loadingStudents ? 'Loading learners…' : 'Select learner'}</option>{choices.map(s => <option key={s.id} value={s.id}>{s.name} · {s.id}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium"><span>Message</span><select aria-label="Message" value={kind} onChange={e => { setKind(e.target.value as typeof kind); setTransactionId(''); reset() }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="fee-reminder">Fee reminder</option><option value="payment-received">Payment recorded</option></select></label>
      {kind === 'payment-received' && <label className="space-y-1 text-sm font-medium"><span>Confirmed payment</span><select aria-label="Confirmed payment" value={transactionId} onChange={e => { setTransactionId(e.target.value); reset() }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{loadingTx ? 'Loading payments…' : 'Select payment'}</option>{verified.map(t => <option key={t.id} value={t.id}>{t.controlNumber || t.id} · TZS {Number(t.amount || 0).toLocaleString('en-US')}</option>)}</select></label>}
    </div>
    <Button type="button" variant="outline" disabled={busy || DEMO_MODE} onClick={() => void request('preview')}>{busy ? 'Working…' : 'Preview email'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{result && <p role="status" className="text-sm text-foreground">{result}</p>}
    {preview && <div className="space-y-3 rounded-xl bg-muted/40 p-4"><p className="break-all text-sm"><strong>To:</strong> {preview.to}</p><p className="text-sm"><strong>Subject:</strong> {preview.subject}</p>{preview.copyTo && <p className="break-all text-sm"><strong>Office copy (BCC):</strong> {preview.copyTo}</p>}<p className="whitespace-pre-wrap text-sm leading-relaxed">{preview.text}</p><p className="text-xs text-muted-foreground">{preview.testMode ? 'Test mode is on; guardian sending is disabled.' : preview.provider === 'dry-run' ? 'No email provider configured; sending is unavailable.' : 'Confirm the address and content. Provider acceptance does not guarantee inbox delivery.'}</p><Button type="button" disabled={busy || preview.testMode || preview.provider === 'dry-run'} onClick={() => void request('send')}>{busy ? 'Sending…' : 'Send this email'}</Button></div>}
  </section>
}
