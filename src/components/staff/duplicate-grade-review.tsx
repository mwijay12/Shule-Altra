'use client'
import * as React from 'react'
import { useFirestore } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { resolveDuplicate } from '@/lib/academics/resolve-duplicate'
import type { GradeRecord } from '@/types/grade'
import type { Student } from '@/types/student'
import { Button } from '@/components/ui/button'

export function DuplicateGradeReview({ groups, students }: { groups: GradeRecord[][]; students: Student[] }) {
  const db = useFirestore(), { user } = useAuth(), { toast } = useToast()
  const [busy, setBusy] = React.useState(false)
  async function remove(keep: GradeRecord, discarded: GradeRecord) {
    const reason = window.prompt(`You chose to KEEP ${keep.score} (record ${keep.id}) and remove ${discarded.score} (record ${discarded.id}). Enter a reason (at least 5 characters):`)
    if (reason === null) return
    if (!user || reason.trim().length < 5 || reason.trim().length > 500) { toast({ variant: 'destructive', title: 'Reason required', description: 'Enter 5–500 characters and sign in as an administrator.' }); return }
    if (!window.confirm('Permanently remove the selected mark? A copy and your reason will be saved in correction history.')) return
    setBusy(true)
    try { await resolveDuplicate(db, keep, discarded, reason, user.uid); toast({ title: 'Duplicate removed', description: 'The removed record and reason were saved for administrator review.' }) }
    catch (e) { toast({ variant: 'destructive', title: 'Correction not saved', description: e instanceof Error ? e.message : 'Check your connection and try again.' }) }
    finally { setBusy(false) }
  }
  return <div className="space-y-3">{groups.map(group => <div key={group.map(g => g.id).join(',')} className="rounded border border-destructive/20 p-3 space-y-2">
    <p className="font-semibold">{students.find(s => s.id === group[0].studentId)?.name ?? group[0].studentId} · {group[0].subject}</p>
    <p className="text-xs">Compare against the original marks. Select a mark to keep and remove one other record at a time.</p>
    {group.map(keep => <div key={keep.id} className="break-all border-t border-destructive/10 pt-2"><span>Keep {keep.score} · record {keep.id}</span><div className="flex flex-wrap gap-1 mt-1">{group.filter(g => g.id !== keep.id).map(discarded => <Button key={discarded.id} type="button" variant="outline" size="sm" disabled={busy} onClick={() => void remove(keep, discarded)}>Remove {discarded.score} ({discarded.id})</Button>)}</div></div>)}
  </div>)}</div>
}
