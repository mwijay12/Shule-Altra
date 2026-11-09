
"use client"

import * as React from "react"
import { useState, useRef } from "react"
import {
  Bus,
  MapPin,
  Users,
  ShieldCheck,
  Clock,
  Search,
  Plus,
  ArrowRight,
  User,
  Fuel,
  History,
  AlertTriangle,
  QrCode,
  Smartphone,
  CheckCircle2,
  Zap,
  Globe,
  Navigation,
  Loader2,
  Phone
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { FleetLoad, ChartPanel } from "@/components/admin/module-charts"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, doc, serverTimestamp, addDoc } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { triggerN8nWebhook } from "@/lib/n8n"

export default function TransportPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDispatching, setIsDispatching] = useState(false)
  const [isAddingRoute, setIsAddingRoute] = useState(false)

  const routesQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "routes")), [db])
  const { data: firestoreRoutes, isLoading } = useCollection(routesQuery)

  const routes = firestoreRoutes || []

  const fleetPayload = (routes as any[]).reduce((sum, route) => sum + (route.students || 0), 0)

  const handleBatchDispatch = async (routeName: string) => {
    setIsDispatching(true)
    // This is a transport event, not an attendance one, and the webhook tells us
    // whether it actually accepted the payload.
    const forwarded = await triggerN8nWebhook("transport-dispatch", {
      route: routeName,
      status: "Dispatched",
      msg: `Route ${routeName} marked as dispatched.`
    })
    setIsDispatching(false)
    toast({
      title: "Route dispatched",
      description: forwarded
        ? `${routeName} forwarded to the automation webhook.`
        : `${routeName} marked dispatched. Automation is off, so no alert was sent.`,
    })
  }

  const handleAddRoute = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newRoute = {
      name: formData.get("name") as string,
      driver: formData.get("driver") as string,
      phone: formData.get("phone") as string,
      vehicle: formData.get("vehicle") as string,
      status: "Standby",
      createdAt: serverTimestamp()
    }
    addDocumentNonBlocking(collection(db, "schools", "school-001", "routes"), newRoute)
    setIsAddingRoute(false)
    toast({ title: "Route added", description: `${newRoute.name} is now on the fleet list.` })
  }

  return (
    <div className="space-y-6 max-w-full mx-auto pb-24 px-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            School transport · 2026
          </Badge>
          <h1 className="text-xl sm:text-2xl font-semibold text-primary">Transport</h1>
          <p className="text-muted-foreground text-[13px] font-bold leading-none">Management of Day Student transit and fleet safety.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-semibold text-[13px]">
            <QrCode className="mr-2 h-4 w-4" /> Verify Student
          </Button>

          <Dialog open={isAddingRoute} onOpenChange={setIsAddingRoute}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none rounded-full h-11 px-8 colorful-gradient shadow-lg font-semibold text-[13px] group">
                <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Register Route
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-md border-none shadow-2xl">
              <DialogHeader className="bg-primary/5 p-8 border-b text-center">
                <DialogTitle className="text-xl font-semibold text-primary">New route</DialogTitle>
                <DialogDescription className="text-[13px] font-bold">Register a new transit path and driver.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRoute} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Route Name (Area)</Label>
                  <Input name="name" placeholder="e.g. Mbezi - Tegeta" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Lead Driver</Label>
                    <Input name="driver" placeholder="Full Name" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Driver Phone</Label>
                    <Input name="phone" placeholder="07XX XXX XXX" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Vehicle Registration</Label>
                  <Input name="vehicle" placeholder="e.g. T 442 ABC" required className="h-12 rounded-xl bg-muted/20 border-none font-mono font-semibold px-5" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-2xl">Save route</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 px-1">
        {[
          { label: "Fleet Ready", value: routes.filter((r: any) => r.status === "Active" && r.vehicle).length, suffix: " Buses", sub: "Operational", icon: Bus, tone: "primary" as const },
          { label: "Active Routes", value: routes.filter((r: any) => r.status === "Active").length, sub: "In Transit", icon: Navigation, tone: "accent" as const },
          { label: "Safety Score", value: 100, suffix: "%", sub: "Audit Passed", icon: ShieldCheck, tone: "emerald" as const },
          { label: "Day Students", value: fleetPayload, sub: "Fleet Payload", icon: Users, tone: "amber" as const },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
      </div>

      <ChartPanel title="Seat load per route" hint="Learners assigned against the seats available" className="mx-1" data-reveal>
        <FleetLoad routes={routes ?? []} />
      </ChartPanel>

      <Card className="border-none shadow-xl overflow-hidden bg-card/60 rounded-[2.5rem] mx-1">
        <CardHeader className="bg-muted/30 p-6 sm:p-8 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">Institutional Routes</CardTitle>
            <CardDescription className="text-[12px] font-bold text-primary/60">Fleet dispatch & batch parent notifications</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search route..."
              className="pl-10 h-10 rounded-full border-none bg-white shadow-inner font-bold text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <Loader2 className="animate-spin h-10 w-10 text-primary" />
              <p className="text-[13px] font-semibold text-muted-foreground">Loading routes…</p>
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/10">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[12px] font-semibold">Route</TableHead>
                  <TableHead className="text-[12px] font-semibold">Lead Personnel</TableHead>
                  <TableHead className="text-[12px] font-semibold">Day Learners</TableHead>
                  <TableHead className="text-[12px] font-semibold text-center">Status</TableHead>
                  <TableHead className="text-right pr-8 text-[12px] font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="sd-stagger-rows">
                {routes.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((route) => (
                  <TableRow key={route.id} className="group hover:bg-primary/[0.02] border-b last:border-none transition-colors">
                    <TableCell className="pl-8 py-5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground/80 group-hover:text-primary transition-colors">{route.name}</span>
                        <span className="text-[12px] font-mono font-semibold text-muted-foreground">{route.vehicle}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><User className="h-4 w-4" /></div>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{route.driver}</span>
                          <span className="text-[12px] text-muted-foreground font-medium">{route.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-28 space-y-2">
                        <p className="text-[13px] font-semibold"><AnimatedNumber value={route.students || 0} /> / <AnimatedNumber value={route.capacity || 0} /> seats</p>
                        <Progress value={route.capacity ? ((route.students || 0) / route.capacity) * 100 : 0} aria-label={`${route.name} occupancy`} className="h-1.5 bg-muted/40" indicatorClassName="bg-primary" />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "text-[11px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border-none",
                        route.status === "Active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      )}>{route.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleBatchDispatch(route.name)}
                          disabled={isDispatching}
                          className="h-9 px-4 rounded-full font-semibold text-[12px] bg-primary hover:bg-primary/90 text-white shadow-md"
                        >
                          {isDispatching ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Navigation className="h-3 w-3 mr-2" />}
                          Batch Alert
                        </Button>
                        <Button variant="ghost" className="h-9 px-4 rounded-full font-semibold text-[12px] text-primary hover:bg-primary/5">Details</Button>
                      </div>
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
