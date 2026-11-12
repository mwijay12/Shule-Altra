"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Search,
  Loader2,
  Database,
  ChevronRight,
  GraduationCap,
  Trophy,
  FileText,
  TrendingUp,
  Filter,
  Download,
  Upload,
  Users,
  Target,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, orderBy, doc, where, addDoc, serverTimestamp, getDocs } from "firebase/firestore"
import { getCSEEGrade, calculateCSEEDivision, calculateClassRankings, analyzeSubjectPerformance, type SubjectGrade } from "@/lib/necta-logic"
import { cn } from "@/lib/utils"
import type { Student } from "@/types/student"
import type { GradeRecord } from "@/types/grade"
import { SUBJECTS_SECONDARY } from "@/data/fixtures/tanzanian-names"
import { O_LEVEL_CLASSES } from "@/lib/academics/config"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { ChartPanel, SubjectAverages, DivisionSpread } from "@/components/admin/module-charts"
import { SegmentedProgress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import { canTeach, saveAssessment, type TeachingAssignment } from "@/lib/academics/assignments"
import { reviewGradeRecords } from "@/lib/academics/grade-review"
import { marksTemplateRows, parseMarks, type MarkParseResult } from "@/lib/academics/marks-import"
import { WaveSection } from '@/components/motion/wave-section';

export default function AcademicsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user, role } = useAuth()
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isTeacher = role === 'TEACHER'
  const assignmentsQuery = useMemoFirebase(() => isTeacher && user ? query(collection(db, 'schools', 'school-001', 'staff', user.uid, 'teachingAssignments')) : null, [db, isTeacher, user])
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError } = useCollection<TeachingAssignment>(assignmentsQuery)

  // UI State
  const [searchTerm, setSearchTerm] = useState("")
  const [activeClass, setActiveClass] = useState("Form 4")
  const [activeTerm, setActiveTerm] = useState("Term 2")
  const [activeExam, setActiveExam] = useState("Annual")
  const [gradingStudent, setGradingStudent] = useState<Student | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<MarkParseResult | null>(null)

  // Data Fetching
  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")), [db])
  const { data: students, isLoading: studentsLoading } = useCollection<Student>(studentsQuery)

  const gradesQuery = useMemoFirebase(() =>
    query(
      collection(db, "schools", "school-001", "grades"),
      where("term", "==", activeTerm),
      where("examType", "==", activeExam)
    ), [db, activeTerm, activeExam])
  const { data: grades, isLoading: gradesLoading, error: gradesError } = useCollection<GradeRecord>(gradesQuery)

  const scopedGrades = useMemo(() => (grades ?? []).filter(g => g.academicYear === '2026'), [grades])
  const gradeReview = useMemo(() => reviewGradeRecords(grades ?? [], new Set((students ?? []).filter(s => s.class === activeClass).map(s => s.id)), '2026'), [grades, students, activeClass])
  const hasDuplicateMarks = gradeReview.duplicates.length > 0 || gradeReview.missingYear.length > 0


  // Filtered Students for the Ledger
  const filteredStudents = useMemo(() => {
    if (!students) return []
    return students.filter(s =>
      s.class === activeClass && (
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [searchTerm, students, activeClass])

  // Process Rankings
  const rankings = useMemo(() => {
    if (!students || !grades || hasDuplicateMarks) return []

    const studentsInClass = students.filter(s => s.class === activeClass)
    const rankingInput = studentsInClass.map(s => {
      const studentGrades = scopedGrades.filter(g => g.studentId === s.id)
      const subjects: SubjectGrade[] = studentGrades.map(g => {
        const necta = getCSEEGrade(g.score)
        return { subject: g.subject, score: g.score, grade: necta.grade, points: necta.points }
      })
      return { id: s.id, name: s.name, subjects }
    }).filter(r => r.subjects.length > 0)

    return calculateClassRankings(rankingInput)
  }, [students, grades, scopedGrades, activeClass, hasDuplicateMarks])

  // Process Subject Performance
  const subjectPerformance = useMemo(() => {
    if (!grades || !students || hasDuplicateMarks) return []

    const studentsInClassIds = students.filter(s => s.class === activeClass).map(s => s.id)
    const classGrades = scopedGrades.filter(g => studentsInClassIds.includes(g.studentId))

    return SUBJECTS_SECONDARY.map(subject => {
      const subGrades = classGrades.filter(g => g.subject === subject).map(g => {
        const necta = getCSEEGrade(g.score)
        return { subject: g.subject, score: g.score, grade: necta.grade, points: necta.points }
      })

      if (subGrades.length === 0) return null
      const stats = analyzeSubjectPerformance(subGrades)
      return { subject, ...stats }
    }).filter(Boolean)
  }, [grades, scopedGrades, students, activeClass, hasDuplicateMarks])

  const classPerformance = (subjectPerformance ?? []) as Array<{
    subject: string; averageScore: number; passRate: number; totalStudents: number;
  }>;
  const markedCandidates = rankings.length;
  const classAverage = classPerformance.length > 0
    ? classPerformance.reduce((sum, p) => sum + p.averageScore, 0) / classPerformance.length
    : 0;
  const classPassRate = classPerformance.length > 0
    ? classPerformance.reduce((sum, p) => sum + p.passRate, 0) / classPerformance.length
    : 0;
  const divisionOne = rankings.filter((r: any) => String(r.division) === 'I').length;

  const handleSaveGrade = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!gradingStudent) return

    setIsSaving(true)
    const formData = new FormData(e.currentTarget)
    const score = parseFloat(formData.get("score") as string)
    const subject = formData.get("subject") as string

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      toast({ variant: "destructive", title: "Invalid Score", description: "Score must be between 0 and 100." })
      setIsSaving(false)
      return
    }

    try {
      if (!user || (!isAdmin && (!isTeacher || assignmentsLoading || assignmentsError || !canTeach(assignments ?? [], gradingStudent.class, subject)))) throw new Error('You are not assigned to this class and subject.')
      if (gradesLoading || gradesError || !grades) throw new Error('The current marks could not be loaded. Try again before recording a mark.')
      if (grades.some(g => g.studentId === gradingStudent.id && g.subject === subject && (!g.academicYear || g.academicYear === '2026'))) throw new Error('A mark for this subject and exam already exists. Ask an administrator to review it.')
      await saveAssessment(db, { studentId: gradingStudent.id, className: gradingStudent.class, subject, score, term: activeTerm, examType: activeExam, year: '2026', actorUid: user.uid })
      toast({ title: "Assessment recorded", description: `Mark added for ${gradingStudent.name}.` })
      setGradingStudent(null)
    } catch (err) {
      toast({ variant: "destructive", title: "Could not save mark", description: err instanceof Error ? err.message : 'Check your connection and permissions.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportReport = async (student: Student) => {
    setIsExporting(student.id)
    try {
      if (gradesLoading || gradesError || !grades) throw new Error('Marks are not available. Try again.')
      if (grades.some(g => g.studentId === student.id && !g.academicYear)) throw new Error('Some marks have no academic year. Ask an administrator to review them before exporting.')
      const rows = grades.filter(g => g.studentId === student.id && g.academicYear === '2026')
      const bySubject = new Map<string, number>()
      for (const row of rows) {
        if (bySubject.has(row.subject)) throw new Error('Duplicate marks found for this exam. Resolve them before exporting a report.')
        bySubject.set(row.subject, row.score)
      }

      if (bySubject.size === 0) {
        toast({
          variant: "destructive",
          title: "No assessments yet",
          description: `Record subject scores for ${student.name} before issuing a report card.`,
        })
        return
      }

      const { downloadReportCard } = await import("@/lib/pdf/report-card")
      await downloadReportCard({
        student: {
          id: student.id,
          name: student.name,
          className: student.class,
          admissionNumber: (student as any).admissionNumber ?? student.id,
          gender: student.gender,
        },
        grades: Array.from(bySubject.entries()).map(([subject, score]) => ({ subject, score })),
        term: `${activeTerm} · ${activeExam}`,
        academicYear: "2026",

      })
      toast({
        title: "Report card PDF ready",
        description: `${student.name} · selected exam only. Division is not calculated.`,
      })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Failed", description: err.message || "No assessment data found." })
    } finally {
      setIsExporting(null)
    }
  }

  const handleExportWord = async (student: Student) => {
    setIsExporting(student.id)
    try {
      const [{ buildReportCardData }, { exportReportCardToWord }] = await Promise.all([
        import("@/lib/report-card-builder"),
        import("@/lib/export-utils"),
      ])
      const data = await buildReportCardData(db, "school-001", student.id, activeTerm, activeExam)
      await exportReportCardToWord(data)
      toast({ title: "Word transcript ready", description: `Editable copy exported for ${student.name}.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Failed", description: err.message || "No assessment data found." })
    } finally {
      setIsExporting(null)
    }
  }

  /**
   * The sheet a teacher fills in: their class, their subjects, one row each.
   * Downloading a template beats explaining a template.
   */
  const handleDownloadMarksTemplate = async () => {
    const XLSX = await import("xlsx")
    const classStudents = (students ?? [])
      .filter((student) => student.class === activeClass)
      .map((student) => ({ id: student.id, name: student.name, class: student.class }))
    const rows = marksTemplateRows(classStudents, SUBJECTS_SECONDARY, {
      term: activeTerm,
      examType: activeExam,
    })
    const sheet = XLSX.utils.json_to_sheet(rows)
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Marks")
    XLSX.writeFile(book, `marks-${activeClass.replace(/\s+/g, "-").toLowerCase()}-${activeTerm.replace(/\s+/g, "-").toLowerCase()}.xlsx`)
    toast({
      title: "Template ready",
      description: `${classStudents.length} learners × ${SUBJECTS_SECONDARY.length} subjects · fill the Score column and upload it back.`,
    })
  }

  const handleMarksFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setImportFileName(file.name)
    try {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" })
      const result = parseMarks(
        raw,
        (students ?? []).map((student) => ({ id: student.id, name: student.name, class: student.class })),
        { term: activeTerm, examType: activeExam, subjects: SUBJECTS_SECONDARY }
      )
      setImportResult(result)
      toast({
        title: result.stats.errors > 0 ? "Sheet read with problems" : "Sheet ready",
        description: `${result.stats.valid} marks for ${result.stats.learners} learners · ${result.stats.errors} error(s), ${result.stats.warnings} warning(s).`,
        variant: result.stats.errors > 0 ? "destructive" : "default",
      })
    } catch (error: any) {
      setImportResult(null)
      toast({
        variant: "destructive",
        title: "Could not read that file",
        description: error?.message ?? "Use the downloaded .xlsx template.",
      })
    }
  }

  const handleCommitMarks = async () => {
    if (!isAdmin || !importResult || importResult.rows.length === 0 || !db) return
    setImporting(true)
    try {
      // Chunks of 100 so a 1,500-row sheet does not open 1,500 writes at once.
      const rows = importResult.rows
      for (let start = 0; start < rows.length; start += 100) {
        const chunk = rows.slice(start, start + 100)
        await Promise.all(
          chunk.map((row) =>
            addDoc(collection(db, "schools", "school-001", "grades"), {
              studentId: row.studentId,
              studentName: row.studentName,
              class: row.className,
              subject: row.subject,
              score: row.score,
              term: row.term,
              examType: row.examType,
              academicYear: "2026",
              recordedBy: "Marks import",
              createdAt: serverTimestamp(),
            })
          )
        )
      }
      toast({
        title: "Marks imported",
        description: `${rows.length} assessments across ${importResult.stats.learners} learners · report cards are ready to issue.`,
      })
      setImportOpen(false)
      setImportResult(null)
      setImportFileName(null)
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import stopped",
        description: error?.message ?? "Some rows could not be written.",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-20 px-1 font-body">
      {isTeacher && <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">You can add marks only for subjects assigned to your class. Ask an administrator to assign your account. Bulk import is temporarily unavailable.</p>}
      {hasDuplicateMarks && <section role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive space-y-3"><p>Duplicate marks or marks without an academic year need review for {activeClass}, {activeTerm}, {activeExam}. Class rankings and summaries are suppressed. Other reports may still need review.</p>
        {isAdmin && <details><summary className="cursor-pointer font-semibold">View records to review ({gradeReview.duplicates.length} duplicate groups, {gradeReview.missingYear.length} missing year)</summary><p className="mt-2">Compare these records with the original marks before correcting them. This list is read-only; it does not select or delete a mark.</p><ul className="mt-2 space-y-2 max-h-64 overflow-y-auto">{[...gradeReview.duplicates.flat(), ...gradeReview.missingYear].map(g => <li key={g.id} className="break-all rounded border border-destructive/20 p-2">{students?.find(s => s.id === g.studentId)?.name ?? g.studentId} · {g.subject} · {g.score} · year: {g.academicYear || 'missing'} · record: {g.id}</li>)}</ul></details>}</section>}
      {isAdmin && <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">Marks import and Word reports are temporarily unavailable while duplicate handling is reviewed. PDF assessment reports do not calculate division.</p>}
      {/* HEADER Node */}
      <WaveSection as="div" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Badge data-wave="badge" variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            <Database className="h-2.5 w-2.5 mr-1.5" /> NECTA assessment · 2026
          </Badge>
          <h1 data-wave="heading" className="text-xl sm:text-2xl font-semibold text-primary tracking-tight">Academics</h1>
          <p data-wave="subcopy" className="text-muted-foreground text-[13px] font-bold leading-none">
            {activeClass} · <AnimatedNumber value={filteredStudents.length} /> Candidates • Term: {activeTerm} • Exam: {activeExam}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1">
          <Select value={activeClass} onValueChange={setActiveClass}>
            <SelectTrigger aria-label="Academic class" className="h-10 shrink-0 rounded-full bg-white shadow-sm font-bold text-[13px] border-primary/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {O_LEVEL_CLASSES.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && <Button
            variant="outline"
            disabled
            title="Unavailable while duplicate handling is reviewed"
            className="h-10 shrink-0 rounded-full bg-white shadow-sm font-semibold text-[13px] border-primary/20 text-primary"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Import marks
          </Button>}
          <Select value={activeTerm} onValueChange={setActiveTerm}>
            <SelectTrigger className="h-10 rounded-full bg-white shadow-sm font-bold text-[13px] border-primary/10">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Term 1">Term 1</SelectItem>
              <SelectItem value="Term 2">Term 2</SelectItem>
              <SelectItem value="Term 3">Term 3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activeExam} onValueChange={setActiveExam}>
            <SelectTrigger className="h-10 rounded-full bg-white shadow-sm font-bold text-[13px] border-primary/10">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mid-Term">Mid-Term</SelectItem>
              <SelectItem value="Annual">Annual</SelectItem>
              <SelectItem value="Mock">Mock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </WaveSection>

      {!hasDuplicateMarks && <><div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Candidates" value={filteredStudents.length} icon={Users} tone="primary" sub={`${activeClass} · ${activeTerm}`} />
        <StatCard index={1} label="Class mean" value={classAverage} format={(n) => (classPerformance.length ? n.toFixed(1) : '—')} suffix={classPerformance.length ? '%' : ''} icon={Target} tone="accent" progress={classAverage} sub={`${classPerformance.length} subjects marked`} />
        <StatCard index={2} label="Pass rate" value={classPassRate} format={(n) => (classPerformance.length ? n.toFixed(1) : '—')} suffix={classPerformance.length ? '%' : ''} icon={ClipboardCheck} tone="emerald" progress={classPassRate} sub="Grade D or better, per subject" />
        <StatCard index={3} label="Division I" value={divisionOne} icon={Trophy} tone="amber" progress={markedCandidates ? (divisionOne / markedCandidates) * 100 : 0} sub={`${markedCandidates} candidates ranked`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Mean score by subject" hint={`${activeClass} · ${activeExam}. Amber sits below the 45% pass mark.`} className="lg:col-span-2" data-reveal>
          <SubjectAverages performance={classPerformance} />
        </ChartPanel>
        <ChartPanel title="Divisions awarded" hint="Best seven subjects, CSEE rules." data-reveal>
          <DivisionSpread rankings={rankings} />
        </ChartPanel>
      </div>

      </>}
      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList className="bg-muted/40 p-1 rounded-2xl h-12 w-full sm:w-fit flex shadow-inner border border-muted/50 px-1 overflow-x-auto">
          <TabsTrigger value="ledger" className="rounded-xl font-semibold px-6 text-[12px]">Grading Ledger</TabsTrigger>
          <TabsTrigger value="rankings" className="rounded-xl font-semibold px-6 text-[12px]">Class Rankings</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl font-semibold px-6 text-[12px]">Subject Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-6">
          <Card className="border-none shadow-xl overflow-hidden bg-card/60 rounded-[2.5rem]">
            <CardHeader className="bg-muted/20 border-b p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-lg font-semibold tracking-tight">Institutional Ledger</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find candidate..."
                  className="pl-10 h-10 rounded-full border-none bg-white shadow-inner font-bold text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {studentsLoading ? (
                <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 text-primary inline" /></div>
              ) : (
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-muted/10">
                    <TableRow className="border-none h-14">
                      <TableHead className="pl-8 text-[12px] font-semibold">Candidate Payload</TableHead>
                      <TableHead className="text-[12px] font-semibold">Status</TableHead>
                      <TableHead className="text-[12px] font-semibold text-center">Grades Recorded</TableHead>
                      <TableHead className="text-right pr-8 text-[12px] font-semibold">Control</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const studentGradesCount = scopedGrades.filter(g => g.studentId === student.id).length;
                      return (
                        <TableRow key={student.id} className="group hover:bg-primary/[0.02] border-b last:border-none">
                          <TableCell className="pl-8 py-5">
                            <p className="font-semibold text-sm text-foreground/80">{student.name}</p>
                            <p className="text-[12px] font-mono font-semibold text-muted-foreground">{student.id} • {student.class}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[11px] font-semibold rounded-full px-3">{student.status || 'Active'}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-semibold text-xs text-primary">{studentGradesCount}</TableCell>
                          <TableCell className="text-right pr-8">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" disabled={!isAdmin && (!isTeacher || assignmentsLoading || !!assignmentsError || !(assignments ?? []).some(a => a.className === student.class))} className="font-semibold text-primary text-[13px] rounded-full" onClick={() => setGradingStudent(student)}>
                                Add Assessment <ChevronRight className="ml-1 h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                className="font-semibold text-[13px] rounded-full h-8 px-4 colorful-gradient text-white shadow-md shadow-primary/20"
                                onClick={() => handleExportReport(student)}
                                disabled={isExporting === student.id || gradesLoading || !!gradesError}
                                title="Selected exam and year; division not calculated"
                              >
                                {isExporting === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                                Report Card PDF
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-semibold text-[12px] rounded-full h-8 px-3 text-muted-foreground"
                                disabled
                                title="Unavailable while report calculations are reviewed"
                              >
                                DOCX
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rankings" className="space-y-6">
          <Card className="border-none shadow-xl bg-card/60 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="bg-muted/20 border-b p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-3xl bg-primary text-white shadow-xl"><Trophy className="h-6 w-6" /></div>
                <div>
                  <CardTitle className="text-xl font-semibold">Class performance</CardTitle>
                  <CardDescription className="text-[13px] font-bold text-primary/60">NECTA merit ranking</CardDescription>
                </div>
              </div>
              <Select value={activeClass} onValueChange={setActiveClass}>
                <SelectTrigger className="w-48 h-12 rounded-full border-none bg-white shadow-inner font-semibold text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {O_LEVEL_CLASSES.map((className) => <SelectItem key={className} value={className}>{className}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {rankings.length === 0 ? (
                <div className="p-20 text-center opacity-30 flex flex-col items-center gap-4">
                  <FileText className="h-12 w-12" />
                  <p className="text-[13px] font-semibold">{hasDuplicateMarks ? 'Rankings unavailable until records are reviewed.' : 'No assessment data detected.'}</p>
                </div>
              ) : (
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-muted/10">
                    <TableRow className="h-14">
                      <TableHead className="pl-10 text-[12px] font-semibold">Rank</TableHead>
                      <TableHead className="text-[12px] font-semibold">Candidate</TableHead>
                      <TableHead className="text-[12px] font-semibold text-center">Division</TableHead>
                      <TableHead className="text-[12px] font-semibold text-center">Points</TableHead>
                      <TableHead className="text-[12px] font-semibold text-right pr-10">Average Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rankings.map((r, i) => (
                      <TableRow key={r.studentId} className="group border-b last:border-none hover:bg-primary/[0.02]">
                        <TableCell className="pl-10">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center font-black text-xs",
                            i === 0 ? "bg-yellow-100 text-yellow-700 shadow-sm" :
                            i === 1 ? "bg-slate-100 text-slate-700" :
                            i === 2 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                          )}>
                            {r.rank}
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <p className="font-semibold text-sm text-foreground/80">{r.studentName}</p>
                          <p className="text-[12px] font-mono font-bold text-muted-foreground">{r.studentId}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn(
                            "px-4 py-1 rounded-full text-[13px] font-black border-none shadow-sm",
                            r.division === 'I' ? "bg-green-100 text-green-700" :
                            r.division === '0' ? "bg-destructive/10 text-destructive" : "bg-blue-50 text-blue-600"
                          )}>DIV {r.division}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold text-xs text-primary">{r.totalPoints}</TableCell>
                        <TableCell className="text-right pr-10 font-bold text-sm text-foreground/70">{r.averageScore}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
             {subjectPerformance.map((p) => (
               <Card key={p!.subject} className="border-none shadow-xl bg-card rounded-[2.5rem] group hover:-translate-y-1 transition-[transform,box-shadow] overflow-hidden">
                 <div className={cn(
                   "h-2 w-full",
                   p!.passRate > 80 ? "bg-green-500" : p!.passRate > 50 ? "bg-blue-500" : "bg-destructive"
                 )} />
                 <CardHeader className="p-8 pb-4">
                   <CardTitle className="text-xl font-semibold text-primary tracking-tight">{p!.subject}</CardTitle>
                   <CardDescription className="text-[13px] font-bold text-primary/40">{activeClass}</CardDescription>
                 </CardHeader>
                 <CardContent className="p-8 pt-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-muted/20 border border-muted shadow-inner">
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1">Average</p>
                          <p className="text-2xl font-semibold text-primary"><AnimatedNumber value={p!.averageScore} format={(n) => n.toFixed(1)} suffix="%" /></p>
                       </div>
                       <div className="p-4 rounded-2xl bg-muted/20 border border-muted shadow-inner">
                          <p className="text-[11px] font-semibold text-muted-foreground mb-1">Pass Rate</p>
                          <p className="text-2xl font-semibold text-green-600"><AnimatedNumber value={p!.passRate} suffix="%" /></p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center text-[12px] font-semibold text-muted-foreground">
                          <span>Grade spread</span>
                          <span>{p!.totalStudents} Candidates</span>
                       </div>
                       <SegmentedProgress
                         label={`${p!.subject} grade distribution`}
                         segments={[
                           { value: p!.gradeDistribution.A / p!.totalStudents * 100, className: "bg-green-500", label: "A" },
                           { value: p!.gradeDistribution.B / p!.totalStudents * 100, className: "bg-blue-500", label: "B" },
                           { value: p!.gradeDistribution.C / p!.totalStudents * 100, className: "bg-orange-500", label: "C" },
                           { value: p!.gradeDistribution.D / p!.totalStudents * 100, className: "bg-red-500", label: "D" },
                           { value: p!.gradeDistribution.F / p!.totalStudents * 100, className: "bg-destructive", label: "F" },
                         ]}
                       />
                    </div>
                 </CardContent>
               </Card>
             ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Grading DIALOG Node */}
      <Dialog open={!!gradingStudent} onOpenChange={(open) => !open && setGradingStudent(null)}>
        <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-md border-none shadow-2xl">
          <DialogHeader className="bg-primary/5 p-8 border-b text-center">
            <DialogTitle className="text-xl font-semibold text-primary">Assessment Entry</DialogTitle>
            <DialogDescription className="text-[13px] font-bold">{gradingStudent?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveGrade} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Subject</Label>
              <Select name="subject" required>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                  <SelectValue placeholder="Identify subject..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {SUBJECTS_SECONDARY.filter(s => isAdmin || (isTeacher && canTeach(assignments ?? [], gradingStudent?.class ?? '', s))).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Raw Score (%)</Label>
              <Input
                name="score"
                type="number"
                placeholder="0 - 100"
                min={0}
                max={100}
                required
                className="h-12 rounded-xl bg-muted/20 border-none font-semibold text-lg px-6 shadow-inner"
              />
            </div>
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[12px] font-semibold text-primary mb-1">Assessment</p>
              <p className="text-[13px] font-bold text-muted-foreground leading-relaxed tracking-tighter">
                Recording for {activeTerm} · {activeExam} · 2026. Existing marks require administrator review; imports and legacy marks may still contain duplicates.
              </p>
            </div>
            <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-2xl group">
              {isSaving ? <Loader2 className="animate-spin mr-2" /> : <GraduationCap className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />}
              Save marks
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MARKS IMPORT — the sheet is the input, the register is the referee. */}
      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportResult(null); setImportFileName(null) } }}>
        <DialogContent className="max-w-3xl rounded-[2rem] border-none p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="bg-primary/5 p-8 border-b">
            <DialogTitle className="text-xl font-semibold tracking-tight text-primary">Import marks from Excel</DialogTitle>
            <DialogDescription className="text-[13px] font-bold text-muted-foreground">
              {activeClass} · {activeTerm} · {activeExam} — nothing is written until you press import.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-6 overflow-y-auto p-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => void handleDownloadMarksTemplate()}
                className="h-11 flex-1 rounded-xl font-semibold text-[13px]"
              >
                <Download className="mr-2 h-4 w-4" /> Download template
              </Button>
              <label className="h-11 flex-1 cursor-pointer">
                <span className="flex h-11 items-center justify-center rounded-xl colorful-gradient text-[13px] font-semibold text-white shadow-lg">
                  <Upload className="mr-2 h-4 w-4" /> Choose filled sheet
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleMarksFile}
                />
              </label>
            </div>

            <p className="text-[12px] font-bold text-muted-foreground">
              Columns: Admission No · Subject · Score (Term and Exam are taken from the selectors if the sheet omits them).
              {importFileName ? ` · ${importFileName}` : ""}
            </p>

            {importResult ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Rows read", value: importResult.stats.read },
                    { label: "Marks ready", value: importResult.stats.valid },
                    { label: "Learners", value: importResult.stats.learners },
                    { label: "Average", value: importResult.stats.average === null ? "—" : `${importResult.stats.average}%` },
                  ].map((cell) => (
                    <div key={cell.label} className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-[11px] font-semibold text-muted-foreground">{cell.label}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{typeof cell.value === "number" ? <AnimatedNumber value={cell.value} /> : cell.value}</p>
                    </div>
                  ))}
                </div>

                {importResult.issues.length > 0 ? (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                      {importResult.stats.errors} error(s) · {importResult.stats.warnings} warning(s)
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-border/60 bg-white p-3">
                      {importResult.issues.slice(0, 40).map((issue, index) => (
                        <p key={`${issue.row}-${index}`} className="text-[12px] font-medium leading-relaxed text-muted-foreground">
                          <span className={issue.severity === "error" ? "font-black text-destructive" : "font-black text-orange-600"}>
                            row {issue.row}
                          </span>{" "}
                          {issue.message}
                        </p>
                      ))}
                      {importResult.issues.length > 40 ? (
                        <p className="text-[12px] font-semibold text-muted-foreground">
                          +{importResult.issues.length - 40} more
                        </p>
                      ) : null}
                    </div>
                    <p className="text-[12px] font-bold text-muted-foreground/80">
                      Rows with errors are skipped. The rest still import.
                    </p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Every row is clean
                  </p>
                )}

                {importResult.rows.length > 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-border/60">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-[11px] font-semibold">Learner</TableHead>
                          <TableHead className="text-[11px] font-semibold">Subject</TableHead>
                          <TableHead className="text-[11px] font-semibold text-center">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.rows.slice(0, 6).map((row) => (
                          <TableRow key={`${row.studentId}-${row.subject}`}>
                            <TableCell className="py-2 text-[13px] font-semibold text-foreground/80">{row.studentName}</TableCell>
                            <TableCell className="py-2 text-[13px] font-bold text-muted-foreground">{row.subject}</TableCell>
                            <TableCell className="py-2 text-center text-[14px] font-bold tabular-nums text-primary">{row.score}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {importResult.rows.length > 6 ? (
                      <p className="bg-muted/10 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
                        +{importResult.rows.length - 6} more rows
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <Button
                  disabled={importing || importResult.rows.length === 0}
                  onClick={() => void handleCommitMarks()}
                  className="h-12 w-full rounded-xl colorful-gradient text-[14px] font-semibold text-white shadow-xl"
                >
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Import {importResult.rows.length} marks
                </Button>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center text-[13px] font-bold text-muted-foreground">
                Download the template, fill the Score column, upload it back.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
