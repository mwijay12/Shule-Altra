"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Search,
  Plus,
  FileSpreadsheet,
  Loader2,
  Activity,
  Zap,
  ShieldCheck,
  History,
  AlertTriangle,
  Scale,
  QrCode,
  Smartphone,
  Info,
  CheckCircle2,
  Copy,
  Receipt
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { exportToExcel } from "@/lib/export-utils"
import { processPaymentTransaction, formatTZS, formatTZSCompact } from "@/lib/finance-engine"
import { useInstitutionalReconciliation } from "@/hooks/use-finance"
import { ExpenseRegister } from "@/components/finance/expense-register"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, Timestamp } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { FeesByClass, RegisterSplit, ChartPanel } from "@/components/admin/module-charts"
import type { Transaction } from "@/types/finance"
import type { Student } from "@/types/student"
import { WaveSection } from '@/components/motion/wave-section';

const BUDGETS = {
  "Science Lab": 500000,
  "Sports": 300000,
  "Admin": 1000000,
  "Maintenance": 400000,
  "Transport": 600000
}

export default function FinancePage() {
  const { toast } = useToast()
  const db = useFirestore()
  const { user } = useUser()
  const { collected, outstanding, target, collectionRate, isLoading, transactions, pending, disputed, weeklyTotal } = useInstitutionalReconciliation()

  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState("forensic-ledger")
  React.useEffect(() => {
    const syncTab = () => { if (window.location.hash === "#record-payment") setActiveTab("record-payment") }
    syncTab()
    window.addEventListener("hashchange", syncTab)
    return () => window.removeEventListener("hashchange", syncTab)
  }, [])
  const [ledgerSearch, setLedgerSearch] = useState("")

  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")), [db])
  const { data: students } = useCollection<Student>(studentsQuery)

  const filteredTransactions = useMemo(() => {
    return (transactions as unknown as Transaction[]).filter(t =>
      t.controlNumber?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.studentName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      t.transactionReference?.toLowerCase().includes(ledgerSearch.toLowerCase())
    )
  }, [ledgerSearch, transactions])

  const handleProcessManualPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsProcessing(true)
    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      await processPaymentTransaction(db, {
        studentId: formData.get("studentId") as string,
        amount: parseFloat(formData.get("amount") as string),
        controlNumber: (formData.get("controlNumber") as string || "").trim(),
        feeType: formData.get("feeType") as any,
        paymentMethod: formData.get("method") as any,
        recordedBy: user?.email || "Finance Officer",
        academicYear: new Date().getFullYear(),
        deviceInfo: navigator.userAgent,
        notes: formData.get("notes") as string
      })

      form.reset()
      setActiveTab("forensic-ledger")
      toast({ title: "Payment recorded", description: "The ledger and student balance have been updated. This entry was confirmed by you, not by a payment provider." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Payment not recorded", description: err?.issues?.[0]?.message || err.message || "Check the details and try again." })
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: "Reference copied", description: "Internal record references cannot be used to make a payment." })
    } catch {
      toast({ variant: "destructive", title: "Could not copy reference", description: "Select the reference text and copy it manually." })
    }
  }

  return (
    <div className="space-y-8 max-w-full mx-auto pb-32 px-1">
      <WaveSection as="div" className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4">
          <Badge data-wave="badge" variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary px-4 py-1 h-6 text-[12px] font-semibold rounded-full shadow-sm">
            Institutional Financial Registry • 2026
          </Badge>
          <h1 data-wave="heading" className="text-2xl sm:text-3xl font-headline font-semibold text-primary tracking-tight">School finance</h1>
          <p data-wave="subcopy" className="text-muted-foreground font-medium text-xs sm:text-sm max-w-xl leading-relaxed tracking-tighter">Record confirmed payments, review balances and track school expenses.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="button" onClick={() => { setActiveTab("record-payment"); document.getElementById("finance-tabs")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }) }} className="min-h-11 px-5"><Plus className="mr-2 h-4 w-4" />Record payment</Button>
        <div className="flex items-center gap-4 bg-primary p-6 rounded-3xl text-white shadow-xl min-w-[280px]">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-white/60">Collection Rate</p>
            <p className="text-2xl font-semibold"><AnimatedNumber value={collectionRate} format={(n) => n.toFixed(1)} suffix="%" /></p>
            <Progress value={collectionRate} aria-label="Fee collection rate" className="mt-2 h-1 bg-white/20" indicatorClassName="bg-white" />
          </div>
        </div>
        </div>
      </WaveSection>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Revenue (7D)",
            value: weeklyTotal,
            format: formatTZSCompact,
            exact: formatTZS(weeklyTotal),
            icon: Zap,
            tone: "emerald" as const,
          },
          { label: "Audit Disputes", value: disputed, icon: AlertTriangle, tone: "rose" as const },
          { label: "Awaiting confirmation", value: pending, icon: History, tone: "primary" as const },
          {
            label: "Outstanding Fees",
            value: outstanding,
            format: formatTZSCompact,
            exact: formatTZS(outstanding),
            icon: Scale,
            tone: "amber" as const,
          },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2" data-reveal>
        <ChartPanel title="Outstanding by class" hint="Where the balance actually sits, largest first">
          <FeesByClass students={students ?? []} />
        </ChartPanel>
        <ChartPanel title="Register composition" hint="Boarding and day scholars behind these figures">
          <RegisterSplit students={students ?? []} />
        </ChartPanel>
      </div>

      <Tabs id="finance-tabs" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted/40 p-1 rounded-2xl h-12 flex w-full sm:w-fit overflow-x-auto shadow-inner border border-muted/50 px-1">
          <TabsTrigger value="reconciliation" className="rounded-xl font-semibold px-8 text-[12px]">Global Balances</TabsTrigger>
          <TabsTrigger value="forensic-ledger" className="rounded-xl font-semibold px-8 text-[12px]">Payment Ledger</TabsTrigger>
          <TabsTrigger value="control-number" className="rounded-xl font-semibold px-8 text-[12px]">Payment references</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl font-semibold px-8 text-[12px]">Expenses</TabsTrigger>
          <TabsTrigger value="record-payment" className="rounded-xl font-semibold px-8 text-[12px]">Record Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses"><ExpenseRegister /></TabsContent>
        <TabsContent value="reconciliation" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/60">
            <CardHeader className="bg-muted/30 p-6 sm:p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <CardTitle className="text-xl font-semibold tracking-tight">Transaction ledger</CardTitle>
                <CardDescription className="text-[13px] font-bold text-primary/60">Live verification of student fee status</CardDescription>
              </div>
              <Button
                onClick={() => exportToExcel(students || [], "Financial_Audit_Ledger")}
                className="h-12 rounded-full colorful-gradient font-semibold text-[13px] px-8 shadow-xl"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export ledger
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-none h-14">
                    <TableHead className="pl-10 text-[12px] font-semibold">Student</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Expected</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Collected</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Balance</TableHead>
                    <TableHead className="text-right pr-10 text-[12px] font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="sd-stagger-rows">
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading transactions…</TableCell></TableRow>
                  ) : students?.map((s) => (
                    <TableRow key={s.id} className="group border-b last:border-none hover:bg-primary/[0.02]">
                      <TableCell className="pl-10 py-6">
                        <p className="font-semibold text-sm text-foreground/80">{s.name}</p>
                        <p className="text-[12px] text-muted-foreground font-mono font-semibold">{s.id} • {s.class}</p>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">{formatTZS((s.totalFeesExpected || 0) + (s.arrears || 0))}</TableCell>
                      <TableCell className="text-center font-bold text-xs text-green-600">{formatTZS(s.totalPaid || 0)}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn("font-black text-sm", (s.balance || 0) > 0 ? "text-destructive" : "text-green-600")}>
                          {formatTZS(s.balance || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <Badge className={cn(
                          "font-black text-[12px] px-4 py-1 rounded-full uppercase shadow-sm",
                          (s.balance || 0) <= 0 ? "bg-green-100 text-green-700" : "bg-orange-50 text-orange-600"
                        )}>
                          {(s.balance || 0) <= 0 ? 'CLEARED' : 'OUTSTANDING'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="control-number">
          <section className="max-w-2xl rounded-2xl bg-card p-6 sm:p-8 space-y-4">
            <h2 className="text-xl font-semibold">About payment references</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">A real control number must come from your bank or payment provider. This system does not currently create a payable control number or send payment instructions.</p>
            <p className="text-sm leading-relaxed text-muted-foreground">For a payment already confirmed outside the system, record it manually and enter the provider reference if you have one. If left blank, an internal record reference is created; it cannot be used to pay.</p>
            <Button type="button" onClick={() => setActiveTab("record-payment")}>Record a confirmed payment</Button>
          </section>
        </TabsContent>

        <TabsContent value="record-payment" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10">
              <CardHeader className="p-0 mb-10 text-center">
                <CardTitle className="text-2xl font-semibold text-primary">Record Institutional Payment</CardTitle>
                <CardDescription className="text-[13px] font-bold text-muted-foreground mt-2">Only record payments you have independently confirmed. This does not charge a parent or verify a payment with a provider.</CardDescription>
              </CardHeader>
              <form onSubmit={handleProcessManualPayment} className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Student</Label>
                    <Select name="studentId" required>
                      <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold text-lg px-6"><SelectValue placeholder="Identify student..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {students?.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} ({s.id})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Fee Type</Label>
                      <Select name="feeType" defaultValue="Tuition">
                        <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Tuition">Tuition Fee</SelectItem>
                          <SelectItem value="Transport">Transport</SelectItem>
                          <SelectItem value="Meals">Meals</SelectItem>
                          <SelectItem value="Uniform">Uniform</SelectItem>
                          <SelectItem value="Exam Fee">Assessment</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Amount (TZS)</Label>
                      <Input name="amount" type="number" min="1" step="1" placeholder="50000" required className="h-14 rounded-2xl bg-muted/20 border-none font-semibold text-xl px-6 shadow-inner" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Method</Label>
                      <Select name="method" defaultValue="Cash">
                        <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                          <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash Deposit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Provider reference (optional)</Label>
                      <Input name="controlNumber" placeholder="Receipt or bank reference" className="h-14 rounded-2xl bg-muted/20 border-none font-mono font-bold px-6" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Audit Notes</Label>
                    <Input name="notes" placeholder="Optional transaction details..." className="h-14 rounded-2xl bg-muted/20 border-none font-medium px-6" />
                  </div>
                </div>

                <Button type="submit" disabled={isProcessing} className="w-full h-16 rounded-[2rem] colorful-gradient font-semibold text-sm shadow-2xl group">
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />}
                  Save confirmed payment
                </Button>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forensic-ledger" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-semibold">Institutional Ledger</CardTitle>
                  <CardDescription className="text-[13px] font-bold text-primary/60">Verified transaction stream for TRA and National Audit compliance</CardDescription>
                </div>
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Find Reference / Student..."
                    className="pl-12 h-12 rounded-full border-none bg-white shadow-inner font-bold text-xs"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-none h-14">
                    <TableHead className="pl-10 text-[12px] font-semibold">Reference</TableHead>
                    <TableHead className="text-[12px] font-semibold">Student</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Amount</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Category</TableHead>
                    <TableHead className="text-[12px] font-semibold text-center">Status</TableHead>
                    <TableHead className="text-right pr-10 text-[12px] font-semibold">Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-[13px] font-semibold"><Loader2 className="animate-spin inline mr-2" /> Loading transactions…</TableCell></TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground text-[13px] font-semibold">No verified transactions identified.</TableCell></TableRow>
                  ) : filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="group border-b last:border-none hover:bg-primary/[0.02] transition-colors">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-start gap-1">
                            <button type="button" onClick={() => copyToClipboard(tx.controlNumber)} className="inline-flex items-center gap-2 rounded text-left text-xs font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Copy reference ${tx.controlNumber}`}>
                              <code>{tx.controlNumber}</code><Copy className="h-3 w-3" />
                            </button>
                            <span className="text-[11px] text-muted-foreground">{tx.referenceType === 'internal' ? 'Internal record reference' : tx.referenceType === 'provider' ? 'Provided reference' : 'Existing reference'}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-foreground/80">{tx.studentName}</span>
                          <span className="text-[12px] text-muted-foreground font-semibold">{tx.class} • {tx.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-xs">{formatTZS(tx.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[11px] font-semibold rounded-full bg-white border-muted px-3">{tx.feeType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[11px] font-black uppercase px-4 py-1 rounded-full border-none shadow-sm",
                          tx.status === 'Verified' ? 'bg-green-500 text-white' :
                          tx.status === 'Pending' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                        )}>
                          {tx.status === 'Verified' && tx.referenceType ? 'Recorded manually' : tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[11px] font-semibold text-muted-foreground leading-none">By: {tx.recordedBy?.split('@')[0]}</p>
                            <p className="text-[10px] font-bold text-muted-foreground/60 mt-1">
                              {tx.createdAt instanceof Timestamp ? tx.createdAt.toDate().toLocaleDateString('en-TZ') : '---'}
                            </p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 text-primary">
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] p-10 max-w-md border-none shadow-2xl">
                               <div className="text-center space-y-6">
                                  <div className="h-16 w-16 rounded-[1.5rem] colorful-gradient flex items-center justify-center text-white mx-auto shadow-xl">
                                    <ShieldCheck className="h-8 w-8" />
                                  </div>
                                  <div className="space-y-1">
                                    <DialogTitle className="text-xl font-semibold">Payment Receipt</DialogTitle>
                                    <DialogDescription className="text-[13px] font-bold">Payment receipt</DialogDescription>
                                  </div>
                                  <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed border-muted text-left space-y-4">
                                     <div className="flex justify-between items-center text-[13px] font-semibold text-muted-foreground border-b border-muted pb-2">
                                        <span>Reference</span>
                                        <code className="text-primary">{tx.controlNumber}</code>
                                     </div>
                                     <div className="flex justify-between items-center text-[13px] font-semibold">
                                        <span className="text-muted-foreground">Payer</span>
                                        <span>{tx.studentName}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-[13px] font-semibold">
                                        <span className="text-muted-foreground">Category</span>
                                        <span>{tx.feeType}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-[13px] font-semibold pt-4 border-t border-muted">
                                        <span className="text-muted-foreground text-lg">Total</span>
                                        <span className="text-xl text-primary">{formatTZS(tx.amount)}</span>
                                     </div>
                                  </div>
                                  <Button className="w-full h-12 rounded-xl colorful-gradient font-semibold text-[13px] shadow-lg">Print Official Copy</Button>
                               </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
