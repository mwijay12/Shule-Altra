
"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Clock,
  CalendarDays,
  UserCheck,
  Database,
  CloudOff,
  MessageCircle,
  Zap,
  AlertCircle,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { StatCard } from "@/components/admin/stat-card"
import { recordAudit } from "@/lib/audit/record"
import { AttendanceByClass, RegisterSplit, ChartPanel } from "@/components/admin/module-charts"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc, writeBatch } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { triggerN8nWebhook } from "@/lib/n8n"
import { WaveSection } from '@/components/motion/wave-section';

export default function AttendancePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [classFilter, setClassFilter] = useState("all")
  const [streamFilter, setStreamFilter] = useState("all")
  const [markingAll, setMarkingAll] = useState(false)
  const [activeDate, setActiveDate] = useState('')
  useEffect(() => {
    // Computed on the client to avoid a hydration mismatch between server locale and browser locale
    setActiveDate(new Date().toLocaleDateString('en-GB'))
  }, [])

  // Pull real students from Firestore
  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")), [db])
  const { data: students, isLoading } = useCollection(studentsQuery)

  // Pull identity for Tier Config
  const identityRef = useMemoFirebase(() => doc(db, "schools", "school-001", "config", "identity"), [db])
  const { data: identity } = useDoc(identityRef)

  // Only offer classes and streams actually present in the student records.
  // The existing demo has no stream field, so never invent stream assignments.
  const classOptions = useMemo(() => Array.from(new Set((students ?? []).map(s => String(s.class ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students])
  const classStudents = useMemo(() => (students ?? []).filter(s => classFilter === "all" || String(s.class ?? "").trim() === classFilter), [students, classFilter])
  const streamOptions = useMemo(() => Array.from(new Set(classStudents.map(s => typeof s.stream === "string" ? s.stream.trim() : "").filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [classStudents])
  const filteredStudents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return classStudents.filter(s => {
      const stream = typeof s.stream === "string" ? s.stream.trim() : ""
      const matchesStream = streamFilter === "all" || (streamFilter === "__unassigned__" ? !stream : stream === streamFilter)
      return matchesStream && (!search || String(s.name ?? "").toLowerCase().includes(search) || String(s.id ?? "").toLowerCase().includes(search))
    })
  }, [classStudents, searchTerm, streamFilter])

  const markedStudents = (students ?? []).filter(s => ["Present", "Late", "Absent"].includes(s.attendanceStatus))
  const presenceRate = markedStudents.length > 0
    ? markedStudents.filter(s => s.attendanceStatus === "Present" || s.attendanceStatus === "Late").length / markedStudents.length * 100
    : 0

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    updateDocumentNonBlocking(doc(db, "schools", "school-001", "students", studentId), {
      attendanceStatus: newStatus,
      lastAttendanceUpdate: time
    })

    if (newStatus === "Absent") {
      // The webhook returns false when automation is disabled or unconfigured , 
      // do not claim an alert went out when nothing was sent.
      const forwarded = await triggerN8nWebhook("attendance-update", {
        studentId,
        status: "Absent",
        parentContact: students?.find(s => s.id === studentId)?.guardianPhone || students?.find(s => s.id === studentId)?.contact
      })
      toast({
        title: "Absence logged",
        description: forwarded
          ? "Forwarded to the automation webhook for guardian follow-up."
          : "Saved to the register. Automation is off, so no alert was sent.",
      })
    }
  }

  const handleMarkAllPresent = async () => {
    const targets = filteredStudents.filter(s => s.attendanceStatus !== "Present")
    if (!targets.length || markingAll) return
    if (!window.confirm(`Mark ${targets.length} of the ${filteredStudents.length} matching students present? This will replace their current attendance status.`)) return
    setMarkingAll(true)
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    let saved = 0
    try {
      // Firestore limits a batch to 500 writes. Commit in smaller chunks and
      // report partial success honestly if a later batch fails.
      for (let offset = 0; offset < targets.length; offset += 400) {
        const chunk = targets.slice(offset, offset + 400)
        const batch = writeBatch(db)
        chunk.forEach(s => batch.update(doc(db, "schools", "school-001", "students", s.id), { attendanceStatus: "Present", lastAttendanceUpdate: time }))
        await batch.commit()
        saved += chunk.length
      }
      toast({ title: "Attendance updated", description: `${saved} matching students marked present.` })
    } catch {
      toast({ variant: "destructive", title: "Could not update every student", description: `${saved} of ${targets.length} updates succeeded. Check the register and try again.` })
    } finally {
      if (saved) void recordAudit({ action: 'update', path: 'schools/school-001/students', summary: `Marked ${saved} filtered learners present at ${time}.`, label: `${saved} learners` })
      setMarkingAll(false)
    }
  }

  return (
    <div className="space-y-8 max-w-full mx-auto pb-24 overflow-x-hidden relative">
      <WaveSection as="div" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-2">
          <Badge data-wave="badge" variant="outline" className="border-blue-200 bg-blue-50 text-blue-600 px-4 py-1 h-6 text-[12px] sm:text-[13px] font-semibold rounded-full shadow-sm">
            <Database className="h-3.5 w-3.5 mr-2" /> Daily register · 2026
          </Badge>
          <h1 data-wave="heading" className="text-3xl sm:text-4xl font-headline font-semibold text-primary tracking-tight">Daily Register</h1>
          <p data-wave="subcopy" className="text-muted-foreground font-medium text-sm">Daily register · {identity?.name || "School"}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          <Button onClick={handleMarkAllPresent} disabled={markingAll || isLoading || !filteredStudents.some(s => s.attendanceStatus !== "Present")} className="flex-1 sm:flex-none rounded-full h-12 px-6 colorful-gradient shadow-lg font-semibold text-[13px] group">
            {markingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />} Mark matching present
          </Button>
        </div>
      </WaveSection>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Presence", value: presenceRate, format: (n: number) => n.toFixed(1), suffix: "%", sub: markedStudents.length ? `Among ${markedStudents.length} marked · whole school` : "No marked records", tone: "emerald" as const, icon: Zap, progress: presenceRate },
          { label: "Absent", value: students?.filter(s => s.attendanceStatus === "Absent").length || 0, sub: "Follow up", tone: "rose" as const, icon: AlertCircle },
          { label: "Guardian contacts", value: students?.filter(s => s.guardianPhone || s.contact)?.length || 0, sub: "On file", tone: "primary" as const, icon: MessageCircle },
          { label: "On the register", value: students?.length || 0, sub: "Whole school", tone: "accent" as const, icon: Database },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
      </div>


      <Card className="border-none shadow-2xl bg-card rounded-[2.5rem]">
        <CardHeader className="bg-muted/30 rounded-t-[2.5rem] pb-6 pt-8 px-4 sm:px-8 border-b">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg"><CalendarDays className="h-5 w-5" /></div>
              <div>
                <CardTitle className="text-lg font-semibold">Student register · {activeDate}</CardTitle>
                <CardDescription className="text-[13px]">Latest recorded status, not a dated attendance history.</CardDescription>
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground" aria-live="polite">{isLoading ? "Loading students…" : `${filteredStudents.length} of ${students?.length ?? 0} students shown`}</p>
          </div>
          <div className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(150px,0.6fr)_minmax(150px,0.6fr)]">
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              <span>Search by name or ID</span>
              <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" /><Input placeholder="Find student..." className="h-11 rounded-xl bg-background pl-11" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              <span>Class</span>
              <select aria-label="Class" value={classFilter} onChange={e => { setClassFilter(e.target.value); setStreamFilter("all") }} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <option value="all">All classes</option>
                {classOptions.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-muted-foreground">
              <span>Stream</span>
              <select aria-label="Stream" value={streamFilter} onChange={e => setStreamFilter(e.target.value)} disabled={!streamOptions.length} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <option value="all">{streamOptions.length ? "All streams" : "No streams recorded"}</option>
                {streamOptions.map(name => <option key={name} value={name}>{name}</option>)}
                {streamOptions.length > 0 && classStudents.some(s => !String(s.stream ?? "").trim()) && <option value="__unassigned__">Not recorded</option>}
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Filters apply to the register and “Mark matching present”. Summary cards and charts cover the whole school.</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
              <p className="text-[13px] font-semibold">Loading the register…</p>
            </div>
          ) : (
            <div className="divide-y divide-muted/50">
              {filteredStudents.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No students match these filters.</p>}
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 sm:p-6 lg:px-10 flex flex-wrap items-center justify-between gap-4 sm:gap-6 hover:bg-primary/[0.02] transition-colors group">
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div className={cn(
                      "h-12 w-12 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center font-black text-white shadow-xl transition-transform group-hover:rotate-6 shrink-0",
                      student.attendanceStatus === "Present" ? "bg-green-500 shadow-green-100" :
                      student.attendanceStatus === "Absent" ? "bg-destructive shadow-destructive/10" : "bg-orange-500 shadow-orange-100"
                    )}>
                      <span className="text-xl sm:text-2xl">{student.name.charAt(0)}</span>
                    </div>
                    <div className="space-y-1 min-w-0 overflow-hidden">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground/80 tracking-tight group-hover:text-primary transition-colors truncate">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="text-[11px] sm:text-[13px] text-muted-foreground font-mono font-semibold bg-muted/40 px-2 py-0.5 rounded-lg shadow-inner shrink-0 truncate">{student.id}</span>
                        <span className="text-[11px] sm:text-[13px] text-muted-foreground font-semibold">{student.class || "Class not recorded"}{student.stream ? ` · ${student.stream}` : ""}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30 shrink-0" />
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[13px] text-muted-foreground font-semibold truncate">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          {student.lastAttendanceUpdate || "NO LOG"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Button
                      variant={student.attendanceStatus === "Present" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-colors whitespace-nowrap",
                        student.attendanceStatus === "Present" ? "bg-green-600 hover:bg-green-700 shadow-green-100" : "hover:bg-green-50 text-green-600 border-green-200"
                      )}
                      onClick={() => handleStatusChange(student.id, "Present")}
                    >
                      Present
                    </Button>
                    <Button
                      variant={student.attendanceStatus === "Late" ? "secondary" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-colors whitespace-nowrap",
                        student.attendanceStatus === "Late" ? "bg-orange-100 text-orange-700 hover:bg-orange-200 shadow-orange-50" : "hover:bg-orange-50 text-orange-600 border-orange-100"
                      )}
                      onClick={() => handleStatusChange(student.id, "Late")}
                    >
                      Late
                    </Button>
                    <Button
                      variant={student.attendanceStatus === "Absent" ? "destructive" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-colors whitespace-nowrap",
                        student.attendanceStatus === "Absent" ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20" : "hover:bg-destructive/5 text-destructive border-destructive/20"
                      )}
                      onClick={() => handleStatusChange(student.id, "Absent")}
                    >
                      {student.attendanceStatus === "Absent" ? "ABSENT" : "Absent"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2" data-reveal>
        <ChartPanel title="Presence by class" hint="Present or late among students with a recorded status">
          <AttendanceByClass students={students ?? []} />
        </ChartPanel>
        <ChartPanel title="Register composition" hint="Boarding and day scholars on file">
          <RegisterSplit students={students ?? []} />
        </ChartPanel>
      </div>


      <div className="p-6 sm:p-8 rounded-[2.5rem] bg-primary/5 border-2 border-dashed border-primary/20 flex flex-col items-center text-center space-y-4 animate-pulse-soft overflow-hidden mx-1">
         <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white flex items-center justify-center shadow-xl text-primary border border-primary/10 shrink-0">
           <CloudOff className="h-6 w-6 sm:h-7 sm:w-7" />
         </div>
         <div className="space-y-1 overflow-hidden">
           <p className="text-xs sm:text-sm font-semibold text-primary">How absence alerts work</p>
           <p className="text-[13px] sm:text-xs text-muted-foreground leading-relaxed max-w-sm font-medium mx-auto px-4">
             Marking a learner absent saves it to the register immediately. If the automation webhook is enabled in Settings, the event is forwarded there; when it is off, no message is sent. Guardian emails are sent from Communications.
           </p>
         </div>
      </div>
    </div>
  )
}
