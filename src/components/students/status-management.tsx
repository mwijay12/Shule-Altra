'use client'

import * as React from 'react'
import { collection, orderBy, query } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { changeStudentStatus, studentStatus, type StudentStatus } from '@/lib/student-status'
import type { Student } from '@/types/student'

export function StatusManagement({ student, actor, onSaved }: { student: Student; actor: { uid: string; email: string }; onSaved: (status: StudentStatus) => void }) {
  const db = useFirestore(); const { toast } = useToast()
  const current = studentStatus(student.status)
  const [next, setNext] = React.useState<StudentStatus>(current)
  const [reason, setReason] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const historyQuery = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'students', student.id, 'statusHistory'), orderBy('createdAt', 'desc')), [db, student.id])
  const { data: history, isLoading, error: historyError } = useCollection<any>(historyQuery)
  React.useEffect(() => { setNext(current); setReason(''); setError('') }, [student.id, current])
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return
    if (reason.trim().length < 5) { setError('Enter a reason of at least 5 characters.'); return }
    if (next === current) { setError('Choose a different status.'); return }
    if (!window.confirm(`Change ${student.name} from ${current} to ${next}? The reason will be saved in the status history.`)) return
    setBusy(true); setError('')
    try {
      await changeStudentStatus(db, student.id, next, reason, actor)
      onSaved(next); setReason('')
      toast({ title: 'Status updated', description: 'The learner’s other records were not deleted.' })
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Check your connection and permissions.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-4 border-t border-border pt-6" aria-label="Student status management">
    <div><h3 className="text-lg font-semibold">Student status</h3><p className="mt-1 text-sm text-muted-foreground">Current status: <strong className="text-foreground">{current}</strong>. Archived students are hidden from the default student register, not deleted. Other modules may still show them.</p></div>
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="student-status" className="block text-sm font-medium">Change status</label>
      <select id="student-status" value={next} onChange={event => setNext(event.target.value as StudentStatus)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="Active">Active</option><option value="Suspended">Suspended</option><option value="Archived">Archived (e.g. duplicate or mistake)</option></select>
      <label htmlFor="status-reason" className="block text-sm font-medium">Reason for change</label>
      <textarea id="status-reason" value={reason} maxLength={500} onChange={event => setReason(event.target.value)} rows={3} className="w-full rounded-md border border-input bg-background p-3 text-sm" placeholder="Briefly explain the change" aria-describedby="status-reason-note" />
      <p id="status-reason-note" className="text-xs text-muted-foreground">Required. Keep the reason brief and avoid unnecessary sensitive details. Only administrators can view the history.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="outline" disabled={busy || next === current}>{busy ? 'Saving…' : 'Save status'}</Button>
    </form>
    <div><h4 className="text-sm font-semibold">Status history</h4>
      {isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading history…</p> : historyError ? <p className="mt-2 text-sm text-destructive">Could not load history. Check your connection and permissions.</p> : !history?.length ? <p className="mt-2 text-sm text-muted-foreground">No status changes recorded yet.</p> : <ul className="mt-2 divide-y divide-border">{history.map((item: any) => <li key={item.id} className="space-y-1 py-3 text-sm"><p className="font-medium">{item.from} → {item.to}</p><p className="break-words text-muted-foreground">{item.reason}</p><p className="text-xs text-muted-foreground">{item.actorEmail || 'Administrator'} · {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : 'Date pending'}</p></li>)}</ul>}
    </div>
  </section>
}
