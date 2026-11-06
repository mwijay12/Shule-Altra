"use client"

import * as React from "react"
import { useState } from "react"
import { 
  CalendarDays, 
  Clock, 
  User, 
  BookOpen, 
  Plus, 
  Download, 
  Printer, 
  Search,
  Filter,
  Layers,
  ChevronRight,
  Zap
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const PERIODS = [
  { time: "08:00 - 08:40", name: "Period 1" },
  { time: "08:40 - 09:20", name: "Period 2" },
  { time: "09:20 - 10:00", name: "Period 3" },
  { time: "10:00 - 10:20", name: "Short Break", isBreak: true },
  { time: "10:20 - 11:00", name: "Period 4" },
  { time: "11:00 - 11:40", name: "Period 5" },
  { time: "11:40 - 12:20", name: "Period 6" },
  { time: "12:20 - 13:20", name: "Lunch Break", isBreak: true },
]

const SUBJECT_TEACHERS = [
  { subject: "Mathematics", teacher: "Mwl. E. Komba" },
  { subject: "English", teacher: "Mwl. L. Kivuyo" },
  { subject: "Kiswahili", teacher: "Mwl. A. Kimaro" },
  { subject: "Physics", teacher: "Mwl. D. Mushi" },
  { subject: "Chemistry", teacher: "Mwl. Z. Ally" },
  { subject: "Biology", teacher: "Mwl. G. Urio" },
  { subject: "Geography", teacher: "Mwl. P. Lyimo" },
  { subject: "History", teacher: "Mwl. U. Materu" },
  { subject: "Civics", teacher: "Mwl. A. Mwangosi" },
  { subject: "Commerce", teacher: "Mwl. F. Shayo" },
]

export default function TimetablePage() {
  const { toast } = useToast()
  const [selectedClass, setSelectedClass] = useState("Standard 7")

  const handlePrint = () => {
    window.print()
    toast({ title: "Print Spooling", description: "Preparing institutional schedule for print." })
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-24 px-1 font-body">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full">
            <CalendarDays className="h-2.5 w-2.5 mr-1.5" /> Institutional Schedule 2026
          </Badge>
          <h1 className="text-xl sm:text-2xl font-headline font-black text-primary uppercase tracking-tight">Academic Timetable</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-none">Management of subject allocation and teacher nodes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-black text-[9px] uppercase">
            <Printer className="mr-2 h-4 w-4" /> Print Schedule
          </Button>
          <Button
            onClick={() => toast({ title: "Allocation Node Ready", description: "Select a free slot on the master grid to assign a teacher node." })}
            className="flex-1 sm:flex-none rounded-full colorful-gradient h-11 shadow-xl font-black text-[9px] uppercase tracking-widest px-8 group"
          >
            <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Assign Period
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-3 border-none shadow-xl bg-white/60 backdrop-blur-md rounded-[2.5rem] h-fit">
          <CardHeader className="bg-primary/5 border-b p-8">
            <CardTitle className="text-sm font-black uppercase tracking-widest">Global Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Target Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Standard 7">Standard 7</SelectItem>
                  <SelectItem value="Form 2">Form 2</SelectItem>
                  <SelectItem value="Form 4">Form 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Stream Hub</label>
              <Select defaultValue="A">
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="A">Stream A (Alpha)</SelectItem>
                  <SelectItem value="B">Stream B (Beta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t border-dashed">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-accent/5 text-accent border border-accent/10">
                <Zap className="h-5 w-5 fill-accent" />
                <div>
                  <p className="text-[9px] font-black uppercase">Schedule Sync</p>
                  <p className="text-[10px] font-bold">Live on Parent Portal</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-9 border-none shadow-2xl overflow-hidden bg-white/60 backdrop-blur-md rounded-[2.5rem]">
          <CardHeader className="bg-muted/30 p-8 border-b flex flex-row justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight">{selectedClass} Master Grid</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Official NECTA Curriculum Distribution</CardDescription>
            </div>
            <Badge className="bg-primary text-white border-none px-4 py-1 rounded-full font-black text-[9px] uppercase">Term 1 Node</Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted/10">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[9px] font-black uppercase">Time Slot</TableHead>
                  {DAYS.map(day => (
                    <TableHead key={day} className="text-[9px] font-black uppercase text-center">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERIODS.map((period, i) => (
                  <TableRow key={i} className={cn("group border-b last:border-none", period.isBreak ? "bg-primary/5" : "hover:bg-primary/[0.02]")}>
                    <TableCell className="pl-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-xs text-primary">{period.name}</span>
                        <span className="text-[9px] font-mono font-bold text-muted-foreground">{period.time}</span>
                      </div>
                    </TableCell>
                    {DAYS.map((day, dayIndex) => {
                      const slot = SUBJECT_TEACHERS[(dayIndex * 3 + i) % SUBJECT_TEACHERS.length]
                      return (
                        <TableCell key={day} className="text-center p-2">
                          {period.isBreak ? (
                            <span className="text-[8px] font-black text-primary/40 uppercase tracking-[0.3em]">{period.name}</span>
                          ) : (
                            <div className="p-3 rounded-xl bg-white border border-muted shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
                              <p className="text-[10px] font-black text-foreground/80 uppercase">{slot.subject}</p>
                              <p className="text-[8px] font-bold text-muted-foreground uppercase flex items-center justify-center gap-1 mt-1">
                                <User className="h-2 w-2" /> {slot.teacher}
                              </p>
                            </div>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
