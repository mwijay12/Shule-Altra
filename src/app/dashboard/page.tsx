
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Users, 
  Banknote, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  Sparkles,
  StickyNote,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
  BellRing,
  Building2,
  Layers,
  Zap,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Globe
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import AnimatedContent from "@/components/ui/animated-content"
import { useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase"
import { doc, collection, query } from "firebase/firestore"

const Target = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
)

const emptyData = [
  { name: "Jan", attendance: 0, fees: 0 },
  { name: "Feb", attendance: 0, fees: 0 },
  { name: "Mar", attendance: 0, fees: 0 },
  { name: "Apr", attendance: 0, fees: 0 },
  { name: "May", attendance: 0, fees: 0 },
  { name: "Jun", attendance: 0, fees: 0 },
]

const demoData = [
  { name: "Jan", attendance: 92, fees: 45 },
  { name: "Feb", attendance: 95, fees: 52 },
  { name: "Mar", attendance: 91, fees: 48 },
  { name: "Apr", attendance: 98, fees: 61 },
  { name: "May", attendance: 94, fees: 55 },
  { name: "Jun", attendance: 96, fees: 72 },
]

export default function DashboardPage() {
  const [note, setNote] = useState("")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const db = useFirestore()

  const identityRef = useMemoFirebase(() => doc(db, "schools", "school-001", "config", "identity"), [db])
  const { data: identity } = useDoc(identityRef)

  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students")), [db])
  const { data: students } = useCollection(studentsQuery)

  const isDemo = identity?.demoMode === true

  const registry = (students || []) as Array<{ totalPaid?: number; balance?: number; attendanceStatus?: string }>
  const totalPaid = registry.reduce((sum, student) => sum + (student.totalPaid || 0), 0)
  const totalOutstanding = registry.reduce((sum, student) => sum + (student.balance || 0), 0)
  const presentCount = registry.filter((student) => student.attendanceStatus !== 'Absent').length
  const attendanceRate = registry.length > 0 ? (presentCount / registry.length) * 100 : 0
  const revenueMillions = (totalPaid / 1_000_000).toFixed(1)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const handleSyncNode = () => {
    setIsSyncing(true)
    setTimeout(() => setIsSyncing(false), 2000)
  }

  const stats = [
    {
      title: "Population Node",
      value: registry.length > 0 ? registry.length.toLocaleString() : "0",
      description: registry.length > 0 ? "Live Registry Count" : "Awaiting Enrollment",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/5",
    },
    {
      title: "Syllabus Coverage",
      value: isDemo ? "78.4%" : "0.0%",
      description: isDemo ? "National Average" : "Curriculum Pulse",
      icon: Target,
      color: "text-purple-600",
      bg: "bg-purple-100/50",
    },
    {
      title: "Institutional Revenue",
      value: `${revenueMillions}M`,
      description: totalOutstanding > 0 ? `TZS ${Math.round(totalOutstanding / 1_000_000)}M Outstanding` : "Fully Reconciled",
      icon: Banknote,
      color: "text-green-600",
      bg: "bg-green-100/50",
    },
    {
      title: "Attendance Rate",
      value: `${attendanceRate.toFixed(1)}%`,
      description: presentCount > 0 ? "Daily Check-in Node" : "Register Not Started",
      icon: TrendingUp,
      color: "text-orange-600",
      bg: "bg-orange-100/50",
    },
  ]

  return (
    <div className={cn("space-y-8 transition-all duration-700 pb-24 px-1", isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10 w-fit">
            <Building2 className="h-3 w-3" /> Institutional Node Active
          </div>
          <h1 className="text-xl sm:text-2xl font-headline font-black text-primary tracking-tight uppercase">
            Management Pulse {isDemo && <Badge className="ml-2 bg-accent text-white border-none">DEMO</Badge>}
          </h1>
          <p className="text-muted-foreground font-bold text-[9px] uppercase tracking-widest leading-none">Global institutional insights for the 2026 academic season.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleSyncNode}
            disabled={isSyncing}
            className="flex-1 sm:flex-none rounded-full h-11 border-primary/20 text-primary font-black text-[9px] uppercase tracking-widest bg-white shadow-sm"
          >
            {isSyncing ? <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Globe className="mr-2 h-3.5 w-3.5" />}
            {isSyncing ? "SYNCING NODE" : "SOVEREIGN SYNC"}
          </Button>
          <Button size="sm" className="flex-1 sm:flex-none rounded-full h-11 colorful-gradient font-black text-[10px] uppercase tracking-widest shadow-xl group">
            <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> AI Performance Hub
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <AnimatedContent key={stat.title} delay={i * 0.1} distance={20}>
            <Card className="group border-none shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden bg-white/60 backdrop-blur-md h-full rounded-[2rem]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.title}</CardTitle>
                <div className={cn(stat.bg, "p-2.5 rounded-2xl group-hover:scale-110 transition-transform")}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-black tracking-tight">{stat.value}</div>
                <p className="text-[8px] font-black text-muted-foreground/60 uppercase mt-2 flex items-center gap-1.5 tracking-tighter">
                  {stat.description.includes('+') ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  ) : (
                    <Clock className="h-3 w-3 text-primary" />
                  )}
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </AnimatedContent>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <AnimatedContent distance={30}>
            <Card className="border-none shadow-2xl bg-card/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-8 bg-muted/20 border-b">
                <div>
                  <CardTitle className="text-lg font-black uppercase">Financial Trajectory</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Revenue assurance via ClickPesa Gateway</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[9px] uppercase px-4 py-1 rounded-full">
                  TZS MILLIONS
                </Badge>
              </CardHeader>
              <CardContent className="h-[350px] p-8 pt-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={isDemo ? demoData : emptyData}>
                    <defs>
                      <linearGradient id="colorFees" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1F5BA6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#1F5BA6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                    <RechartsTooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }} />
                    <Area type="monotone" dataKey="fees" stroke="#1F5BA6" strokeWidth={4} fillOpacity={1} fill="url(#colorFees)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </AnimatedContent>

          <div className="grid sm:grid-cols-2 gap-4">
             <AnimatedContent direction="horizontal" distance={20} delay={0.2}>
               <Card className="border-none shadow-xl bg-accent/5 overflow-hidden group hover:shadow-2xl transition-all p-8 rounded-[2.5rem]">
                  <div className="flex flex-col h-full justify-between gap-8">
                     <div>
                       <Badge className="bg-accent text-white font-black text-[9px] px-4 py-1 rounded-full mb-4 uppercase tracking-widest shadow-lg">NECTA SYNC</Badge>
                       <h3 className="text-xl font-black text-accent tracking-tighter uppercase leading-none">{isDemo ? "98.4%" : "0.0%"} Accuracy</h3>
                       <p className="text-[10px] font-bold text-accent/60 mt-3 uppercase tracking-widest leading-relaxed">Official PReMS nodes verified for the current assessment cycle.</p>
                     </div>
                     <Button variant="ghost" className="w-fit text-accent font-black text-[10px] uppercase tracking-[0.2em] p-0 h-auto hover:bg-transparent group">
                       View Official Logs <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                     </Button>
                  </div>
               </Card>
             </AnimatedContent>
             <AnimatedContent direction="horizontal" distance={20} delay={0.3} reverse>
               <Card className="border-none shadow-xl bg-primary/5 overflow-hidden group hover:shadow-2xl transition-all p-8 rounded-[2.5rem]">
                  <div className="flex flex-col h-full justify-between gap-8">
                     <div>
                       <Badge className="bg-primary text-white font-black text-[9px] px-4 py-1 rounded-full mb-4 uppercase tracking-widest shadow-lg">HOSTEL HUB</Badge>
                       <h3 className="text-xl font-black text-primary tracking-tighter uppercase leading-none">{isDemo ? "Utility Healthy" : "Syncing Status"}</h3>
                       <p className="text-[10px] font-bold text-primary/60 mt-3 uppercase tracking-widest leading-relaxed">LUKU and Water nodes monitored across institutional blocks.</p>
                     </div>
                     <Button variant="ghost" className="w-fit text-primary font-black text-[10px] uppercase tracking-[0.2em] p-0 h-auto hover:bg-transparent group">
                       Manage Housing <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                     </Button>
                  </div>
               </Card>
             </AnimatedContent>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <AnimatedContent distance={20} delay={0.4}>
            <Card className="border-none shadow-xl bg-destructive/5 border border-destructive/10 relative overflow-hidden group rounded-[2.5rem]">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                <AlertCircle className="h-20 w-24" />
              </div>
              <CardHeader className="pb-2 p-8">
                <CardTitle className="text-sm flex items-center gap-3 text-destructive font-black uppercase tracking-tight">
                  <Zap className="h-5 w-5 fill-destructive" /> AI Early Warning
                </CardTitle>
                <CardDescription className="text-destructive/60 font-black text-[9px] uppercase tracking-widest mt-1">NECTA Prediction Alert Node</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <div className="p-4 rounded-2xl bg-white/80 border border-destructive/10 shadow-sm">
                  <p className="text-[10px] font-black text-destructive uppercase tracking-widest mb-1">Critical Insight:</p>
                  <p className="text-xs font-bold text-foreground/70 leading-relaxed uppercase tracking-tighter">
                    {isDemo 
                      ? "15 Students are at risk of NECTA DIV IV/0 based on current trends." 
                      : "Initialize student performance nodes to enable AI risk detection."}
                  </p>
                </div>
                <Button size="sm" variant="destructive" className="w-full rounded-2xl shadow-lg font-black h-12 text-[10px] uppercase tracking-widest">
                  Deploy Remedial Plan
                </Button>
              </CardContent>
            </Card>
          </AnimatedContent>

          <AnimatedContent distance={20} delay={0.5}>
            <Card className="border-none shadow-xl bg-yellow-50/50 border-yellow-100 relative overflow-hidden group rounded-[2.5rem]">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                <StickyNote className="h-20 w-24" />
              </div>
              <CardHeader className="pb-2 p-8">
                <CardTitle className="text-sm flex items-center gap-3 text-yellow-800 font-black uppercase tracking-tight">
                  <StickyNote className="h-5 w-5" /> Admin Scratchpad
                </CardTitle>
                <CardDescription className="text-yellow-700/60 font-black text-[9px] uppercase tracking-widest mt-1">Operational Quick Entry</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-4">
                <Textarea 
                  placeholder="Prepare official institutional report..." 
                  className="bg-white/50 border-yellow-200 focus-visible:ring-yellow-400 min-h-[120px] resize-none text-xs font-bold placeholder:text-yellow-900/30 rounded-2xl shadow-inner px-5 py-4 border-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white rounded-2xl shadow-xl font-black h-12 text-[10px] uppercase tracking-widest">
                  <Send className="mr-2 h-4 w-4" /> Save Ledger Note
                </Button>
              </CardContent>
            </Card>
          </AnimatedContent>

          <AnimatedContent distance={20} delay={0.6}>
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
              <CardHeader className="pb-2 bg-accent/5 border-b border-accent/10 p-8">
                <CardTitle className="text-sm flex items-center gap-3 font-black uppercase tracking-tight">
                  <BellRing className="h-5 w-5 text-accent" /> Institutional Pulse
                </CardTitle>
                <CardDescription className="text-[9px] font-black uppercase tracking-widest mt-1">Live administrative gateway actions</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {isDemo ? [
                    { user: "H.M.", action: "Authorized Fee Batch", time: "12m ago", icon: CheckCircle2, color: "text-green-500" },
                    { user: "Academics", action: "Syllabus Coverage Audit", time: "45m ago", icon: ShieldCheck, color: "text-primary" },
                    { user: "Warden", action: "LUKU Node Recharged", time: "1h ago", icon: Zap, color: "text-yellow-500" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group cursor-pointer transition-transform hover:translate-x-1">
                      <div className={cn("p-2.5 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors shadow-inner", item.color)}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-black text-foreground/80 uppercase tracking-tighter truncate">{item.user}</p>
                        <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">{item.action}</p>
                      </div>
                      <span className="text-[9px] font-mono font-black text-muted-foreground shrink-0">{item.time}</span>
                    </div>
                  )) : (
                    <div className="py-10 text-center opacity-30 flex flex-col items-center gap-2">
                      <Clock className="h-10 w-10 text-muted-foreground" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">No Recent Activity</p>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="w-full text-[9px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 rounded-full h-11 mt-2 border border-transparent hover:border-primary/10">
                    Audit Ledger <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedContent>
        </div>
      </div>
    </div>
  )
}
