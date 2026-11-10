"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  User,
  Download,
  Loader2,
  Clock,
  FileCheck2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card";
import { ChartPanel, WeekUtilisation } from "@/components/admin/module-charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  buildTimetable,
  summarizeTimetable,
  TIMETABLE_CLASSES,
  TIMETABLE_STREAMS,
} from "@/lib/timetable"

export default function TimetablePage() {
  const { toast } = useToast()
  const [selectedClass, setSelectedClass] = useState("Form 2")
  const [stream, setStream] = useState("A")
  const [isExporting, setIsExporting] = useState(false)

  const timetable = useMemo(
    () => buildTimetable(selectedClass, stream, { term: "Term 2 · 2026" }),
    [selectedClass, stream]
  )

  const summary = summarizeTimetable(timetable)
  const teachingSlots = summary.teaching

  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      const { downloadTimetablePdf } = await import("@/lib/pdf/timetable")
      await downloadTimetablePdf(timetable)
      toast({
        title: "Timetable PDF generated",
        description: `${selectedClass} · Stream ${stream} · landscape A4, vector text.`,
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not build the timetable PDF.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-24 px-1 font-body">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            <CalendarDays className="h-2.5 w-2.5 mr-1.5" /> Example schedule · not saved
          </Badge>
          <h1 className="text-xl sm:text-2xl font-headline font-semibold text-primary tracking-tight">Academic Timetable</h1>
          <p className="text-muted-foreground text-[13px] font-bold leading-none">
            <AnimatedNumber value={teachingSlots} /> teaching periods in this generated example · not checked for clashes across classes
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-card shadow-sm font-semibold text-[12px]"
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {isExporting ? "Building PDF" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 px-1">
        <StatCard index={0} label="Teaching periods" value={teachingSlots} icon={Clock} tone="primary" sub={`${timetable.className} · Stream ${timetable.stream}`} />
        <StatCard index={1} label="Subjects taught" value={timetable.subjectLoad.filter((s) => s.periods > 0).length} icon={FileCheck2} tone="accent" sub="On this class timetable" />
        <StatCard index={2} label="Teachers assigned" value={new Set(timetable.subjectLoad.map((s) => s.teacher).filter(Boolean)).size} icon={User} tone="emerald" sub="Distinct teachers on the grid" />
        <StatCard index={3} label="Free periods" value={summary.free} icon={CalendarDays} tone="slate" sub={`${summary.breaks} scheduled break slots excluded`} />
      </div>

      <ChartPanel
        title="How full is the week"
        hint={`${timetable.className} · Stream ${timetable.stream} · ${timetable.term}`}
        className="mx-1"
        data-reveal
      >
        <WeekUtilisation timetable={timetable} />
      </ChartPanel>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-3 border border-border/60 shadow-xl bg-card/70 rounded-[2.5rem] h-fit">
          <CardHeader className="bg-primary/5 border-b border-border/60 p-8">
            <CardTitle className="text-sm font-semibold">Global Filters</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground ml-1">Target Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TIMETABLE_CLASSES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-muted-foreground ml-1">Stream</label>
              <Select value={stream} onValueChange={setStream}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {TIMETABLE_STREAMS.map((option) => (
                    <SelectItem key={option} value={option}>
                      Stream {option} ({option === "A" ? "Alpha" : "Beta"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-dashed border-border/60 space-y-3">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Generated example only. Teachers and rooms are not checked against other classes; assignments are not saved.
              </p>
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 text-emerald-600 border border-emerald-500/10">
                <FileCheck2 className="h-5 w-5" />
                <div>
                  <p className="text-[12px] font-semibold">Print engine</p>
                  <p className="text-[13px] font-bold">Vector PDF · landscape A4</p>
                </div>
              </div>
            </div>


          </CardContent>
        </Card>

        <Card className="lg:col-span-9 border border-border/60 shadow-2xl overflow-hidden bg-card/70 rounded-[2.5rem]">
          <CardHeader className="bg-muted/30 p-8 border-b border-border/60 flex flex-row justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="text-xl font-semibold tracking-tight">
                {selectedClass} · Stream {stream}
              </CardTitle>
              <CardDescription className="text-[13px] font-bold text-primary/60">
                Generated example · not an official or clash-checked timetable
              </CardDescription>
            </div>
            <Badge className="bg-primary text-white border-none px-4 py-1 rounded-full font-semibold text-[12px]">
              {timetable.term}
            </Badge>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-muted/10">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[12px] font-semibold">Time slot</TableHead>
                  {timetable.days.map((day) => (
                    <TableHead key={day} className="text-[12px] font-semibold text-center">{day}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetable.periods.map((period, periodIndex) => (
                  <TableRow
                    key={period.id}
                    className={cn("group border-b border-border/50 last:border-none", period.isBreak ? "bg-primary/5" : "hover:bg-primary/[0.02]")}
                  >
                    <TableCell className="pl-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-primary">{period.label}</span>
                        <span className="text-[12px] font-mono font-bold text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" /> {period.time}
                        </span>
                      </div>
                    </TableCell>
                    {timetable.days.map((day, dayIndex) => {
                      const slot = timetable.grid[periodIndex]?.[dayIndex]
                      return (
                        <TableCell key={day} className="text-center p-2">
                          {period.isBreak ? (
                            <span className="text-[11px] font-semibold text-primary/40">{period.label}</span>
                          ) : slot ? (
                            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                              <p className="text-[13px] font-semibold text-foreground">{slot.subject}</p>
                              <p className="text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1 mt-1">
                                <User className="h-2 w-2" /> {slot.teacher}
                              </p>
                              <p className="text-[11px] font-bold text-primary/70 mt-0.5">{slot.room}</p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
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
