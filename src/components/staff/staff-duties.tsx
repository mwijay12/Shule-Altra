'use client'
import * as React from 'react'
import { useFirestore } from '@/firebase'
import { Button } from '@/components/ui/button'
import { O_LEVEL_CLASSES } from '@/lib/academics/config'
import { STAFF_DUTIES, saveStaffDuties, type StaffDuty } from '@/lib/staff-duties'
import type { Staff } from '@/types/staff'

export function StaffDuties({ person, schoolId, onSaved }: { person: Staff; schoolId: string; onSaved: () => void }) {
  const db = useFirestore()
  const initial = React.useMemo(() => ({ duties: person.duties ?? [], classTeacherClasses: person.classTeacherClasses ?? [] }), [person])
  const [duties, setDuties] = React.useState<StaffDuty[]>(initial.duties)
  const [classes, setClasses] = React.useState<string[]>(initial.classTeacherClasses)
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState('')
  async function save() {
    setBusy(true); setError('')
    try { await saveStaffDuties(db, schoolId, person.id, initial, { duties, classTeacherClasses: classes }); onSaved() }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save duties.') }
    finally { setBusy(false) }
  }
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">These are registry duties only: they do not create a login or change access permissions. Teaching subject assignments are managed separately. Classes are Form-level, not streams.</p>
    <fieldset className="grid gap-2 sm:grid-cols-2"><legend className="mb-2 text-sm font-semibold">Duties (choose any)</legend>{STAFF_DUTIES.map(duty => <label key={duty} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={duties.includes(duty)} onChange={e => { setDuties(v => e.target.checked ? [...v, duty] : v.filter(x => x !== duty)); if (duty === 'Class teacher' && !e.target.checked) setClasses([]) }} />{duty}</label>)}</fieldset>
    {duties.includes('Class teacher') && <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-2 text-sm font-semibold">Classes supervised</legend>{O_LEVEL_CLASSES.map(c => <label key={c} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={classes.includes(c)} onChange={e => setClasses(v => e.target.checked ? [...v, c] : v.filter(x => x !== c))} />{c}</label>)}</fieldset>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save duties'}</Button>
  </div>
}
