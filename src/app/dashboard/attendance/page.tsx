
"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import {
  Search,
  CheckCircle2,
  Clock,
  CalendarDays,
  UserCheck,
  Filter,
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
import { Progress } from "@/components/ui/progress"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { recordAudit } from "@/lib/audit/record"
import { AttendanceByClass, RegisterSplit, ChartPanel } from "@/components/admin/module-charts"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc } from "firebase/firestore"
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { triggerN8nWebhook } from "@/lib/n8n"

export default function AttendancePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
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

  const filteredStudents = useMemo(() => {
    if (!students) return []
    return students.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, students])

  const presenceRate = students && students.length > 0
    ? (students.filter((student) => student.attendanceStatus !== "Absent").length / students.length) * 100
    : 0

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    updateDocumentNonBlocking(doc(db, "schools", "school-001", "students", studentId), {
      attendanceStatus: newStatus,
      lastAttendanceUpdate: time
    })

    if (newStatus === "Absent") {
      // The webhook returns false when automation is disabled or unconfigured —
      // do not claim an alert went out when nothing was sent.
      const forwarded = await triggerN8nWebhook("attendance-update", {
        studentId,
        status: "Absent",
        parentContact: students?.find(s => s.id === studentId)?.contact
      })
      toast({
        title: "Absence logged",
        description: forwarded
          ? "Forwarded to the automation webhook for guardian follow-up."
          : "Saved to the register. Automation is off, so no alert was sent.",
      })
    }
  }

  const handleMarkAllPresent = () => {
    if (!students) return
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    // One register-wide entry, not 150 near-identical ones: the decision a
    // person made was "mark everyone present:", and that is what the log shows.
    students.forEach(s => {
      updateDocumentNonBlocking(doc(db, "schools", "school-001", "students", s.id), {
        attendanceStatus: "Present",
        lastAttendanceUpdate: time
      }, { audit: false })
    })
    void recordAudit({
      action: 'update',
      path: 'schools/school-001/students',
      summary: `Marked the whole register present (${students.length} learners) at ${time}.`,
      label: `${students.length} learners`,
    })
    toast({
      title: "Batch Completion",
      description: "Institutional register updated successfully.",
    })
  }

  return (
    <div className="space-y-8 max-w-full mx-auto pb-24 overflow-x-hidden relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-2">
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-600 px-4 py-1 h-6 text-[12px] sm:text-[13px] font-semibold rounded-full shadow-sm">
            <Database className="h-3.5 w-3.5 mr-2" /> Daily register · 2026
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-headline font-semibold text-primary tracking-tight">Daily Register</h1>
          <p className="text-muted-foreground font-medium text-sm">Daily register · {identity?.name || "School"}</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          <Button variant="outline" className="flex-1 sm:flex-none rounded-full h-12 px-6 border-primary/20 text-primary bg-white shadow-md font-semibold text-[13px] group">
            <MessageCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Notify All
          </Button>
          <Button onClick={handleMarkAllPresent} className="flex-1 sm:flex-none rounded-full h-12 px-6 colorful-gradient shadow-lg font-semibold text-[13px] group">
            <UserCheck className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Mark All Present
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Presence", value: presenceRate, format: (n: number) => n.toFixed(1), suffix: "%", sub: "Not marked absent", tone: "emerald" as const, icon: Zap, progress: presenceRate },
          { label: "Absent", value: students?.filter(s => s.attendanceStatus === "Absent").length || 0, sub: "Follow up", tone: "rose" as const, icon: AlertCircle },
          { label: "Guardian contacts", value: students?.filter(s => s.contact)?.length || 0, sub: "On file", tone: "primary" as const, icon: MessageCircle },
          { label: "On the register", value: students?.length || 0, sub: "Form 1–4", tone: "accent" as const, icon: Database },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-reveal>
        <ChartPanel title="Presence by class" hint="Share not marked absent, from today's register">
          <AttendanceByClass students={students ?? []} />
        </ChartPanel>
        <ChartPanel title="Register composition" hint="Boarding and day scholars on file">
          <RegisterSplit students={students ?? []} />
        </ChartPanel>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/60 backdrop-blur-md rounded-[2.5rem]">
        <CardHeader className="bg-muted/30 pb-6 pt-8 px-4 sm:px-8 border-b overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 sm:p-4 rounded-3xl bg-primary text-white shadow-xl animate-float shrink-0">
                <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="overflow-hidden">
                <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">{activeDate}</CardTitle>
                <CardDescription className="text-[12px] sm:text-[13px] font-semibold text-primary/60 truncate">Form 1–4 · day and boarding</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1 sm:min-w-[250px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input
                  placeholder="Find student..."
                  className="pl-12 h-12 rounded-full border-none bg-white shadow-inner font-bold text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white border-none shadow-sm shrink-0">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
              <p className="text-[13px] font-semibold">Loading the register…</p>
            </div>
          ) : (
            <div className="divide-y divide-muted/50 min-w-[600px]">
              {filteredStudents.map((student) => (
                <div key={student.id} className="p-4 sm:p-6 lg:px-10 flex items-center justify-between gap-4 sm:gap-6 hover:bg-primary/[0.02] transition-all group">
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <div className={cn(
                      "h-12 w-12 sm:h-16 sm:w-16 rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center font-black text-white shadow-xl transition-all group-hover:rotate-6 shrink-0",
                      student.attendanceStatus === "Present" ? "bg-green-500 shadow-green-100" :
                      student.attendanceStatus === "Absent" ? "bg-destructive shadow-destructive/10" : "bg-orange-500 shadow-orange-100"
                    )}>
                      <span className="text-xl sm:text-2xl">{student.name.charAt(0)}</span>
                    </div>
                    <div className="space-y-1 min-w-0 overflow-hidden">
                      <h3 className="font-semibold text-base sm:text-lg text-foreground/80 tracking-tight group-hover:text-primary transition-colors truncate">{student.name}</h3>
                      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                        <span className="text-[11px] sm:text-[13px] text-muted-foreground font-mono font-semibold bg-muted/40 px-2 py-0.5 rounded-lg shadow-inner shrink-0 truncate">{student.id}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/30 shrink-0" />
                        <div className="flex items-center gap-1.5 text-[11px] sm:text-[13px] text-muted-foreground font-semibold truncate">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          {student.lastAttendanceUpdate || "NO LOG"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <Button
                      variant={student.attendanceStatus === "Present" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-all whitespace-nowrap",
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
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-all whitespace-nowrap",
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
                        "rounded-full h-9 sm:h-11 text-[11px] sm:text-[12px] font-black uppercase tracking-widest px-4 sm:px-6 shadow-sm transition-all whitespace-nowrap",
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
