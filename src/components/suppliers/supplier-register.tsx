'use client'
import * as React from 'react'
import { collection, query } from 'firebase/firestore'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { saveSupplier, type Supplier, type SupplierFields } from '@/lib/suppliers/register'

export function SupplierRegister() {
  const db = useFirestore(), { user, role } = useAuth(), { toast } = useToast()
  const [open, setOpen] = React.useState(false), [editing, setEditing] = React.useState<Supplier | undefined>(), [busy, setBusy] = React.useState(false), [search, setSearch] = React.useState('')
  const q = useMemoFirebase(() => query(collection(db, 'schools', 'school-001', 'suppliers')), [db])
  const { data, isLoading, error } = useCollection<Supplier>(q)
  const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'BURSAR' || role === 'ACCOUNTANT'
  const rows = (data ?? []).filter(s => [s.name, s.contactName, s.category, s.phone, s.email].some(x => typeof x === 'string' && x.toLowerCase().includes(search.trim().toLowerCase()))).sort((a,b) => (a.name ?? '').localeCompare(b.name ?? ''))
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user || !allowed || busy) return
    const form = new FormData(event.currentTarget)
    const fields = Object.fromEntries(['name','contactName','phone','email','category','notes'].map(k => [k, String(form.get(k) ?? '')])) as SupplierFields
    setBusy(true)
    try { await saveSupplier(db, fields, user.uid, editing); setOpen(false); toast({ title: editing ? 'Supplier updated' : 'Supplier added' }) }
    catch(e) { toast({ variant: 'destructive', title: 'Supplier not saved', description: e instanceof Error ? e.message : 'Check your connection and try again.' }) }
    finally { setBusy(false) }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap gap-4 justify-between rounded-2xl border bg-card p-5"><div><h2 className="text-lg font-semibold">Suppliers</h2><p className="text-sm text-muted-foreground">Keep supplier contacts in one place. Phone and email links open your device's apps; the school system does not send or track messages.</p></div>{allowed && <Button disabled={isLoading || !!error} onClick={() => { setEditing(undefined); setOpen(true) }}>Add supplier</Button>}</div>
    <label className="block max-w-md space-y-1 text-sm"><span>Search suppliers</span><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, contact, category or phone" /></label>
    {isLoading ? <p>Loading suppliers…</p> : error ? <p role="alert" className="text-destructive text-sm">Could not load suppliers. Check your connection or permissions.</p> : !rows.length ? <p className="rounded-2xl border p-5 text-sm text-muted-foreground">No suppliers match your search.</p> : <div className="grid gap-3 md:grid-cols-2">{rows.map(person => <article key={person.id} className="rounded-2xl border bg-card p-5 space-y-3"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">{person.name}</h3><p className="text-sm text-muted-foreground">{person.category || 'Category not specified'}{person.contactName ? ` · ${person.contactName}` : ''}</p></div>{allowed && <Button variant="outline" size="sm" onClick={() => { setEditing(person); setOpen(true) }}>Edit</Button>}</div><p className="text-sm break-all">{person.phone || 'No phone'} · {person.email || 'No email'}</p>{person.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{person.notes}</p>}<div className="flex flex-wrap gap-2">{person.phone && <Button asChild variant="outline" size="sm"><a href={`tel:${person.phone}`}>Call</a></Button>}{person.email && <Button asChild variant="outline" size="sm"><a href={`mailto:${encodeURIComponent(person.email)}`}>Email</a></Button>}</div></article>)}</div>}
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v) }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Edit supplier' : 'Add supplier'}</DialogTitle><DialogDescription>Enter a phone or email. Verify details before contacting a supplier.</DialogDescription></DialogHeader><form onSubmit={submit} key={editing?.id ?? 'new'} className="grid gap-3 sm:grid-cols-2">
      {([['name','Supplier name',true,120], ['contactName','Contact person',false,120], ['phone','Phone (Tanzania)',false,13], ['email','Email',false,254], ['category','Category',false,120]] as const).map(([key,label,required,max]) => <label className="space-y-1 text-sm" key={key}><span>{label}</span><Input name={key} type={key === 'email' ? 'email' : 'text'} required={required} maxLength={max} defaultValue={editing?.[key] ?? ''} /></label>)}
      <label className="sm:col-span-2 space-y-1 text-sm"><span>Notes (optional)</span><textarea name="notes" maxLength={500} defaultValue={editing?.notes ?? ''} className="min-h-20 w-full rounded-md border bg-background p-2" /></label><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save supplier'}</Button>
    </form></DialogContent></Dialog>
  </section>
}
