"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  Plus,
  Search,
  Download,
  Loader2,
  MoreHorizontal,
  UserCog,
  Power,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  Users,
  ChevronRight,
  GraduationCap,
  UserCheck,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/ui/animated-number"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, query, orderBy, serverTimestamp, setDoc, updateDoc } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"
import { staffSchema, type StaffFormData } from "@/lib/validations/staff"
import { generateStaffNo } from "@/lib/staff-utils"
import { Staff } from "@/types/staff"
import { StatCard } from "@/components/admin/stat-card";
import { ChartPanel, StaffMix, DepartmentLoad } from "@/components/admin/module-charts";

export default function StaffPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { schoolId, role: currentUserRole, loading: authLoading } = useAuth()

  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [statusTarget, setStatusTarget] = useState<Staff | null>(null)

  const staffQuery = useMemoFirebase(() => {
    if (!schoolId) return null;
    return query(collection(db, "schools", schoolId, "staff"), orderBy("fullName", "asc"))
  }, [db, schoolId])

  const { data: staff, isLoading: staffLoading } = useCollection<Staff>(staffQuery)

  const filteredStaff = useMemo(() => {
    if (!staff) return []
    return staff.filter(s =>
      s.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staffNo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, staff])

  const handleEnrollStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!schoolId) return

    const formData = new FormData(e.currentTarget)
    const rawData = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      role: formData.get("role") as any,
      department: formData.get("department") as string,
      joinedDate: formData.get("joinedDate") as string,
    }

    const validation = staffSchema.safeParse(rawData)
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {}
      validation.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      const staffNo = await generateStaffNo(db, schoolId)
      const docId = doc(collection(db, "unused")).id // generate unique ID

      const newStaff: Omit<Staff, 'id'> = {
        staffNo,
        fullName: validation.data.fullName,
        email: validation.data.email.toLowerCase(),
        phone: validation.data.phone,
        role: validation.data.role,
        department: validation.data.department,
        joinedDate: validation.data.joinedDate || new Date().toISOString().split('T')[0],
        active: true,
        createdAt: serverTimestamp(),
      }

      await setDoc(doc(db, "schools", schoolId, "staff", docId), newStaff)

      setIsAddingStaff(false)
      toast({ title: "Personnel Enrolled", description: `${newStaff.fullName} is now active as ${staffNo}.` })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Enrollment Failed", description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStaffStatus = async () => {
    if (!schoolId || !statusTarget) return
    try {
      const newStatus = !statusTarget.active
      await updateDoc(doc(db, "schools", schoolId, "staff", statusTarget.id), {
        active: newStatus
      })
      toast({
        title: newStatus ? "Staff Reactivated" : "Staff Deactivated",
        description: `${statusTarget.fullName} status updated in registry.`
      })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Update Failed", description: err.message })
    } finally {
      setStatusTarget(null)
    }
  }

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>

  const isAdmin = currentUserRole === 'ADMIN'

  const roster = (staff ?? []) as Staff[];

  return (
    <div className="space-y-6 pb-24 px-1 font-body">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            Staff register · 2026
          </Badge>
          <h1 className="text-xl sm:text-2xl font-headline font-semibold text-primary tracking-tight">Staff</h1>
          <p className="text-muted-foreground text-[13px] font-bold leading-none"><AnimatedNumber value={staff?.length || 0} /> staff members on the establishment.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {isAdmin && (
            <Dialog open={isAddingStaff} onOpenChange={(open) => { setIsAddingStaff(open); if(!open) setErrors({}); }}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none rounded-full colorful-gradient h-11 shadow-xl font-semibold text-[12px] px-8 group">
                  <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Enroll Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl max-w-lg">
                <DialogHeader className="bg-primary/5 p-8 border-b">
                  <DialogTitle className="text-xl font-headline font-semibold text-primary">Faculty Enrollment</DialogTitle>
                  <DialogDescription className="text-[13px] font-bold">Add new member to the 2026 personnel registry</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEnrollStaff} className="p-8 space-y-5">
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Full Legal Name</Label>
                    <Input name="fullName" placeholder="e.g. NEEMA PAUL" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold uppercase px-5 shadow-inner", errors.fullName && "ring-1 ring-destructive")} />
                    {errors.fullName && <p className="text-[11px] text-destructive font-semibold mt-1 ml-1">{errors.fullName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Email Address</Label>
                      <Input name="email" type="email" placeholder="staff@shule.pro" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner", errors.email && "ring-1 ring-destructive")} />
                      {errors.email && <p className="text-[11px] text-destructive font-semibold mt-1 ml-1">{errors.email}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Phone Number</Label>
                      <Input name="phone" placeholder="07XXXXXXXX" className={cn("h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner", errors.phone && "ring-1 ring-destructive")} />
                      {errors.phone && <p className="text-[11px] text-destructive font-semibold mt-1 ml-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Institutional Role</Label>
                      <Select name="role" defaultValue="TEACHER">
                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-semibold text-xs px-5 shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ADMIN">Administrator</SelectItem>
                          <SelectItem value="TEACHER">Teaching Staff</SelectItem>
                          <SelectItem value="ACCOUNTANT">Bursar / Accountant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Department</Label>
                      <Input name="department" placeholder="e.g. Science" className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Join Date</Label>
                    <Input name="joinedDate" type="date" className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5 shadow-inner" />
                  </div>
                  <Button type="submit" disabled={isSaving} className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-xl mt-2">
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5" /> : "Save staff member"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="On the establishment" value={roster.length} icon={Users} tone="primary" sub="Every enrolled staff member" />
        <StatCard index={1} label="Teaching" value={roster.filter((p) => p.role === 'TEACHER').length} icon={GraduationCap} tone="accent"
          progress={roster.length ? (roster.filter((p) => p.role === 'TEACHER').length / roster.length) * 100 : 0}
          sub="Share of the establishment" />
        <StatCard index={2} label="Active" value={roster.filter((p) => p.active).length} icon={UserCheck} tone="emerald"
          progress={roster.length ? (roster.filter((p) => p.active).length / roster.length) * 100 : 0}
          sub={`${roster.filter((p) => !p.active).length} marked inactive`} />
        <StatCard index={3} label="Departments" value={new Set(roster.map((p) => p.department).filter(Boolean)).size} icon={Building2} tone="slate" sub="Distinct departments recorded" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Establishment by role" hint="Who holds which band of access." className="lg:col-span-1" data-reveal>
          <StaffMix staff={roster} />
        </ChartPanel>
        <ChartPanel title="Teaching coverage" hint="Staff recorded against each department." className="lg:col-span-2" data-reveal>
          <DepartmentLoad staff={roster} />
        </ChartPanel>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white/60 rounded-[2.5rem]">
        <CardHeader className="bg-muted/20 border-b p-6 sm:p-8 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
            <Input
              placeholder="Find personnel by name or ID..."
              className="pl-12 bg-white border-none rounded-full h-12 shadow-inner font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {staffLoading ? (
            <div className="p-20 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-primary" /></div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-20 text-center opacity-30 flex flex-col items-center gap-4">
              <Users className="h-12 w-12" />
              <p className="text-[13px] font-semibold">No Personnel Identified</p>
            </div>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader className="bg-muted/30">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[12px] font-semibold">Staff member</TableHead>
                  <TableHead className="text-[12px] font-semibold">Role</TableHead>
                  <TableHead className="text-[12px] font-semibold">Department</TableHead>
                  <TableHead className="text-[12px] font-semibold">Phone</TableHead>
                  <TableHead className="text-[12px] font-semibold text-center">Status</TableHead>
                  <TableHead className="text-right pr-8 text-[12px] font-semibold">Control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="sd-stagger-rows">
                {filteredStaff.map((person) => (
                  <TableRow key={person.id} className={cn("group hover:bg-primary/[0.02] border-b last:border-none transition-colors", !person.active && "opacity-60")}>
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 rounded-2xl shadow-lg shrink-0 border-2 border-white transition-transform group-hover:scale-110 overflow-hidden bg-primary/5">
                          <AvatarFallback className="font-semibold text-primary">{person.fullName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-foreground/80 group-hover:text-primary transition-colors truncate max-w-[200px]">{person.fullName}</span>
                          <span className="text-[12px] text-muted-foreground font-mono font-semibold">{person.staffNo}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[11px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border-none shadow-sm",
                        person.role === 'ADMIN' ? "bg-primary/10 text-primary" :
                        person.role === 'TEACHER' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      )}>
                        {person.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] font-bold text-foreground/70">
                      {person.department || "General"}
                    </TableCell>
                    <TableCell className="text-[13px] font-bold text-foreground/70">
                      {person.phone}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full border-none shadow-sm",
                        person.active ? "bg-green-500 text-white" : "bg-muted-foreground/30 text-muted-foreground"
                      )}>
                        {person.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-primary/5">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl w-48 font-body">
                            <DropdownMenuLabel className="text-[12px] font-semibold text-muted-foreground px-4">Manage</DropdownMenuLabel>
                            <DropdownMenuItem className="px-4 py-3 cursor-pointer group" onClick={() => setStatusTarget(person)}>
                              <Power className={cn("mr-3 h-4 w-4 group-hover:scale-110 transition-transform", person.active ? "text-destructive" : "text-green-600")} />
                              <span className="font-bold text-xs">{person.active ? "Deactivate" : "Reactivate"}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <div className={cn("h-16 w-16 rounded-3xl flex items-center justify-center mx-auto shadow-inner", statusTarget?.active ? "bg-destructive/10 text-destructive" : "bg-green-50 text-green-600")}>
              {statusTarget?.active ? <AlertCircle className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
            </div>
            <AlertDialogTitle className="text-xl font-headline font-semibold text-center">
              {statusTarget?.active ? "Deactivate this staff member?" : "Reactivate this staff member?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs font-medium text-muted-foreground leading-relaxed">
              {statusTarget?.active
                ? `Revoking access for ${statusTarget.fullName}. They will no longer be able to authenticate or modify institutional records.`
                : `Restoring institutional access for ${statusTarget?.fullName}. They will regain their functional permissions.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-6">
            <AlertDialogCancel className="rounded-full h-12 font-semibold text-[13px] border-muted/50">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={toggleStaffStatus} className={cn("rounded-full h-12 font-black uppercase text-[13px] tracking-widest px-8 shadow-xl border-none", statusTarget?.active ? "bg-destructive text-white hover:bg-destructive/90" : "colorful-gradient")}>
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
