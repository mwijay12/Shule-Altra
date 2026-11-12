'use client'
import * as React from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useFirestore } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ALL_NAV_ITEMS } from '@/components/admin/nav-config'
import { OPTIONAL_SIDEBAR, parseHiddenModules, saveSidebarPreferences, type SidebarModule } from '@/lib/navigation/sidebar-preferences'

export function useSidebarPreferences() {
  const db = useFirestore()
  const [state, setState] = React.useState<{ hidden: SidebarModule[]; revision: number; ready: boolean; error: string }>({ hidden: [], revision: 0, ready: false, error: '' })
  React.useEffect(() => onSnapshot(doc(db, 'schools', 'school-001', 'config', 'sidebar'), snap => {
    const data = snap.data()
    setState({ hidden: parseHiddenModules(data?.hidden), revision: data?.revision ?? 0, ready: true, error: '' })
  }, () => setState({ hidden: [], revision: 0, ready: true, error: 'Could not load sidebar preferences.' })), [db])
  return state
}
export function SidebarPreferencesEditor() {
  const db = useFirestore(), { user, role } = useAuth(), prefs = useSidebarPreferences()
  const [draft, setDraft] = React.useState<SidebarModule[] | null>(null)
  const [baseRevision, setBaseRevision] = React.useState(0), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState('')
  const admin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  function begin() { setDraft([...prefs.hidden]); setBaseRevision(prefs.revision); setMessage('') }
  async function save() {
    if (!admin || !user || !draft || busy) return
    setBusy(true); setMessage('')
    try { await saveSidebarPreferences(db, draft, baseRevision, user.uid); setDraft(null); setMessage('Sidebar preferences saved.') }
    catch(e) { setMessage(e instanceof Error ? e.message : 'Could not save settings.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-2xl border bg-card p-6 space-y-4"><h2 className="text-lg font-semibold">Sidebar modules</h2><p className="text-sm text-muted-foreground">Choose which links appear in the sidebar for this school. This only changes navigation: direct links, search, data access and permissions are not disabled. Dashboard, Settings and Help remain visible.</p>
    {!prefs.ready ? <p className="text-sm">Loading preferences…</p> : prefs.error ? <p role="alert" className="text-sm text-destructive">{prefs.error}</p> : !admin ? <p className="text-sm">Only administrators can change this list.</p> : !draft ? <Button type="button" onClick={begin}>Edit sidebar</Button> : <><fieldset className="grid gap-2 sm:grid-cols-2"><legend className="text-sm font-semibold mb-2">Show in sidebar</legend>{OPTIONAL_SIDEBAR.map(module => <label key={module} className="flex items-center gap-2 rounded border p-3 text-sm"><input type="checkbox" checked={!draft.includes(module)} onChange={e => setDraft(v => e.target.checked ? (v ?? []).filter(x => x !== module) : [...(v ?? []), module])} />{ALL_NAV_ITEMS.find(i => i.module === module)?.title ?? module}</label>)}</fieldset><div className="flex gap-2"><Button type="button" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save sidebar'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>Cancel</Button></div></>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>
}
