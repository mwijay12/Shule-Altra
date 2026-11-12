'use client'
import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import type { Staff } from '@/types/staff'

type Change = { id: string; staffId: string; from: string; to: string; reason: string; actorUid: string; createdAt?: { toDate?: () => Date } }
export function StaffRoleHistory({ schoolId, staff }: { schoolId: string; staff: Staff[] }) {
  const db = useFirestore()
  const q = useMemoFirebase(() => query(collection(db, 'schools', schoolId, 'staffRoleChanges'), orderBy('createdAt', 'desc'), limit(50)), [db, schoolId])
  const { data, error, isLoading } = useCollection<Change>(q)
  return <details className="rounded-2xl border bg-card p-5 text-sm"><summary className="cursor-pointer font-semibold">Access role change history</summary>
    <p className="mt-2 text-muted-foreground">Latest 50 changes made with this tool. Changes made directly in Firebase or by other tools may not be included.</p>
    {isLoading ? <p className="mt-3">Loading history…</p> : error ? <p role="alert" className="mt-3 text-destructive">Could not load role history. Check access and connection.</p> : !data?.length ? <p className="mt-3 text-muted-foreground">No role changes recorded by this tool.</p> : <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">{data.map(change => {
      const date = change.createdAt?.toDate?.()
      return <li key={change.id} className="rounded-lg border p-3 break-words"><p className="font-semibold">{staff.find(person => person.id === change.staffId)?.fullName ?? change.staffId}: {change.from} → {change.to}</p><p>Reason: {change.reason}</p><p className="text-xs text-muted-foreground break-all">By UID {change.actorUid} · {date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Time pending or unavailable'}</p></li>
    })}</ul>}
  </details>
}
