"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  Loader2,
  FileText,
  Upload,
  Home,
  Bus,
  Zap,
  Sparkles,
  ChevronRight,
  ScanLine,
  Camera,
  IdCard,
  QrCode,
  Images
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from "@/firebase"
import { collection, doc, query, orderBy, setDoc, serverTimestamp, where, getDocs } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { generateStudentProgressSummary } from "@/ai/flows/generate-student-progress-summary-flow"
import { scanStudentRegistration } from "@/ai/flows/scan-student-registration-flow"
import { exportReportCardToWord, exportToExcel } from "@/lib/export-utils"
import { buildReportCardData } from "@/lib/report-card-builder"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { studentSchema, type StudentFormData } from "@/lib/validations/student"
import { uploadStudentPhoto, deleteStudentPhoto } from "@/lib/storage"
import { PHOTO_POLICY_LABEL, PHOTO_POLICY_NOTE, photoCaptureAllowed, photoPolicy } from "@/lib/media/policy"
import {
  BULK_PHOTO_HINT,
  describeBulkPhotoPlan,
  planBulkPhotos,
  type BulkPhotoPlan,
  type BulkPhotoStatus,
} from "@/lib/media/bulk-photos"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import type { Student } from "@/types/student"
import { DEMO_MODE } from "@/lib/demo/config"
import { buildDemoNarrative, buildDemoScanResult } from "@/lib/demo/ai-fallback"

const ALTRAWARE_DEMO_STUDENTS: Partial<Student>[] = [
  { id: "ALT-2026-001", name: "JUMA KHAMISI OMARI", class: "Standard 7", type: "Boarder", hostel: "Kilimanjaro Wing", guardianPhone: "+255 700 000 001", conductPoints: 100 },
  { id: "ALT-2026-002", name: "NEEMA ELIAS MASAWE", class: "Standard 7", type: "Day", route: "Posta - Kariakoo", guardianPhone: "+255 700 000 002", conductPoints: 94 },
  { id: "ALT-2026-003", name: "BARAKA SAIDI MREMA", class: "Standard 7", type: "Boarder", hostel: "Serengeti Wing", guardianPhone: "+255 700 000 003", conductPoints: 100 },
  { id: "ALT-2026-004", name: "ANNA JOSEPH KILIMA", class: "Form 2A", type: "Boarder", hostel: "Lake Victoria Wing", guardianPhone: "+255 700 000 004", conductPoints: 98 },
  { id: "ALT-2026-005", name: "IDRISSA HASSAN KHALFAN", class: "Form 2B", type: "Boarder", hostel: "Serengeti Wing", guardianPhone: "+255 700 000 005", conductPoints: 99 },
]

/** Colour codes for the bulk-import plan, one per outcome. */
const PHOTO_STATUS_STYLE: Record<BulkPhotoStatus, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  replace: "border-orange-200 bg-orange-50 text-orange-700",
  unmatched: "border-red-200 bg-red-50 text-destructive",
  duplicate: "border-red-200 bg-red-50 text-destructive",
  unsupported: "border-red-200 bg-red-50 text-destructive",
  oversize: "border-red-200 bg-red-50 text-destructive",
}

