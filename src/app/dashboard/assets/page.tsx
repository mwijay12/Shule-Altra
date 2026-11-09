
"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import {
  PackageSearch,
  Search,
  QrCode,
  Plus,
  Filter,
  HardDrive,
  FlaskConical,
  Activity,
  ShieldCheck,
  ChevronRight,
  Download,
  Loader2,
  Printer,
  Trash2,
  AlertCircle,
  Settings,
  CheckCircle2,
  Wrench
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { AssetCondition, ChartPanel } from "@/components/admin/module-charts"
import { RatioDonut } from "@/components/admin/chart-motion"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
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
import { QRCodeSVG } from "qrcode.react"
import { Html5QrcodeScanner } from "html5-qrcode"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, doc, serverTimestamp, query } from "firebase/firestore"
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { WaveSection } from '@/components/motion/wave-section';

export default function AssetsPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const schoolId = "school-001"

  const [isScanning, setIsScanning] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [isLogModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // Real Firestore Query
  const assetsQuery = useMemoFirebase(() => {
    return query(collection(db, "schools", schoolId, "assets"))
  }, [db])
  const { data: assets, isLoading: assetsLoading } = useCollection(assetsQuery)

  const handleScanQR = () => {
    setIsScanning(true)
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false)
      scanner.render((decodedText) => {
        setIsScanning(false)
        scanner.clear()
        const asset = assets?.find(a => a.id === decodedText || a.qrCodeValue === decodedText)
        if (asset) {
          setSelectedAsset(asset)
          setIsMaintenanceModalOpen(true)
          toast({ title: "Asset found", description: `Found: ${asset.name}` })
        } else {
          toast({ variant: "destructive", title: "Not recognised", description: "This QR code is not registered in the system." })
        }
      }, (error) => {})
      scannerRef.current = scanner
    }, 100)
  }

  const handleStopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
    }
    setIsScanning(false)
  }

  const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newAsset = {
      schoolId,
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      location: formData.get("location") as string,
      assetTag: formData.get("tag") as string,
      condition: "New",
      status: "Operational",
      qrCodeValue: `SD2026-${Math.random().toString(36).substring(7).toUpperCase()}`,
      createdAt: serverTimestamp(),
    }

    addDocumentNonBlocking(collection(db, "schools", schoolId, "assets"), newAsset)
    setIsAdding(false)
    toast({ title: "Asset Registered", description: "Institutional property synced to 2026 database." })
  }

  const handleDeleteAsset = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "schools", schoolId, "assets", id))
    toast({ title: "Asset removed", description: "The asset was deleted." })
  }

  const updateAssetStatus = (id: string, status: string, condition: string) => {
    updateDocumentNonBlocking(doc(db, "schools", schoolId, "assets", id), { status, condition })
    setIsMaintenanceModalOpen(false)
    toast({ title: "Condition updated", description: "The asset record was saved." })
  }

  const faultyCount = assets?.filter(a => a.status === "Faulty" || a.condition === "Broken" || a.condition === "Needs Repair").length || 0
  const maintenanceCount = assets?.filter(a => a.status === "Under Maintenance").length || 0
  const taggedCount = assets?.filter(a => Boolean(a.qrCodeValue)).length || 0
  const auditRate = assets?.length ? taggedCount / assets.length * 100 : 0

  return (
    <div className="space-y-8 max-w-full mx-auto pb-24">
      <WaveSection as="div" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-2">
          <Badge data-wave="badge" variant="outline" className="border-primary/20 bg-primary/5 text-primary px-4 py-1 h-6 text-[12px] font-semibold rounded-full shadow-sm">
            Asset register · 2026
          </Badge>
          <h1 data-wave="heading" className="text-3xl sm:text-4xl font-headline font-semibold text-primary tracking-tight">Property & Assets</h1>
          <p data-wave="subcopy" className="text-muted-foreground font-medium text-sm">Real-world QR auditing and maintenance lifecycle management.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          <Dialog open={isScanning} onOpenChange={setIsScanning}>
            <DialogTrigger asChild>
              <Button onClick={handleScanQR} variant="outline" className="flex-1 sm:flex-none rounded-full h-12 px-6 border-primary/20 text-primary bg-white shadow-md font-semibold text-[13px] group">
                <QrCode className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Scan Property
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden">
              <DialogHeader className="bg-primary/5 p-8 border-b">
                <DialogTitle className="text-xl font-semibold text-primary">Scan an asset QR code</DialogTitle>
                <DialogDescription className="text-[13px] font-bold">Aim camera at asset QR stamp</DialogDescription>
              </DialogHeader>
              <div className="p-8">
                <div id="reader" className="w-full aspect-square bg-muted rounded-3xl overflow-hidden border-2 border-dashed border-primary/20" />
              </div>
              <DialogFooter className="p-8 pt-0">
                <Button variant="ghost" onClick={handleStopScan} className="w-full font-semibold text-xs">Cancel Search</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none rounded-full h-12 px-6 colorful-gradient shadow-lg font-semibold text-[13px] group">
                <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Register asset
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-lg border-none shadow-2xl">
              <DialogHeader className="bg-primary/5 p-10 border-b">
                <DialogTitle className="text-2xl font-semibold text-primary">Add Institutional Asset</DialogTitle>
                <DialogDescription className="text-[13px] font-bold">Register new property for 2026 Season</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAsset} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Asset Name</Label>
                    <Input name="name" placeholder="e.g. Printer L14" required className="h-12 rounded-xl bg-muted/20 border-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Category</Label>
                    <Select name="category" defaultValue="ICT">
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold shadow-inner">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="ICT">ICT Equipment</SelectItem>
                        <SelectItem value="Lab">Laboratory</SelectItem>
                        <SelectItem value="Furniture">Furniture</SelectItem>
                        <SelectItem value="Library">Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Location</Label>
                    <Input name="location" placeholder="e.g. Admin Block" required className="h-12 rounded-xl bg-muted/20 border-none font-bold shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Asset Tag/Serial</Label>
                    <Input name="tag" placeholder="SD-2026-X" required className="h-12 rounded-xl bg-muted/20 border-none font-bold shadow-inner" />
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl colorful-gradient font-semibold text-xs shadow-2xl mt-4">
                  Register asset
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </WaveSection>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total assets", value: assets?.length || 0, sub: "On the register", icon: HardDrive, tone: "primary" as const },
          { label: "Faulty", value: faultyCount, sub: "Action Required", icon: AlertCircle, tone: "rose" as const },
          { label: "Maintenance", value: maintenanceCount, sub: "In workshop", icon: Activity, tone: "amber" as const },
          { label: "QR Tagged", value: auditRate, suffix: "%", sub: "Registry coverage", icon: ShieldCheck, tone: "emerald" as const, progress: auditRate },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-reveal>
        <ChartPanel title="Asset condition" hint="Every item counted by its recorded status">
          <AssetCondition assets={assets ?? []} />
        </ChartPanel>
        <ChartPanel title="QR tag coverage" hint="Tagged items against the whole register">
          <div className="grid min-h-[230px] place-items-center">
            <RatioDonut
              value={auditRate}
              label="Registry tagged"
              caption={`${taggedCount} of ${assets?.length ?? 0} items carry a QR code`}
              colour="hsl(160 74% 42%)"
            />
          </div>
        </ChartPanel>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-card rounded-[2.5rem]">
        <CardHeader className="bg-muted/30 pb-6 pt-8 px-4 sm:px-8 border-b">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 sm:p-4 rounded-3xl bg-primary text-white shadow-xl shrink-0">
                <PackageSearch className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold tracking-tight">Property Ledger</CardTitle>
                <CardDescription className="text-[12px] sm:text-[13px] font-semibold text-primary/60">Asset condition & real-time monitoring</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1 sm:min-w-[300px] group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input placeholder="Search property registry..." className="pl-12 h-12 rounded-full border-none bg-white shadow-inner font-bold text-sm" />
              </div>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white border-none shadow-sm shrink-0">
                <Filter className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {assetsLoading ? (
            <div className="p-20 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4" />
              <p className="text-[13px] font-semibold">Loading assets…</p>
            </div>
          ) : (
            <Table className="min-w-[800px]">
              <TableHeader className="bg-muted/10">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[12px] font-semibold">Asset</TableHead>
                  <TableHead className="text-[12px] font-semibold">Lifecycle</TableHead>
                  <TableHead className="text-[12px] font-semibold">QR Identity</TableHead>
                  <TableHead className="text-[12px] font-semibold">Health</TableHead>
                  <TableHead className="text-right pr-8 text-[12px] font-semibold">Control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="sd-stagger-rows">
                {assets?.map((asset) => (
                  <TableRow key={asset.id} className="group hover:bg-primary/[0.02] border-b last:border-none transition-colors">
                    <TableCell className="pl-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm text-foreground/80 group-hover:text-primary transition-colors">{asset.name}</span>
                        <span className="text-[13px] text-muted-foreground font-medium">{asset.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full font-semibold text-[11px] border-primary/10 bg-primary/5 text-primary px-3 py-0.5">
                        {asset.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 flex items-center gap-3 group/qr">
                            <div className="p-2 rounded-lg bg-muted shadow-inner group-hover/qr:bg-primary/10 transition-colors">
                              <QrCode className="h-4 w-4 text-muted-foreground group-hover/qr:text-primary" />
                            </div>
                            <code className="text-[13px] font-mono font-semibold text-foreground/60">{asset.qrCodeValue}</code>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm rounded-[2.5rem] p-10 text-center">
                          <div className="space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-2xl inline-block mx-auto">
                              <QRCodeSVG value={asset.id} size={200} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-xl text-primary">{asset.name}</h3>
                              <p className="text-[13px] font-bold text-muted-foreground mt-1">Asset tag: {asset.qrCodeValue}</p>
                            </div>
                            <Button className="w-full rounded-2xl h-12 colorful-gradient font-semibold text-[13px] shadow-lg">
                              <Printer className="mr-2 h-4 w-4" /> Print QR Stamp
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "text-[12px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full border-none shadow-sm",
                        asset.status === "Operational" ? "bg-green-100 text-green-700" :
                        asset.status === "Faulty" ? "bg-destructive/10 text-destructive" : "bg-orange-50 text-orange-600"
                      )}>
                        {asset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5"
                          onClick={() => { setSelectedAsset(asset); setIsMaintenanceModalOpen(true); }}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          onClick={() => handleDeleteAsset(asset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isLogModalOpen} onOpenChange={setIsMaintenanceModalOpen}>
        <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-lg border-none shadow-2xl">
          <DialogHeader className="bg-primary/5 p-10 border-b">
            <div className="flex items-center gap-4 mb-2">
              <div className="h-12 w-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-primary">
                <Settings className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Maintenance: {selectedAsset?.name}</DialogTitle>
                <DialogDescription className="text-[13px] font-bold">Update Condition & Fault Status</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className={cn("h-20 rounded-3xl flex flex-col gap-2 font-black text-[12px] uppercase border-2", selectedAsset?.status === "Operational" ? "border-green-500 bg-green-50 text-green-700" : "border-transparent bg-muted/20")}
                onClick={() => updateAssetStatus(selectedAsset?.id, "Operational", "Good")}
              >
                <CheckCircle2 className="h-6 w-6" />
                Operational
              </Button>
              <Button
                variant="outline"
                className={cn("h-20 rounded-3xl flex flex-col gap-2 font-black text-[12px] uppercase border-2", selectedAsset?.status === "Faulty" ? "border-destructive bg-destructive/5 text-destructive" : "border-transparent bg-muted/20")}
                onClick={() => updateAssetStatus(selectedAsset?.id, "Faulty", "Broken")}
              >
                <AlertCircle className="h-6 w-6" />
                Mark Faulty
              </Button>
            </div>

            <div className="space-y-4">
              <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Condition Audit</Label>
              <Select defaultValue={selectedAsset?.condition || "Good"} onValueChange={(val) => updateAssetStatus(selectedAsset?.id, selectedAsset?.status, val)}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold shadow-inner">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Good">Good/Operational</SelectItem>
                  <SelectItem value="Fair">Fair/Needs Service</SelectItem>
                  <SelectItem value="Broken">Broken/Faulty</SelectItem>
                  <SelectItem value="Retired">Retired/Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-10 pt-0">
            <p className="text-[12px] font-medium text-muted-foreground text-center w-full italic">All maintenance logs are archived in the 2026 Institutional Vault.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
