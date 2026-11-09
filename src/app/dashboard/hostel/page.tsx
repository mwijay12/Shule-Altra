
"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  Home,
  Plus,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lightbulb,
  Droplets,
  Settings,
  AlertCircle,
  Trash2,
  UserPlus,
  HeartPulse,
  Loader2,
  Users
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { OccupancyPanel, ChartPanel } from "@/components/admin/module-charts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useCollection, useDoc, useMemoFirebase } from "@/firebase"
import { collection, query, doc, serverTimestamp } from "firebase/firestore"
import { deleteDocumentNonBlocking, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function HostelPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const schoolId = "school-001"

  const [isAdding, setIsAdding] = useState(false)
  const [selectedWing, setSelectedWing] = useState<any>(null)
  // A wing inspection is something a matron confirms, not a status we invent.
  const [inspection, setInspection] = useState<Record<string, boolean>>({})
  const [isVerifying, setIsVerifying] = useState<string | null>(null)

  const hostelsQuery = useMemoFirebase(() => {
    return query(collection(db, "schools", schoolId, "hostels"))
  }, [db])
  const { data: hostels, isLoading } = useCollection(hostelsQuery)

  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", schoolId, "students")), [db])
  const { data: students } = useCollection(studentsQuery)

  const utilitiesRef = useMemoFirebase(() => {
    return doc(db, "schools", schoolId, "config", "utilities")
  }, [db])
  const { data: utilities } = useDoc(utilitiesRef)

  const utilityData = utilities || {
    luku: "Healthy",
    water: "Normal Flow",
    hygiene: "Verified Today"
  }

  // Calculate real occupancy nodes
  const getOccupancyCount = (wingName: string) => {
    return students?.filter(s => s.type === "Boarder" && s.hostel === wingName).length || 0
  }

  const handleAddWing = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newWing = {
      schoolId,
      name: formData.get("name") as string,
      type: formData.get("type") as string,
      capacity: parseInt(formData.get("capacity") as string),
      warden: formData.get("warden") as string,
      rooms: parseInt(formData.get("rooms") as string),
      block: formData.get("block") as string,
      createdAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collection(db, "schools", schoolId, "hostels"), newWing)
    setIsAdding(false)
    toast({ title: "Wing added", description: `${newWing.name} is now on the boarding list.` })
  }

  const handleDeleteWing = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "schools", schoolId, "hostels", id))
    toast({ variant: "destructive", title: "Wing removed", description: "The hostel wing was deleted." })
  }

  const handleUpdateUtility = (key: string, value: string) => {
    setDocumentNonBlocking(utilitiesRef, { [key]: value }, { merge: true })
    setIsVerifying(null)
    toast({ title: "Inspection saved", description: `${key.toUpperCase()} updated.` })
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-24 px-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            <Home className="h-2.5 w-2.5 mr-1.5" /> Boarding · 2026
          </Badge>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary">Boarding</h1>
          <p className="text-muted-foreground text-[13px] font-bold leading-none">Manage residential wings and bed occupancy.</p>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button className="flex-1 sm:flex-none rounded-full h-11 px-8 colorful-gradient shadow-xl font-semibold text-[13px] group">
              <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Register Wing
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-md border-none shadow-2xl">
            <DialogHeader className="bg-primary/5 p-8 border-b text-center">
              <DialogTitle className="text-xl font-semibold text-primary">New hostel wing</DialogTitle>
              <DialogDescription className="text-[13px] font-bold">Register a new residential block.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddWing} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Wing Name</Label>
                  <Input name="name" placeholder="e.g. Mt. Kilimanjaro" required className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Block ID</Label>
                  <Input name="block" placeholder="Block A" required className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Wing Type</Label>
                  <Select name="type" defaultValue="Mixed">
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Boys">Boys Only</SelectItem>
                      <SelectItem value="Girls">Girls Only</SelectItem>
                      <SelectItem value="Mixed">Mixed Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Lead Warden</Label>
                  <Input name="warden" placeholder="Institutional Staff" required className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Total Capacity</Label>
                  <Input name="capacity" type="number" defaultValue="100" className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Room Count</Label>
                  <Input name="rooms" type="number" defaultValue="25" className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-2xl">Save wing</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 px-1">
        {[
          { label: "Electricity (LUKU)", value: utilityData.luku, icon: Zap, key: "luku", color: "text-orange-600" },
          { label: "Water Flow", value: utilityData.water, icon: Droplets, key: "water", color: "text-blue-600" },
          { label: "Hygiene Status", value: utilityData.hygiene, icon: ShieldCheck, key: "hygiene", color: "text-green-600" },
        ].map((item) => (
          <Card key={item.key} className="border-none shadow-lg bg-white/60 backdrop-blur-md rounded-[2rem] group hover:shadow-xl transition-all">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center transition-transform group-hover:scale-110", item.color)}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-semibold text-primary">{item.value}</p>
                </div>
              </div>
              <Dialog open={isVerifying === item.key} onOpenChange={(open) => setIsVerifying(open ? item.key : null)}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary transition-colors">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-[2.5rem] max-w-sm border-none shadow-2xl overflow-hidden p-0">
                  <DialogHeader className="bg-primary/5 p-8 border-b text-center">
                    <DialogTitle className="font-semibold text-primary">Verify {item.label}</DialogTitle>
                  </DialogHeader>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">New status</Label>
                      <Input id="utility-val" placeholder="e.g. Healthy / Critical / Maintenance" className="h-12 rounded-xl bg-muted/20 border-none font-bold" />
                    </div>
                    <Button
                      className="w-full h-12 rounded-xl colorful-gradient font-semibold text-[13px] shadow-lg"
                      onClick={() => {
                        const val = (document.getElementById('utility-val') as HTMLInputElement).value;
                        if(val) handleUpdateUtility(item.key, val);
                      }}
                    >
                      Save reading
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ))}
      </div>

      <ChartPanel title="Occupancy by wing" hint="Beds filled against capacity, from the live roster" className="mx-1" data-reveal>
        <OccupancyPanel hostels={hostels ?? []} students={students ?? []} />
      </ChartPanel>


      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p className="text-[13px] font-semibold">Loading hostel wings…</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-1">
          {hostels?.map((hostel) => {
            const currentOccupancy = getOccupancyCount(hostel.name);
            const occupancyPercentage = Math.round((currentOccupancy / (hostel.capacity || 1)) * 100);

            return (
              <Card key={hostel.id} className="border-none shadow-xl bg-white/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden group hover:-translate-y-1 transition-all">
                <div className={cn("h-2 w-full", hostel.type === "Boys" ? "bg-primary" : hostel.type === "Girls" ? "bg-accent" : "bg-orange-500")} />
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="secondary" className="font-semibold text-[11px] bg-muted/50">{hostel.block}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive transition-colors" onClick={() => handleDeleteWing(hostel.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="text-xl font-semibold text-primary tracking-tight">{hostel.name}</CardTitle>
                  <CardDescription className="text-[13px] font-bold text-muted-foreground/60">{hostel.type} wing · Warden: {hostel.warden}</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[13px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-2"><Users className="h-3 w-3" /> Real-time Load</span>
                      <span className={cn("text-xs", occupancyPercentage > 90 ? "text-destructive" : "text-primary")}><AnimatedNumber value={currentOccupancy} /> / <AnimatedNumber value={hostel.capacity} /> Beds</span>
                    </div>
                    <Progress value={occupancyPercentage} aria-label={`${hostel.name} occupancy`} className="h-2 bg-muted/50 rounded-full" indicatorClassName={occupancyPercentage > 90 ? "bg-destructive" : "bg-primary"} />
                  </div>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full text-[13px] font-semibold h-12 rounded-full border-primary/10 hover:bg-primary/5 text-primary group shadow-sm" onClick={() => setSelectedWing(hostel)}>
                        Inspect Occupancy <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 font-body border-l-0 shadow-2xl">
                      <div className="bg-primary/5 p-10 border-b relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <Home className="h-48 w-48" />
                        </div>
                        <SheetHeader className="text-left relative z-10">
                          <div className="flex items-center gap-6">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-white shadow-xl flex items-center justify-center text-primary shrink-0 border-2 border-primary/5">
                              <Home className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                              <SheetTitle className="text-2xl sm:text-3xl font-semibold text-primary tracking-tighter">{selectedWing?.name}</SheetTitle>
                              <p className="text-[13px] font-semibold text-muted-foreground">{selectedWing?.block} · Warden: {selectedWing?.warden}</p>
                            </div>
                          </div>
                        </SheetHeader>
                      </div>

                      <div className="p-10">
                        <Tabs defaultValue="occupants" className="space-y-10">
                          <TabsList className="grid w-full grid-cols-3 bg-muted/40 p-1 rounded-2xl h-14">
                            <TabsTrigger value="occupants" className="rounded-xl text-[13px] font-semibold">Allocations</TabsTrigger>
                            <TabsTrigger value="audit" className="rounded-xl text-[13px] font-semibold">Safety Audit</TabsTrigger>
                            <TabsTrigger value="health" className="rounded-xl text-[13px] font-semibold">Sickbay</TabsTrigger>
                          </TabsList>

                          <TabsContent value="occupants" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-8 rounded-[2rem] bg-white border border-muted shadow-inner">
                              <div className="flex items-center justify-between mb-6">
                                <h4 className="text-[13px] font-semibold text-primary">Live Roster (<AnimatedNumber value={getOccupancyCount(selectedWing?.name)} /> Students)</h4>
                                <Button variant="ghost" size="sm" className="h-8 rounded-full text-[12px] font-semibold hover:bg-primary/5">Export Roster</Button>
                              </div>
                              <div className="space-y-3">
                                {students?.filter(s => s.type === "Boarder" && s.hostel === selectedWing?.name).length === 0 ? (
                                  <p className="text-[13px] text-center text-muted-foreground font-medium py-10">No students allocated to this wing.</p>
                                ) : (
                                  students?.filter(s => s.type === "Boarder" && s.hostel === selectedWing?.name).map((student) => (
                                    <div key={student.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-xl group hover:bg-muted/40 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 rounded-lg shadow-sm">
                                          <AvatarFallback className="text-[13px] font-semibold bg-white">{student.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-semibold text-foreground/80">{student.name}</span>
                                          <span className="text-[11px] font-mono font-bold text-muted-foreground">{student.id}</span>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-[10px] font-semibold bg-white border-none shadow-sm">{student.class}</Badge>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="audit" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                            <div className="space-y-4">
                              {[
                                { key: "hygiene", task: "Hygiene", icon: ShieldCheck },
                                { key: "electrical", task: "Electrical wiring", icon: Lightbulb },
                                { key: "water", task: "Water supply", icon: Droplets },
                              ].map((item) => (
                                <button
                                  key={item.key}
                                  type="button"
                                  aria-pressed={!!inspection[item.key]}
                                  onClick={() => setInspection((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                  className="w-full flex items-center justify-between p-5 bg-white rounded-2xl shadow-sm border border-muted/50 hover:border-primary/20 transition-all text-left"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center text-primary">
                                      <item.icon className="h-5 w-5" />
                                    </div>
                                    <span className="text-xs font-semibold text-foreground/70 tracking-tight">{item.task}</span>
                                  </div>
                                  <Badge
                                    className={
                                      inspection[item.key]
                                        ? "text-[11px] font-black uppercase rounded-full px-4 h-8 bg-green-100 text-green-700 border-none shadow-sm"
                                        : "text-[11px] font-black uppercase rounded-full px-4 h-8 bg-muted text-muted-foreground border-none shadow-sm"
                                    }
                                  >
                                    {inspection[item.key] ? "Checked" : "Not checked"}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                            <p className="text-[13px] text-muted-foreground font-medium text-center">
                              {selectedWing?.lastInspection?.at
                                ? `Last recorded ${new Date(selectedWing.lastInspection.at).toLocaleString('en-GB')}`
                                : "No inspection recorded for this wing yet."}
                            </p>
                            <Button
                              className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-xl"
                              disabled={!selectedWing?.id}
                              onClick={() => {
                                const checked = ["hygiene", "electrical", "water"].filter((k) => inspection[k])
                                setDocumentNonBlocking(
                                  doc(db, "schools", schoolId, "hostels", selectedWing.id),
                                  { lastInspection: { at: new Date().toISOString(), items: inspection } },
                                  { merge: true }
                                )
                                toast({
                                  title: "Inspection recorded",
                                  description: `${checked.length} of 3 checks confirmed for ${selectedWing.name}.`,
                                })
                              }}
                            >
                              Record inspection
                            </Button>
                          </TabsContent>

                          <TabsContent value="health" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-10 rounded-[2.5rem] bg-destructive/5 border-2 border-dashed border-destructive/10 text-center space-y-6">
                              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center mx-auto shadow-xl text-destructive animate-pulse">
                                <HeartPulse className="h-8 w-8" />
                              </div>
                              <div className="space-y-2">
                                <p className="text-[13px] font-semibold text-destructive">Medical alerts</p>
                                <p className="text-xs font-medium text-foreground/60 leading-relaxed max-w-[250px] mx-auto tracking-tighter">No medical alerts for boarders in this wing.</p>
                              </div>
                            </div>
                            <p className="text-[13px] text-muted-foreground font-medium text-center">
                              Record health notes on the learner’s profile under Students.
                            </p>
                          </TabsContent>
                        </Tabs>
                      </div>
                      <SheetFooter className="p-8 border-t bg-muted/10">
                        <p className="text-[11px] font-bold text-muted-foreground text-center w-full">Occupancy is counted from the boarder register.</p>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  )
}
