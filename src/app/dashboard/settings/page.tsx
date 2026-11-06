"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Building2, 
  Save,
  Upload,
  ShieldCheck,
  Loader2,
  Zap,
  Network,
  Database,
  Trash2,
  RefreshCw,
  AlertTriangle,
  FlaskConical
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { useIntegrations } from "@/hooks/use-integrations"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { seedDemoData } from "@/lib/seed/write-demo-data"
import { clearDemoData } from "@/lib/seed/clear-demo-data"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const AVAILABLE_TIERS = [
  "Standard 1", "Standard 2", "Standard 3", "Standard 4", "Standard 5", "Standard 6", "Standard 7",
  "Form 1", "Form 2", "Form 3", "Form 4", "Form 5", "Form 6"
]

export default function SettingsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { schoolId } = useAuth()
  const { config, updateConfig, loading: integrationsLoading } = useIntegrations()
  
  const identityRef = useMemoFirebase(() => doc(db, "schools", schoolId || "school-001", "config", "identity"), [db, schoolId])
  const { data: identity, isLoading } = useDoc(identityRef)

  const [isSeeding, setIsSeeding] = useState(false)
  const [seedProgress, setSeedProgress] = useState(0)
  const [seedStep, setSeedStep] = useState("")

  const [formState, setFormState] = useState({
    name: "",
    systemName: "Shule Altra",
    centerId: "",
    region: "Dar es Salaam",
    district: "Kinondoni",
    address: "",
    contactPhone: "",
    contactEmail: "",
    tiers: [] as string[],
    logo: "",
    demoMode: false,
  })

  const [n8nUrl, setN8nUrl] = useState("")
  const [n8nEnabled, setN8nEnabled] = useState(false)

  useEffect(() => {
    if (identity) {
      setFormState({
        name: identity.name || "",
        systemName: identity.systemName || "Shule Altra",
        centerId: identity.centerId || "",
        region: identity.region || "Dar es Salaam",
        district: identity.district || "Kinondoni",
        address: identity.address || "",
        contactPhone: identity.contactPhone || "",
        contactEmail: identity.contactEmail || "",
        tiers: identity.tiers || ["Standard 7", "Form 2"],
        logo: identity.logo || "",
        demoMode: identity.demoMode || false,
      })
    }
  }, [identity])

  useEffect(() => {
    if (config) {
      setN8nUrl(config.n8nWebhookUrl)
      setN8nEnabled(config.n8nEnabled)
    }
  }, [config])

  const handleSaveIdentity = () => {
    try {
      setDocumentNonBlocking(identityRef, formState, { merge: true })
      toast({ title: "Identity Hub Synchronized", description: "Global institutional configurations updated permanently." })
    } catch (e) {
      toast({ variant: "destructive", title: "Update Failed", description: "Could not save identity." })
    }
  }

  const handleSaveIntegrations = async () => {
    try {
      await updateConfig({ n8nWebhookUrl: n8nUrl, n8nEnabled: n8nEnabled });
      toast({ title: "Automation Node Secure", description: "Integrations updated in the secure vault." })
    } catch (e: any) {
      toast({ variant: "destructive", title: "Vault Error", description: e.message })
    }
  }

  const handleRunSeed = async () => {
    setIsSeeding(true)
    try {
      const result = await seedDemoData((step, percent) => {
        setSeedStep(step)
        setSeedProgress(percent)
      })
      toast({ title: "Demo Seed Success", description: result.summary })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Seed Aborted", description: err.message })
    } finally {
      setIsSeeding(false)
      setSeedProgress(0)
      setSeedStep("")
    }
  }

  const handleClearSeed = async () => {
    try {
      await clearDemoData()
      toast({ title: "Demo Data Purged", description: "Operational records under school-001 have been cleared." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: err.message })
    }
  }

  if (isLoading || integrationsLoading) {
    return (
      <div className="p-20 text-center flex flex-col items-center gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest">Synchronizing Configuration Node...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 px-1 font-body">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full">
            <Zap className="h-2.5 w-2.5 mr-1.5" /> Institutional Hub 2026
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">System Control Node</h1>
          <p className="text-muted-foreground font-black text-[9px] uppercase tracking-widest">Manage institutional identity and orchestration mode.</p>
        </div>
      </div>

      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList className="bg-muted/40 p-1 rounded-2xl w-full flex h-auto gap-1 border border-muted/50 px-1 overflow-x-auto shadow-inner">
          <TabsTrigger value="identity" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Identity Hub</TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Tier Config</TabsTrigger>
          <TabsTrigger value="automation" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Automation</TabsTrigger>
          <TabsTrigger value="dev" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest border border-orange-200/50 text-orange-600 bg-orange-50/50">Developer Node</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/60 backdrop-blur-md">
            <CardHeader className="bg-primary/5 border-b p-8">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-widest">Legal Profile</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase">Institutional metadata for national assessments</CardDescription>
                </div>
                <Button onClick={handleSaveIdentity} className="rounded-full colorful-gradient h-10 px-6 text-[9px] uppercase font-black shadow-lg">Sync Identity</Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Official Institution Name</Label>
                  <Input value={formState.name} onChange={(e) => setFormState({...formState, name: e.target.value.toUpperCase()})} className="rounded-xl h-12 bg-muted/20 border-none font-black shadow-inner px-5 uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">NECTA Center Number</Label>
                  <Input value={formState.centerId} onChange={(e) => setFormState({...formState, centerId: e.target.value.toUpperCase()})} className="rounded-xl h-12 bg-muted/20 border-none font-mono font-black text-primary shadow-inner px-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dev" className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white/60 border border-orange-100">
             <CardHeader className="bg-orange-50/50 border-b p-8">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-orange-600">
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black uppercase tracking-widest">Demo Data Management</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase text-orange-600/60">Developer Tools • Institutional Data Seeding</CardDescription>
                  </div>
                </div>
             </CardHeader>
             <CardContent className="p-8 space-y-8">
               <div className="p-6 rounded-[2rem] bg-orange-100/30 border border-orange-200/50 space-y-4">
                 <div className="flex items-center gap-3">
                   <AlertTriangle className="h-5 w-5 text-orange-600" />
                   <p className="text-xs font-bold text-orange-800 uppercase tracking-tight">Sandbox Environment Notice</p>
                 </div>
                 <p className="text-[10px] leading-relaxed text-orange-700 font-medium uppercase tracking-tighter">
                   These tools populate <b>school-001</b> with 150 Tanzanian students, NECTA-aligned grades, a full fee ledger, boarding and fleet records. 
                   Use for stakeholder presentations or local integration testing.
                 </p>
               </div>

               {isSeeding && (
                 <div className="space-y-3 animate-in fade-in duration-500">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase text-orange-600 px-1">
                      <span className="flex items-center gap-2"><RefreshCw className="h-3 w-3 animate-spin" /> {seedStep}</span>
                      <span>{seedProgress}%</span>
                    </div>
                    <Progress value={seedProgress} className="h-2 bg-orange-100 rounded-full" />
                 </div>
               )}

               <div className="flex flex-col sm:flex-row gap-4">
                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button disabled={isSeeding} className="flex-1 rounded-2xl h-14 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-widest shadow-xl">
                       {isSeeding ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Database className="mr-2 h-4 w-4" />}
                       Seed Demo Registry
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                     <AlertDialogHeader>
                       <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Initialize Seed Node?</AlertDialogTitle>
                       <AlertDialogDescription className="text-xs font-medium uppercase tracking-tighter leading-relaxed">
                         This will inject 150 Tanzanian students, 16 faculty nodes, 2,700+ NECTA assessment records and the full financial ledger into <b>school-001</b>.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter className="gap-2 mt-4">
                       <AlertDialogCancel className="rounded-full h-11 font-black text-[10px] uppercase">Cancel</AlertDialogCancel>
                       <AlertDialogAction onClick={handleRunSeed} className="rounded-full h-11 colorful-gradient border-none font-black text-[10px] uppercase px-8 shadow-xl">Confirm Injection</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>

                 <AlertDialog>
                   <AlertDialogTrigger asChild>
                     <Button disabled={isSeeding} variant="outline" className="flex-1 rounded-2xl h-14 border-orange-200 text-orange-600 hover:bg-orange-50 font-black text-xs uppercase tracking-widest">
                       <Trash2 className="mr-2 h-4 w-4" /> Purge Demo Data
                     </Button>
                   </AlertDialogTrigger>
                   <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8">
                     <AlertDialogHeader>
                       <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-destructive">Wipe Sandbox Data?</AlertDialogTitle>
                       <AlertDialogDescription className="text-xs font-medium uppercase tracking-tighter leading-relaxed">
                         Permanent deletion of all records under the demo school node. This action cannot be reversed.
                       </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter className="gap-2 mt-4">
                       <AlertDialogCancel className="rounded-full h-11 font-black text-[10px] uppercase">Abort</AlertDialogCancel>
                       <AlertDialogAction onClick={handleClearSeed} className="rounded-full h-11 bg-destructive hover:bg-destructive/90 text-white border-none font-black text-[10px] uppercase px-8 shadow-xl">Purge Document Store</AlertDialogAction>
                     </AlertDialogFooter>
                   </AlertDialogContent>
                 </AlertDialog>
               </div>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
