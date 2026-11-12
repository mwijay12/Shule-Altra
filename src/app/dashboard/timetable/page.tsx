"use client"

import * as React from 'react'
import { doc } from 'firebase/firestore'
import { CalendarDays, Clock, Download, Loader2, Pencil, User } from 'lucide-react'
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { DEMO_MODE } from '@/lib/demo/config'
import { TIMETABLE_CLASSES, TIMETABLE_STREAMS, summarizeTimetable, type Slot } from '@/lib/timetable'
import { scheduleId, scheduleTimetable, readSchedule, saveTimetableSlot } from '@/lib/timetable-store'
import { ChartPanel, WeekUtilisation } from '@/components/admin/module-charts'
import { StatCard } from '@/components/admin/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Editing = { day: string; periodId: string; periodLabel: string; expected: Slot | null }
export default function TimetablePage() {
  const db = useFirestore(); const { role } = useAuth(); const { toast } = useToast()
  const [className, setClassName] = React.useState('Form 2'); const [stream, setStream] = React.useState('A')
  const [editing, setEditing] = React.useState<Editing | null>(null)
  const [subject, setSubject] = React.useState(''); const [teacher, setTeacher] = React.useState(''); const [room, setRoom] = React.useState('')
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState(''); const [exporting, setExporting] = React.useState(false)
  const id = scheduleId(className, stream)
  const ref = useMemoFirebase(() => doc(db, 'schools', 'school-001', 'timetable', id), [db, id])
  const { data, isLoading, error: loadError } = useDoc(ref)
  const currentData = data?.id === id ? data : null
  const parsed = React.useMemo(() => { try { return { schedule: readSchedule(currentData), error: '' } } catch (err) { return { schedule: null, error: err instanceof Error ? err.message : 'Unable to read timetable.' } } }, [currentData])
  const timetable = React.useMemo(() => scheduleTimetable(className, stream, parsed.schedule), [className, stream, parsed.schedule])
  const summary = summarizeTimetable(timetable)
  const canEdit = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'TEACHER'
  function openCell(day: string, periodId: string, periodLabel: string, slot: Slot | null) {
    setEditing({ day, periodId, periodLabel, expected: slot ? { ...slot } : null })
    setSubject(slot?.subject ?? ''); setTeacher(slot?.teacher ?? ''); setRoom(slot?.room ?? ''); setError('')
  }
  async function save(slot: Slot | null) {
    if (!editing || busy) return
    setBusy(true); setError('')
    try {
      await saveTimetableSlot(db, { className, stream, day: editing.day, periodId: editing.periodId, slot, expected: editing.expected })
      setEditing(null)
      toast({ title: slot ? 'Period saved' : 'Period cleared', description: DEMO_MODE ? 'Stored in this browser only.' : 'Saved to the school timetable.' })
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Check your connection and try again.') }
    finally { setBusy(false) }
  }
  async function exportPdf() {
    setExporting(true)
    try { const { downloadTimetablePdf } = await import('@/lib/pdf/timetable'); await downloadTimetablePdf(timetable, { saved: true }) }
    catch (err) { toast({ variant: 'destructive', title: 'Could not create PDF', description: err instanceof Error ? err.message : 'Try again.' }) }
    finally { setExporting(false) }
  }
  return <div className="mx-auto max-w-full space-y-6 px-1 pb-24">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2"><h1 className="font-headline text-2xl font-semibold">School timetable</h1><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Select a class and stream, then choose a teaching period to add or edit a lesson.</p></div>
      <Button variant="outline" onClick={exportPdf} disabled={exporting || isLoading || !!loadError || !!parsed.error || !currentData}><Download className="mr-2 h-4 w-4" />{exporting ? 'Building PDF…' : 'Download saved timetable'}</Button>
    </header>
    <div className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
      {DEMO_MODE ? 'Demo schedules are saved only in this browser and do not sync to other devices.' : 'Schedules are saved in Firebase. Saving needs a connection; offline queuing is not available for this clash check.'} The fixed school day covers Form 1–4, streams A and B. Teacher and room clashes are checked by exact name at the same period across these schedules only; spelling variations and other timetables need manual review.
    </div>
    <div className="flex flex-wrap gap-4">
      <label className="space-y-1 text-sm font-medium"><span className="block">Class</span><select aria-label="Class" value={className} onChange={e => { setClassName(e.target.value); setEditing(null) }} className="h-11 min-w-40 rounded-md border border-input bg-background px-3">{TIMETABLE_CLASSES.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="space-y-1 text-sm font-medium"><span className="block">Stream</span><select aria-label="Stream" value={stream} onChange={e => { setStream(e.target.value); setEditing(null) }} className="h-11 min-w-32 rounded-md border border-input bg-background px-3">{TIMETABLE_STREAMS.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    {isLoading ? <p role="status" className="py-8 text-sm text-muted-foreground">Loading timetable…</p> : loadError || parsed.error ? <p role="alert" className="py-8 text-sm text-destructive">{parsed.error || 'Could not load timetable. Check your connection or permissions.'}</p> : <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} label="Teaching periods" value={summary.teaching} icon={Clock} tone="primary" sub={`${className} · ${stream}`} />
        <StatCard index={1} label="Subjects" value={new Set(timetable.subjectLoad.map(s => s.subject.toLowerCase())).size} icon={CalendarDays} tone="accent" sub="On this timetable" />
        <StatCard index={2} label="Teachers" value={new Set(timetable.subjectLoad.map(s => s.teacher.toLowerCase())).size} icon={User} tone="emerald" sub="Names on this timetable" />
        <StatCard index={3} label="Free periods" value={summary.free} icon={CalendarDays} tone="slate" sub={`${summary.breaks} break slots excluded`} />
      </div>
      <ChartPanel title="Week at a glance" hint={`${className} · Stream ${stream}`}><WeekUtilisation timetable={timetable} /></ChartPanel>
      <section className="overflow-hidden rounded-2xl bg-card">
        <div className="space-y-1 p-5"><h2 className="text-lg font-semibold">{className} · Stream {stream}</h2><p className="text-sm text-muted-foreground">{currentData ? 'Saved timetable' : 'No saved lessons yet. Select a free period to begin.'}{!canEdit ? ' You have read-only access.' : ''}</p></div>
        <div className="overflow-x-auto"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead>Time</TableHead>{timetable.days.map(day => <TableHead key={day} className="text-center">{day}</TableHead>)}</TableRow></TableHeader><TableBody>
          {timetable.periods.map((period, pi) => <TableRow key={period.id}><TableCell className="min-w-32"><span className="block text-sm font-semibold">{period.label}</span><span className="text-xs tabular-nums text-muted-foreground">{period.time}</span></TableCell>{timetable.days.map((day, di) => {
            const slot = timetable.grid[pi][di]
            return <TableCell key={day} className="p-2 text-center">{period.isBreak ? <span className="text-xs text-muted-foreground">{period.label}</span> : canEdit ? <button type="button" onClick={() => openCell(day, period.id, period.label, slot)} aria-label={`${slot ? 'Edit' : 'Add'} ${day} ${period.label}`} className="min-h-16 w-full rounded-lg p-2 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{slot ? <><span className="block font-semibold">{slot.subject}</span><span className="block text-xs text-muted-foreground">{slot.teacher}{slot.room ? ` · ${slot.room}` : ''}</span></> : <span className="text-xs text-muted-foreground">+ Add lesson</span>}</button> : slot ? <span className="text-sm">{slot.subject}<span className="block text-xs text-muted-foreground">{slot.teacher} · {slot.room}</span></span> : <span className="text-xs text-muted-foreground">Free</span>}</TableCell>
          })}</TableRow>)}
        </TableBody></Table></div>
      </section>
    </>}
    <Dialog open={!!editing} onOpenChange={open => { if (!open && !busy) setEditing(null) }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="h-4 w-4" />{editing?.day} · {editing?.periodLabel}</DialogTitle><DialogDescription>{className} · Stream {stream}. Enter a consistent teacher and room name so clashes can be checked.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save({ subject, teacher, room }) }}>
        <label htmlFor="tt-subject" className="block space-y-1 text-sm font-medium"><span>Subject</span><Input id="tt-subject" value={subject} onChange={e => setSubject(e.target.value)} maxLength={80} required /></label>
        <label htmlFor="tt-teacher" className="block space-y-1 text-sm font-medium"><span>Teacher</span><Input id="tt-teacher" value={teacher} onChange={e => setTeacher(e.target.value)} maxLength={80} required /></label>
        <label htmlFor="tt-room" className="block space-y-1 text-sm font-medium"><span>Room (optional)</span><Input id="tt-room" value={room} onChange={e => setRoom(e.target.value)} maxLength={80} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? 'Saving…' : 'Save lesson'}</Button>{editing?.expected && <Button type="button" variant="outline" disabled={busy} onClick={() => { if (window.confirm('Clear this lesson?')) void save(null) }}>Clear lesson</Button>}<Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div>
      </form>
    </DialogContent></Dialog>
  </div>
}
