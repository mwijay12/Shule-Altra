'use client'
import * as React from 'react'
import { collection, deleteDoc, doc, query, setDoc, serverTimestamp } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { Button } from '@/components/ui/button'
import { O_LEVEL_CLASSES } from '@/lib/academics/config'
import { SUBJECTS_SECONDARY } from '@/data/fixtures/tanzanian-names'
import { assignmentId, validAssignment, type TeachingAssignment } from '@/lib/academics/assignments'
import type { Staff } from '@/types/staff'

export function TeachingAssignments({ person }: { person: Staff }) {
  const db = useFirestore()
  const [className, setClassName] = React.useState<string>(O_LEVEL_CLASSES[0]); const [subject, setSubject] = React.useState(SUBJECTS_SECONDARY[0])
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('')
  const q = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'staff', person.id, 'teachingAssignments')), [db, person.id])
  const { data, error: loadError, isLoading } = useCollection<TeachingAssignment>(q)
  async function change(remove: boolean, c: string, s: string) {
    if (busy || !validAssignment(c, s)) return
    setBusy(true); setError('')
    try {
      const ref = doc(db, 'schools', 'school-001', 'staff', person.id, 'teachingAssignments', assignmentId(c, s))
      if (remove) await deleteDoc(ref)
      else await setDoc(ref, { className: c, subject: s, updatedAt: serverTimestamp() })
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the assignment.') }
    finally { setBusy(false) }
  }
  return <section className="space-y-4"><p className="text-sm text-muted-foreground">Assign subjects by class. The staff document ID must match the teacher’s Firebase Authentication UID; adding a staff record alone does not create or link a login. Verify the UID before assigning.</p>
    <p className="break-all text-xs text-muted-foreground">Staff document ID: {person.id}</p>
    {person.active === false && <p className="text-sm text-destructive">This staff member is inactive and cannot submit marks.</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm"><span>Class</span><select aria-label="Assignment class" className="h-10 w-full rounded-md border bg-background px-3" value={className} onChange={e => setClassName(e.target.value)}>{O_LEVEL_CLASSES.map(c => <option key={c}>{c}</option>)}</select></label><label className="space-y-1 text-sm"><span>Subject</span><select aria-label="Assignment subject" className="h-10 w-full rounded-md border bg-background px-3" value={subject} onChange={e => setSubject(e.target.value)}>{SUBJECTS_SECONDARY.map(s => <option key={s}>{s}</option>)}</select></label></div>
    <Button type="button" disabled={busy || isLoading || !!loadError || !!data?.some(a => a.className === className && a.subject === subject)} onClick={() => void change(false, className, subject)}>Assign subject</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {loadError ? <p role="alert" className="text-sm text-destructive">Could not load assignments. Check your connection or permissions.</p> : isLoading ? <p className="text-sm text-muted-foreground">Loading assignments…</p> : !data?.length ? <p className="text-sm text-muted-foreground">No subjects assigned yet.</p> : <ul className="divide-y">{data.map(a => <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span>{a.className} · {a.subject}</span><Button variant="ghost" size="sm" disabled={busy} onClick={() => { if (window.confirm(`Remove ${a.subject} for ${a.className}?`)) void change(true, a.className, a.subject) }}>Remove</Button></li>)}</ul>}
  </section>
}