export default function StudentsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [tierFilter, setTierFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const photoInputRef = React.useRef<HTMLInputElement | null>(null)
  const photoPolicyValue = photoPolicy()
  const canCapturePhoto = photoCaptureAllowed()
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isManualEnrolling, setIsManualEnrolling] = useState(false)
  const [isExportingReport, setIsExportingReport] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Bulk photo import — a folder named by admission number, planned in full
  // before a single child's face moves (see src/lib/media/bulk-photos.ts).
  const [isPhotoImportOpen, setIsPhotoImportOpen] = useState(false)
  const [photoImportFiles, setPhotoImportFiles] = useState<File[]>([])
  const [photoImportPlan, setPhotoImportPlan] = useState<BulkPhotoPlan | null>(null)
  const [photoConsentAttested, setPhotoConsentAttested] = useState(false)
  const [photoImportBusy, setPhotoImportBusy] = useState(false)
  const [photoImportProgress, setPhotoImportProgress] = useState({ done: 0, total: 0 })
  const [photoImportFailures, setPhotoImportFailures] = useState<string[]>([])
  const { user } = useUser()

  const identityRef = useMemoFirebase(() => doc(db, "schools", "school-001", "config", "identity"), [db])
  const { data: identity } = useDoc(identityRef)

  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")), [db])
  const { data: firestoreStudents, isLoading } = useCollection<Student>(studentsQuery)

  const isDemo = identity?.demoMode === true

  const students = useMemo(() => {
    const base = firestoreStudents || []
    if (!isDemo) return base
    const demoIds = new Set(base.map(s => s.id))
    const uniqueDemo = ALTRAWARE_DEMO_STUDENTS.filter(s => !demoIds.has(s.id!)) as Student[]
    return [...base, ...uniqueDemo]
  }, [firestoreStudents, isDemo])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTier = tierFilter === "all" || s.class === tierFilter
      const matchesType = typeFilter === "all" || s.type === typeFilter
      return matchesSearch && matchesTier && matchesType
    })
  }, [searchTerm, students, tierFilter, typeFilter])

  const availableTiers = useMemo(() => {
    const tiers = new Set(students.map(student => student.class))
    return Array.from(tiers).sort()
  }, [students])

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      type: 'Day',
      gender: 'Male'
    }
  })

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const handleManualEnroll = async (data: StudentFormData) => {
    setIsSaving(true)
    try {
      let photoUrl = ""
      if (photoFile) {
        photoUrl = await uploadStudentPhoto("school-001", data.id, photoFile)
      }

      const studentData = {
        ...data,
        searchName: data.name,
        status: "Active",
        conductPoints: 100,
        balance: 0,
        photoUrl,
        enrollmentDate: data.enrollmentDate || new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      }

      await setDoc(doc(db, "schools", "school-001", "students", data.id), studentData)
      
      setIsManualEnrolling(false)
      reset()
      setPhotoFile(null)
      setPhotoPreview(null)
      toast({ title: "Student Enrolled", description: `${data.name} synced to Altraware database.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSmartEnroll = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsScanning(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      try {
        const result = DEMO_MODE
          ? await new Promise<ReturnType<typeof buildDemoScanResult>>((resolve) =>
              setTimeout(() => resolve(buildDemoScanResult()), 1200)
            )
          : await scanStudentRegistration({ photoDataUri: base64 })
        const newStudent = {
          id: result.id,
          name: result.name.toUpperCase(),
          searchName: result.name.toUpperCase(),
          class: result.academicLevel,
          status: "Active",
          type: "Day",
          guardianPhone: result.parentContact || "+255",
          conductPoints: 100,
          balance: 0,
          photoUrl: "" // Smart enroll legacy still uses no photo for now or we could upload
        }
        addDocumentNonBlocking(collection(db, "schools", "school-001", "students"), newStudent)
        toast({ title: "AI Enrollment Success", description: `Synchronized ${result.name} to Altraware node.` })
      } catch (err) {
        toast({ variant: "destructive", title: "Scan Node Failed", description: "Internal AI error during form parsing." })
      } finally {
        setIsScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleGenerateAiSummary = async () => {
    if (!selectedStudent) return
    setIsGeneratingAi(true)
    try {
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 1400))
        setAiSummary(
          buildDemoNarrative({
            studentName: selectedStudent.name,
            classLevel: selectedStudent.class,
            conductPoints: selectedStudent.conductPoints || 100,
            attendanceRate: 96.4,
          })
        )
        toast({ title: "AI Synthesis Complete", description: "Narrative report generated (demo node)." })
        return
      }

      const result = await generateStudentProgressSummary({
        studentName: selectedStudent.name,
        academicPerformance: [
          { subject: "Mathematics", grade: "A", comment: "Exceptional analytical skills." },
          { subject: "English", grade: "B", comment: "Fluent communication." }
        ],
        attendanceSummary: "Consistent attendance at 98.4%.",
        behavioralNotes: `Conduct Score: ${selectedStudent.conductPoints || 100} PTS.`
      })
      setAiSummary(result.summary)
      toast({ title: "AI Synthesis Complete", description: "Narrative report generated." })
    } catch (err) {
      toast({ variant: "destructive", title: "Synthesis Failed", description: "Internal AI node error." })
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleDownloadReportCardPdf = async () => {
    if (!selectedStudent) return
    setIsExportingReport(true)
    try {
      const gradesSnap = await getDocs(
        query(
          collection(db, "schools", "school-001", "grades"),
          where("studentId", "==", selectedStudent.id)
        )
      )
      const grades = gradesSnap.docs.map((snap) => {
        const row = snap.data() as any
        return { subject: row.subject ?? "Subject", score: Number(row.score ?? 0), examType: row.examType }
      })
      if (grades.length === 0) {
        toast({
          variant: "destructive",
          title: "No assessment rows",
          description: "Record subject scores before issuing a report card.",
        })
        return
      }
      const { downloadReportCard } = await import("@/lib/pdf/report-card")
      await downloadReportCard({
        student: {
          id: selectedStudent.id,
          name: selectedStudent.name,
          className: selectedStudent.class,
          admissionNumber: (selectedStudent as any).admissionNumber ?? selectedStudent.id,
          gender: selectedStudent.gender,
        },
        grades,
        term: "Term 2",
        academicYear: "2026",
        teacherRemark: `Conduct grade: ${selectedStudent.conductPoints ?? 100} points. ${aiSummary ? aiSummary.replace(/<[^>]*>/g, " ").slice(0, 300) : ""}`.trim(),
      })
      toast({
        title: "Report card PDF ready",
        description: `${selectedStudent.name} · vector PDF · NECTA grading`,
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "PDF export failed",
        description: err?.message ?? "Could not assemble the report card.",
      })
    } finally {
      setIsExportingReport(false)
    }
  }

  /**
   * Attach or replace a learner's photograph from the register itself.
   *
   * The file goes through the same `uploadStudentPhoto` boundary the enrollment
   * form uses (Firebase Storage in production, a local data URL in the demo),
   * so swapping in Cloudinary later touches one file, not this screen.
   */
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !selectedStudent) return
    setPhotoBusy(true)
    try {
      const photoUrl = await uploadStudentPhoto("school-001", selectedStudent.id, file)
      // Consent is recorded with the photograph, not assumed from it.
      await setDoc(
        doc(db, "schools", "school-001", "students", selectedStudent.id),
        {
          photoUrl,
          photoUpdatedAt: serverTimestamp(),
          photoConsent: { granted: true, by: "guardian", at: serverTimestamp() },
        },
        { merge: true }
      )
      toast({
        title: "Photograph attached",
        description: `${selectedStudent.name} · visible on the register, the profile and the printed ID card.`,
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not store the photograph",
        description: err?.message ?? "Unknown storage error",
      })
    } finally {
      setPhotoBusy(false)
    }
  }

  /**
   * Withdrawing consent deletes the photograph — the PDPA right to erasure is
   * a button here, not a support ticket. Marks, attendance and fees stay.
   */
  const handleRemovePhoto = async () => {
    if (!selectedStudent) return
    setPhotoBusy(true)
    try {
      await deleteStudentPhoto("school-001", selectedStudent.id).catch(() => undefined)
      await setDoc(
        doc(db, "schools", "school-001", "students", selectedStudent.id),
        {
          photoUrl: "",
          photoConsent: { granted: false, by: "guardian", revokedAt: serverTimestamp() },
        },
        { merge: true }
      )
      toast({
        title: "Photograph removed",
        description: `${selectedStudent.name} now prints with initials. Academic and fee records are untouched.`,
      })
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not remove the photograph",
        description: err?.message ?? "Unknown storage error",
      })
    } finally {
      setPhotoBusy(false)
    }
  }

  /**
   * Read the folder the school picked and turn it into a plan — no writes, no
   * uploads. Every file is classified (ready / replace / unmatched / duplicate /
   * unsupported / too large) and the counts are what the dialog shows.
   */
  const handlePhotoFolder = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ""
    setPhotoImportFailures([])
    setPhotoImportProgress({ done: 0, total: 0 })
    setPhotoImportFiles(picked)
    setPhotoImportPlan(
      planBulkPhotos(
        picked.map((file) => ({ name: file.name, type: file.type, size: file.size })),
        students.map((student) => ({
          id: student.id,
          name: student.name,
          className: student.class,
          hasPhoto: Boolean(student.photoUrl),
        })),
        photoPolicyValue
      )
    )
  }

  /**
   * Store the photographs the plan approved.
   *
   * Each one goes through the same `uploadStudentPhoto` boundary as a single
   * capture (400 px, EXIF stripped, 2 MB cap) and each one records consent with
   * who attested it, which file it came from, and when. A failure on row 40 does
   * not roll back rows 1–39: the school is told exactly what landed and what did
   * not, and the register is refreshed by the live query.
   */
  const handleCommitPhotoImport = async () => {
    if (!photoImportPlan || photoImportPlan.importable.length === 0) return
    if (!canCapturePhoto) {
      toast({
        variant: "destructive",
        title: "Photographs are disabled",
        description: "This school keeps no learner photographs (PHOTO_POLICY=none).",
      })
      return
    }
    if (!photoConsentAttested) {
      toast({
        variant: "destructive",
        title: "Consent not confirmed",
        description: "Confirm that each guardian agreed before photographs are stored.",
      })
      return
    }

    setPhotoImportBusy(true)
    setPhotoImportFailures([])
    const total = photoImportPlan.importable.length
    setPhotoImportProgress({ done: 0, total })

    const failures: string[] = []
    let done = 0

    for (const row of photoImportPlan.importable) {
      const file = photoImportFiles[photoImportPlan.rows.indexOf(row)]
      try {
        if (!row.studentId) throw new Error("no learner on this row")
        if (!file) throw new Error("the file is no longer available — choose the folder again")
        const photoUrl = await uploadStudentPhoto("school-001", row.studentId, file)
        await setDoc(
          doc(db, "schools", "school-001", "students", row.studentId),
          {
            photoUrl,
            photoUpdatedAt: serverTimestamp(),
            photoConsent: {
              granted: true,
              by: user?.email ?? "school administrator",
              method: "bulk-import",
              fileName: row.fileName,
              at: serverTimestamp(),
            },
          },
          { merge: true }
        )
      } catch (err: any) {
        failures.push(`${row.fileName} — ${err?.message ?? "upload failed"}`)
      } finally {
        done += 1
        setPhotoImportProgress({ done, total })
      }
    }

    const stored = total - failures.length
    setPhotoImportFailures(failures)
    setPhotoImportBusy(false)

    toast({
      variant: stored === 0 ? "destructive" : "default",
      title: stored === 0 ? "No photographs stored" : `${stored} photograph${stored === 1 ? "" : "s"} stored`,
      description:
        failures.length === 0
          ? "Consent recorded with each one. ID cards will use them immediately."
          : `${failures.length} failed — the list is in the dialog, nothing else was lost.`,
    })

    if (failures.length === 0) {
      setIsPhotoImportOpen(false)
      setPhotoImportFiles([])
      setPhotoImportPlan(null)
      setPhotoConsentAttested(false)
      setPhotoImportProgress({ done: 0, total: 0 })
    }
  }

  const handleDownloadIdCard = async () => {
    if (!selectedStudent) return
    try {
      const { downloadIdCards } = await import("@/lib/pdf/id-card")
      await downloadIdCards(
        [
          {
            id: selectedStudent.id,
            name: selectedStudent.name,
            className: selectedStudent.class,
            admissionNumber: (selectedStudent as any).admissionNumber ?? selectedStudent.id,
            gender: selectedStudent.gender,
            parentPhone: selectedStudent.guardianPhone,
            balance: selectedStudent.balance,
            photoUrl: selectedStudent.photoUrl,
          },
        ],
        { term: "Term 2 2026" }
      )
      toast({ title: "ID card generated", description: "A4 2-up sheet with crop marks · fully vector." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "ID export failed", description: err?.message ?? "Unknown error" })
    }
  }

  const handleDownloadReport = async () => {
    if (!selectedStudent) return
    setIsExportingReport(true)
    try {
      const data = await buildReportCardData(db, "school-001", selectedStudent.id, "Term 3", "Annual")
      await exportReportCardToWord(data)
      toast({ title: "Transcript Compiled", description: `Sovereign node exported for ${selectedStudent.name}.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Export Error", description: err.message || "Failed to assemble report matrix." })
    } finally {
      setIsExportingReport(false)
    }
  }

  return (
    <div className="space-y-6 pb-24 px-1 font-body">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full">
            {isDemo ? "ALTRAWARE DEMO NODE" : "OFFICIAL REGISTRY"}
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">Student Directory</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-none">PDPA-Compliant management of {students.length} institutional nodes.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => exportToExcel(students, "Altraware_Student_Ledger")} className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-black text-[9px] uppercase">
            <Download className="mr-2 h-4 w-4" /> Export Ledger
          </Button>

          <Dialog
            open={isPhotoImportOpen}
            onOpenChange={(open) => {
              setIsPhotoImportOpen(open)
              if (!open) {
                setPhotoImportFiles([])
                setPhotoImportPlan(null)
                setPhotoConsentAttested(false)
                setPhotoImportFailures([])
                setPhotoImportProgress({ done: 0, total: 0 })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={!canCapturePhoto}
                title={canCapturePhoto ? "Match a folder of photographs by admission number" : PHOTO_POLICY_NOTE.none}
                className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-black text-[9px] uppercase disabled:opacity-50"
              >
                <Images className="mr-2 h-4 w-4" /> Import photos
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] p-0 max-w-2xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="sticky top-0 z-10 border-b bg-white/90 p-6 backdrop-blur-md sm:p-8">
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-primary sm:text-xl">
                  Import photographs
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {PHOTO_POLICY_LABEL[photoPolicyValue]} — nothing is stored until you press import.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 p-6 sm:p-8">
                <p className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-3 text-[9px] font-bold uppercase leading-relaxed tracking-widest text-muted-foreground">
                  {BULK_PHOTO_HINT}
                </p>

                <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-white p-4">
                  <Checkbox
                    checked={photoConsentAttested}
                    onCheckedChange={(value) => setPhotoConsentAttested(value === true)}
                    disabled={!canCapturePhoto || photoImportBusy}
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-foreground">
                      Each guardian has agreed to this photograph
                    </span>
                    <span className="block text-[9px] font-medium leading-relaxed text-muted-foreground">
                      Consent is recorded with every learner, with your account, the file name and the time.
                      A guardian can withdraw it later from the learner&apos;s profile, and the file is deleted.
                      Photographs of leavers are removed after 90 days.
                    </span>
                  </span>
                </label>

                <label
                  className={cn(
                    "flex h-14 items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg",
                    canCapturePhoto && photoConsentAttested && !photoImportBusy
                      ? "colorful-gradient cursor-pointer text-white"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  )}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {photoImportPlan ? "Choose a different folder" : "Choose a folder of photographs"}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={!canCapturePhoto || !photoConsentAttested || photoImportBusy}
                    onChange={handlePhotoFolder}
                  />
                </label>

                {photoImportPlan ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: "Ready", value: photoImportPlan.counts.ready, tone: "text-emerald-600" },
                        { label: "Replacing", value: photoImportPlan.counts.replace, tone: "text-orange-600" },
                        {
                          label: "Unmatched",
                          value: photoImportPlan.counts.unmatched,
                          tone: "text-destructive",
                        },
                        {
                          label: "Refused",
                          value:
                            photoImportPlan.counts.duplicate +
                            photoImportPlan.counts.unsupported +
                            photoImportPlan.counts.oversize,
                          tone: "text-destructive",
                        },
                      ].map((cell) => (
                        <div key={cell.label} className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                            {cell.label}
                          </p>
                          <p className={cn("mt-1 text-xl font-black tabular-nums", cell.tone)}>{cell.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {describeBulkPhotoPlan(photoImportPlan)}
                    </p>

                    {photoImportPlan.rows.length > 0 ? (
                      <div className="max-h-56 space-y-1 overflow-y-auto rounded-2xl border border-border/60 bg-white p-2">
                        {[...photoImportPlan.importable, ...photoImportPlan.blocked].map((row) => (
                          <div
                            key={row.fileName}
                            className="flex flex-col gap-1 rounded-xl px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-black uppercase text-foreground/80">
                                {row.fileName}
                              </p>
                              <p className="text-[9px] font-medium leading-relaxed text-muted-foreground">{row.note}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 self-start rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase sm:self-auto",
                                PHOTO_STATUS_STYLE[row.status]
                              )}
                            >
                              {row.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {photoImportBusy || photoImportProgress.total > 0 ? (
                      <div className="space-y-2">
                        <Progress
                          value={
                            photoImportProgress.total === 0
                              ? 0
                              : Math.round((photoImportProgress.done / photoImportProgress.total) * 100)
                          }
                          className="h-2 rounded-full bg-muted/50"
                        />
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          {photoImportProgress.done} / {photoImportProgress.total} stored
                        </p>
                      </div>
                    ) : null}

                    {photoImportFailures.length > 0 ? (
                      <div className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-destructive">
                          {photoImportFailures.length} could not be stored
                        </p>
                        {photoImportFailures.slice(0, 8).map((failure) => (
                          <p key={failure} className="text-[9px] font-medium leading-relaxed text-muted-foreground">
                            {failure}
                          </p>
                        ))}
                        {photoImportFailures.length > 8 ? (
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            +{photoImportFailures.length - 8} more
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <Button
                      disabled={
                        photoImportBusy || photoImportPlan.importable.length === 0 || !photoConsentAttested
                      }
                      onClick={() => void handleCommitPhotoImport()}
                      className="h-12 w-full rounded-xl colorful-gradient text-[11px] font-black uppercase tracking-widest text-white shadow-xl"
                    >
                      {photoImportBusy ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="mr-2 h-4 w-4" />
                      )}
                      {photoImportBusy
                        ? "Storing photographs…"
                        : `Import ${photoImportPlan.importable.length} photograph${photoImportPlan.importable.length === 1 ? "" : "s"}`}
                    </Button>

                    {photoImportPlan.blocked.length > 0 ? (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        Unmatched and refused files are skipped. Everything else still imports.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tick the consent box, then pick the folder. You will see the plan before anything is stored.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-black text-[9px] uppercase group">
                <ScanLine className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> AI Smart Enroll
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-8 max-w-md border-none shadow-2xl">
              <DialogHeader className="mb-6 text-center">
                <DialogTitle className="text-xl font-black uppercase">Smart Enrollment Node</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Extract student details via Altraware AI</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 text-center">
                <div className="p-10 rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center gap-4 group hover:border-primary/40 transition-colors shadow-inner">
                  {isScanning ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <Camera className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />}
                  <p className="text-[10px] font-black text-muted-foreground uppercase">{isScanning ? "AI Analyzing Form..." : "Scan Registration Form"}</p>
                  <label className="cursor-pointer">
                    <Button variant="default" className="rounded-full colorful-gradient h-12 px-8 font-black text-[10px] uppercase shadow-xl pointer-events-none">Select Document</Button>
                    <input type="file" className="hidden" accept="image/*" onChange={handleSmartEnroll} disabled={isScanning} />
                  </label>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isManualEnrolling} onOpenChange={setIsManualEnrolling}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none rounded-full colorful-gradient h-11 shadow-xl font-black text-[9px] uppercase px-8">
                <Plus className="mr-2 h-4 w-4" /> Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-y-auto border-none shadow-2xl max-w-lg max-h-[90vh]">
              <DialogHeader className="bg-primary/5 p-8 border-b sticky top-0 z-10 bg-white/80 backdrop-blur-md">
                <DialogTitle className="text-xl font-black uppercase text-primary">Manual Enrollment</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Register new candidate to Altraware database</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleManualEnroll)} className="p-8 space-y-6">
                <div className="flex flex-col items-center gap-4 mb-4">
                   <div className="relative group">
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/10 shadow-inner">
                         {photoPreview ? <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
                      </div>
                      <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white cursor-pointer shadow-lg hover:scale-110 transition-transform">
                         <Upload className="h-3 w-3" />
                         <input type="file" className="hidden" accept="image/*" onChange={onPhotoChange} />
                      </label>
                   </div>
                   <p className="text-[8px] font-black uppercase text-muted-foreground">Upload Candidate Photo</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Legal Name</Label>
                    <Input {...register('name')} placeholder="e.g. JUMA HAMISI" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold uppercase px-5 shadow-inner", errors.name && "ring-1 ring-destructive")} />
                    {errors.name && <p className="text-[8px] text-destructive font-black uppercase mt-1 ml-1">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Candidate ID</Label>
                    <Input {...register('id')} placeholder="e.g. ALT-2026-001" className={cn("h-12 rounded-xl bg-muted/20 border-none font-mono font-black px-5 shadow-inner", errors.id && "ring-1 ring-destructive")} />
                    {errors.id && <p className="text-[8px] text-destructive font-black uppercase mt-1 ml-1">{errors.id.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Date of Birth</Label>
                    <Input {...register('dateOfBirth')} type="date" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner", errors.dateOfBirth && "ring-1 ring-destructive")} />
                    {errors.dateOfBirth && <p className="text-[8px] text-destructive font-black uppercase mt-1 ml-1">{errors.dateOfBirth.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Gender</Label>
                    <Select onValueChange={(v) => setValue('gender', v as any)} defaultValue="Male">
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-black text-xs px-5 shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Male">Male Node</SelectItem>
                        <SelectItem value="Female">Female Node</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Academic Tier</Label>
                    <Select onValueChange={(v) => setValue('class', v)} defaultValue="Standard 7">
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-black text-xs px-5 shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {identity?.tiers?.map((t: string) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        )) || (
                          <>
                            <SelectItem value="Standard 7">Standard 7</SelectItem>
                            <SelectItem value="Form 2">Form 2</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Residence</Label>
                    <Select onValueChange={(v) => setValue('type', v as any)} defaultValue="Day">
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-black text-xs px-5 shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Boarder">Boarder Node</SelectItem>
                        <SelectItem value="Day">Day Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Guardian Name</Label>
                      <Input {...register('guardianName')} placeholder="Full Name" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner", errors.guardianName && "ring-1 ring-destructive")} />
                      {errors.guardianName && <p className="text-[8px] text-destructive font-black uppercase mt-1 ml-1">{errors.guardianName.message}</p>}
                   </div>
                   <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Guardian Phone</Label>
                      <Input {...register('guardianPhone')} placeholder="07XXXXXXXX" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner", errors.guardianPhone && "ring-1 ring-destructive")} />
                      {errors.guardianPhone && <p className="text-[8px] text-destructive font-black uppercase mt-1 ml-1">{errors.guardianPhone.message}</p>}
                   </div>
                </div>

                <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl colorful-gradient font-black text-xs uppercase shadow-xl mt-4">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Initialize Candidate Node"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/60 rounded-[2.5rem]">
        <CardHeader className="bg-muted/20 border-b p-6 sm:p-8 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input 
              placeholder="Find student by name or ID..." 
              className="pl-12 bg-white border-none rounded-full h-12 shadow-inner font-bold text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2">
              <Filter className="h-3.5 w-3.5" />
            </span>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-12 w-[160px] rounded-full border-none bg-white shadow-sm font-black text-[10px] uppercase">
                <SelectValue placeholder="Academic Tier" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Tiers</SelectItem>
                {availableTiers.map((tier) => (
                  <SelectItem key={tier} value={tier}>{tier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12 w-[160px] rounded-full border-none bg-white shadow-sm font-black text-[10px] uppercase">
                <SelectValue placeholder="Logistic Hub" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="Boarder">Boarders</SelectItem>
                <SelectItem value="Day">Day Students</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="h-12 px-4 rounded-full border-primary/10 bg-white text-primary font-black text-[9px] uppercase">
              {filteredStudents.length} / {students.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Synchronizing Registry Node...</p>
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest">Student Node</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Academic Tier</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Logistic Hub</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Conduct</TableHead>
                  <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest">Control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className="group hover:bg-primary/[0.02] border-b last:border-none transition-colors">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-2xl shadow-lg shrink-0 border-2 border-white transition-transform group-hover:scale-110 overflow-hidden">
                          <AvatarImage src={student.photoUrl || (student as any).photo} className="object-cover" />
                          <AvatarFallback className="font-black text-primary bg-primary/5 uppercase">{student.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-foreground/80 group-hover:text-primary transition-colors uppercase truncate max-w-[200px]">{student.name}</span>
                          <span className="text-[9px] text-muted-foreground font-mono font-black">{student.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-black uppercase bg-white/50 border-primary/10 px-3 py-0.5 rounded-full">
                        {student.class}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {student.type === "Boarder" ? <Home className="h-3 w-3 text-primary/40" /> : <Bus className="h-3 w-3 text-primary/40" />}
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tight">
                          {student.type === "Boarder" ? (student.hostel || "Assigned Wing") : (student.route || "Fleet Route")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-black text-[10px] text-green-700 bg-green-50 px-3 py-1 rounded-full shadow-sm">
                      {student.conductPoints || 100} PTS
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Sheet onOpenChange={(open) => { if (open) { setSelectedStudent(student); setAiSummary(null); } }}>
                        <SheetTrigger asChild>
                          <Button variant="ghost" className="text-[10px] font-black text-primary uppercase rounded-full group/btn hover:bg-primary/5">
                            Access Hub <ChevronRight className="ml-1 h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 border-l-0 shadow-2xl">
                          <div className="bg-primary/5 p-10 border-b relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12">
                              <Zap className="h-48 w-48" />
                            </div>
                            <SheetHeader className="text-left flex-row items-center gap-8 relative z-10">
                              <div className="relative shrink-0">
                                <Avatar className="h-28 w-24 rounded-[2rem] shadow-2xl border-4 border-white overflow-hidden">
                                  <AvatarImage src={selectedStudent?.photoUrl || (selectedStudent as any)?.photo} className="object-cover" />
                                  <AvatarFallback className="text-3xl font-black text-primary bg-white uppercase">{selectedStudent?.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {canCapturePhoto ? (
                                  <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={photoBusy}
                                    title={selectedStudent?.photoUrl ? "Replace photograph" : "Attach a photograph"}
                                    className="absolute -bottom-2 -right-2 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-primary text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-60"
                                  >
                                    {photoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                  </button>
                                ) : null}
                                <input
                                  ref={photoInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handlePhotoUpload}
                                />
                              </div>
                              <div className="space-y-3">
                                <h3 className="text-2xl font-headline font-black text-primary uppercase tracking-tighter">{selectedStudent?.name}</h3>
                                <div className="flex flex-wrap gap-2">
                                  <Badge className="rounded-full bg-white text-primary border-none shadow-md px-4 py-1 text-[9px] uppercase tracking-widest font-black">{selectedStudent?.class}</Badge>
                                  <span className="text-[9px] font-mono font-black text-muted-foreground px-3 py-1 bg-white rounded-lg shadow-inner">{selectedStudent?.id}</span>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                                    {PHOTO_POLICY_LABEL[photoPolicyValue]}
                                  </p>
                                  <p className="max-w-xs text-[8px] font-medium leading-relaxed text-muted-foreground/80">
                                    {PHOTO_POLICY_NOTE[photoPolicyValue]}
                                  </p>
                                  {canCapturePhoto && selectedStudent?.photoUrl ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleRemovePhoto()}
                                      disabled={photoBusy}
                                      className="text-[8px] font-black uppercase tracking-[0.16em] text-destructive underline-offset-2 hover:underline disabled:opacity-50"
                                    >
                                      Remove photograph &amp; withdraw consent
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </SheetHeader>
                          </div>

                          <div className="p-10 space-y-10">
                            <Tabs defaultValue="logistics" className="space-y-8">
                              <TabsList className="bg-muted/40 p-1 rounded-2xl h-12 grid w-full grid-cols-4 shadow-inner">
                                <TabsTrigger value="logistics" className="rounded-xl text-[8px] font-black uppercase">Logistics</TabsTrigger>
                                <TabsTrigger value="academic" className="rounded-xl text-[8px] font-black uppercase">Academic</TabsTrigger>
                                <TabsTrigger value="conduct" className="rounded-xl text-[8px] font-black uppercase">Merit</TabsTrigger>
                                <TabsTrigger value="id-card" className="rounded-xl text-[8px] font-black uppercase">ID Node</TabsTrigger>
                              </TabsList>

                              <TabsContent value="logistics" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Parent Contact</Label>
                                    <Input value={selectedStudent?.guardianPhone || ""} readOnly className="h-12 bg-muted/20 border-none font-bold rounded-xl px-5 shadow-inner" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Allocation Hub</Label>
                                    <Badge className="h-12 w-full flex items-center justify-center bg-white border border-muted text-primary font-black uppercase text-[10px] rounded-xl">
                                      {selectedStudent?.type === "Boarder" ? selectedStudent?.hostel : selectedStudent?.route}
                                    </Badge>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="academic" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                <Card className="border-none shadow-inner bg-muted/10 rounded-[2.5rem] overflow-hidden">
                                  <CardHeader className="bg-primary/5 p-8 flex flex-row items-center justify-between">
                                    <div className="space-y-1">
                                      <CardTitle className="text-base font-black uppercase tracking-widest text-primary">AI Narrative Synthesis</CardTitle>
                                      <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-primary/60">Altraware AI Performance Mapping</CardDescription>
                                    </div>
                                    <Button onClick={handleGenerateAiSummary} disabled={isGeneratingAi} className="rounded-full colorful-gradient h-10 px-6 font-black text-[9px] uppercase shadow-lg">
                                      {isGeneratingAi ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />} Synthesize
                                    </Button>
                                  </CardHeader>
                                  <CardContent className="p-8 min-h-[200px]">
                                    {aiSummary ? (
                                      <div className="prose prose-sm font-medium text-foreground/80 leading-relaxed text-xs">{aiSummary}</div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-[150px] text-center space-y-4 opacity-30">
                                        <Sparkles className="h-10 w-10 text-primary" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em]">Ready for Generation</p>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                                <Button 
                                  variant="outline" 
                                  className="w-full h-14 rounded-2xl border-primary/10 text-primary font-black uppercase text-xs hover:bg-primary/5 group"
                                  onClick={handleDownloadReport}
                                  disabled={isExportingReport}
                                >
                                  {isExportingReport ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <FileText className="mr-2 h-5 w-5" />}
                                  Official Performance Transcript (DOCX)
                                </Button>
                                <Button
                                  className="w-full h-14 rounded-2xl colorful-gradient text-white font-black uppercase text-xs shadow-lg shadow-primary/20"
                                  onClick={handleDownloadReportCardPdf}
                                  disabled={isExportingReport}
                                >
                                  {isExportingReport ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="mr-2 h-5 w-5" />}
                                  Report card · vector PDF
                                </Button>
                              </TabsContent>

                              <TabsContent value="id-card" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 text-center">
                                <div className="p-10 bg-muted/20 rounded-[3rem] border-2 border-dashed border-primary/10 flex flex-col items-center gap-8">
                                   <div className="w-[320px] h-[480px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-muted relative">
                                      <div className="h-24 bg-primary p-6 flex items-center justify-between">
                                         <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-lg"><Zap className="h-6 w-6 text-primary fill-primary" /></div>
                                         <div className="text-right">
                                            <p className="text-[7px] font-black text-white uppercase tracking-widest">{identity?.name || "Altraware Technology"}</p>
                                            <p className="text-[5px] font-bold text-white/60 uppercase">Institutional Identity Node</p>
                                         </div>
                                      </div>
                                      <div className="flex-1 flex flex-col items-center pt-10 px-8 text-center space-y-6">
                                         <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-primary/10 shadow-xl shadow-primary/5">
                                            <AvatarImage src={selectedStudent?.photoUrl || (selectedStudent as any)?.photo} className="object-cover" />
                                            <AvatarFallback className="text-3xl font-black text-primary bg-primary/5 uppercase">{selectedStudent?.name?.charAt(0)}</AvatarFallback>
                                         </Avatar>
                                         <div className="space-y-1">
                                            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Student Node</p>
                                            <h4 className="text-lg font-black text-primary uppercase leading-tight">{selectedStudent?.name}</h4>
                                         </div>
                                         <div className="grid grid-cols-2 w-full gap-4 pt-4 border-t border-muted">
                                            <div className="text-left">
                                               <p className="text-[6px] font-black text-muted-foreground uppercase">ID Number</p>
                                               <p className="text-[10px] font-bold text-foreground/80 font-mono">{selectedStudent?.id}</p>
                                            </div>
                                            <div className="text-right">
                                               <p className="text-[6px] font-black text-muted-foreground uppercase">Academic Tier</p>
                                               <p className="text-[10px] font-bold text-foreground/80">{selectedStudent?.class}</p>
                                            </div>
                                         </div>
                                         <div className="pt-6">
                                            <div className="p-3 bg-muted/30 rounded-2xl shadow-inner inline-block"><QrCode className="h-14 w-14 text-primary opacity-60" /></div>
                                            <p className="text-[6px] font-black text-muted-foreground uppercase mt-2">Altraware Audit Key</p>
                                         </div>
                                      </div>
                                      <div className="h-3 bg-accent" />
                                   </div>
                                   
                                   <div className="space-y-4 w-full max-w-xs">
                                      <Button className="w-full h-14 rounded-2xl colorful-gradient font-black text-xs uppercase shadow-xl" onClick={handleDownloadIdCard}>
                                         <IdCard className="mr-2 h-4 w-4" /> Export learner ID · PDF
                                      </Button>
                                      <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                                        Print-ready A4 sheet · crop marks · QR verification
                                      </p>
                                   </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                          <SheetFooter className="p-8 border-t bg-muted/10">
                            <p className="text-[8px] font-bold text-muted-foreground text-center w-full uppercase tracking-[0.4em]">Altraware Hub Identity Verified • 2026 Season</p>
                          </SheetFooter>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}