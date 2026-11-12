'use client'

import * as React from 'react'
import { collection, limit, orderBy, query } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import type { GradeRecord } from '@/types/grade'
import type { Student } from '@/types/student'

type Correction = {
  id: string
  actorUid: string
  reason: string
  keptId: string
  removedId: string
  keptSnapshot: GradeRecord
  removedSnapshot: GradeRecord
  createdAt?: { toDate?: () => Date }
}

export function CorrectionHistory({ students }: { students: Student[] }) {
  const db = useFirestore()
  const historyQuery = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'gradeCorrections'), orderBy('createdAt', 'desc'), limit(50)), [db])
  const { data, isLoading, error } = useCollection<Correction>(historyQuery)
  return <details className="rounded-xl border bg-card p-4 text-sm">
    <summary className="cursor-pointer font-semibold">Assessment correction history</summary>
    <p className="mt-3 text-muted-foreground">Latest 50 duplicate corrections made through this review tool, across all classes. Other changes made directly to the database may not appear here.</p>
    {isLoading ? <p className="mt-3">Loading history…</p> : error ? <p role="alert" className="mt-3 text-destructive">Could not load correction history. Check access and connection.</p> : !data?.length ? <p className="mt-3 text-muted-foreground">No recorded corrections.</p> :
      <ul className="mt-3 space-y-3 max-h-96 overflow-y-auto">{data.map(item => {
        const removed = item.removedSnapshot, kept = item.keptSnapshot
        const date = item.createdAt?.toDate?.()
        return <li key={item.id} className="rounded-lg border p-3 space-y-1 break-words">
          <p className="font-semibold">{students.find(s => s.id === removed?.studentId)?.name ?? removed?.studentId ?? 'Unknown learner'} · {removed?.subject ?? 'Unknown subject'}</p>
          <p>{removed?.term ?? 'Unknown term'} · {removed?.examType ?? 'Unknown exam'} · {removed?.academicYear ?? 'Unknown year'}</p>
          <p>Kept: {String(kept?.score ?? 'unknown')} ({item.keptId}) · Removed: {String(removed?.score ?? 'unknown')} ({item.removedId})</p>
          <p>Reason: {item.reason}</p>
          <p className="text-xs text-muted-foreground break-all">By UID {item.actorUid} · {date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Time pending or unavailable'}</p>
        </li>
      })}</ul>}
  </details>
}
