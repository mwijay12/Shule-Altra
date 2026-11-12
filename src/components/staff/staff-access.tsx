'use client'
import * as React from 'react'
import { useFirestore } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { STAFF_ACCESS_ROLES, changeStaffAccess } from '@/lib/staff-access'
import type { Staff, StaffRole } from '@/types/staff'

const descriptions: Record<StaffRole, string> = {
  VIEWER: 'Limited viewing; not a dedicated driver or hostel permission.',
  TEACHER: 'Learning access; class/subject assignment is separate.',
  ACCOUNTANT: 'Financial access to school records.',
  BURSAR: 'Financial access plus some campus operations.',
  ADMIN: 'Broad administrative access, including staff and school settings.',
}
export function StaffAccessEditor({ person, schoolId, onSaved }: { person: Staff; schoolId: string; onSaved: () => void }) {
  const db = useFirestore(), { user } = useAuth()
  const [next, setNext] = React.useState<StaffRole>(person.role)
  const [reason, setReason] = React.useState(''), [busy, setBusy] = React.useState(false), [error, setError] = React.useState('')
  const supported = STAFF_ACCESS_ROLES.includes(person.role)
  async function save() {
    if (!user || busy) return
    if (next === 'ADMIN' && !window.confirm('ADMIN has broad access. Grant it to this staff member?')) return
    setBusy(true); setError('')
    try { await changeStaffAccess(db, schoolId, person.id, person.role, next, reason, user.uid); onSaved() }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not change the access role.') }
    finally { setBusy(false) }
  }
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">Current role: <strong>{person.role}</strong>. This changes the staff profile, not Firebase Authentication or job duties. The document ID must match the intended user's Firebase UID; verify it first.</p><p className="break-all text-xs text-muted-foreground">Staff document ID: {person.id}</p>
    {!supported ? <p role="alert" className="text-sm text-destructive">This role is not supported by this editor. Review the record manually.</p> : person.id === user?.uid ? <p role="alert" className="text-sm text-destructive">You cannot change your own role here.</p> : <><label className="block text-sm space-y-1"><span>New access role</span><select aria-label="New access role" value={next} onChange={e => setNext(e.target.value as StaffRole)} className="w-full h-10 rounded-md border bg-background px-3">{STAFF_ACCESS_ROLES.map(role => <option key={role}>{role}</option>)}</select></label><p className="text-sm text-muted-foreground">{descriptions[next]}</p><label className="block text-sm space-y-1"><span>Reason for change</span><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className="w-full min-h-20 rounded-md border bg-background p-2" /></label><Button type="button" disabled={busy || next === person.role || reason.trim().length < 5} onClick={() => void save()}>{busy ? 'Saving…' : 'Save access role'}</Button></>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">This tool records its changes; direct database changes may not appear in its history. Some server-side sessions may retain their previous role until they expire or refresh; an active signed cookie can be renewed up to its eight-hour absolute limit. For urgent removal, disable the Firebase Authentication account and treat existing server sessions as potentially active; account disable alone does not immediately invalidate the app's signed session cookie.</p>
  </div>
}
