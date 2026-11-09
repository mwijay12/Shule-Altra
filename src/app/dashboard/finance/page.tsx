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
import { processPaymentTransaction, generateInstitutionalControlNumber, ControlNumberResponse, formatTZS, formatTZSCompact, generateControlNumber } from "@/lib/finance-engine"
import { useInstitutionalReconciliation } from "@/hooks/use-finance"
import { usePettyCash } from "@/hooks/use-petty-cash"
import { useFirestore, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, Timestamp } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { StatCard } from "@/components/admin/stat-card"
import { FeesByClass, RegisterSplit, ChartPanel } from "@/components/admin/module-charts"
import type { Transaction } from "@/types/finance"
import type { Student } from "@/types/student"

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
  const { expenses, addExpense, updateStatus, stats, isLoading: pettyLoading } = usePettyCash()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isGeneratingBill, setIsGeneratingBill] = useState(false)
  const [activeBill, setActiveBill] = useState<ControlNumberResponse | null>(null)
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

  const handleGenerateBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsGeneratingBill(true)
    const formData = new FormData(e.currentTarget)
    const studentId = formData.get("studentId") as string
    const student = students?.find(s => s.id === studentId)

    try {
      const bill = await generateInstitutionalControlNumber(db, {
        schoolId: "school-001",
        studentId,
        amount: parseFloat(formData.get("amount") as string),
        feeType: formData.get("feeType") as any,
        payerName: student?.name || "Guardian",
        payerPhone: formData.get("phone") as string || student?.guardianPhone || "+255",
        expiresInDays: 7
      })
      setActiveBill(bill)
      toast({ title: "Control Number Generated", description: "Official billing instructions dispatched." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gateway Error", description: err.message })
    } finally {
      setIsGeneratingBill(false)
    }
  }

  const handleProcessManualPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsProcessing(true)
    const formData = new FormData(e.currentTarget)

    try {
      await processPaymentTransaction(db, {
        studentId: formData.get("studentId") as string,
        amount: parseFloat(formData.get("amount") as string),
        controlNumber: formData.get("controlNumber") as string || generateControlNumber(),
        feeType: formData.get("feeType") as any,
        paymentMethod: formData.get("method") as any,
        recordedBy: user?.email || "Finance Officer",
        academicYear: 2026,
        deviceInfo: navigator.userAgent,
        notes: formData.get("notes") as string
      })

      toast({ title: "Payment Reconciled", description: "Institutional ledger updated successfully." })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Reconciliation Error", description: err.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to Clipboard", description: "Control number ready for payment." });
  }

  return (
    <div className="space-y-8 max-w-full mx-auto pb-32 px-1">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div className="space-y-4">
          <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary px-4 py-1 h-6 text-[12px] font-semibold rounded-full shadow-sm">
            Institutional Financial Registry • 2026
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-headline font-semibold text-primary tracking-tight">Revenue Assurance</h1>
          <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-xl leading-relaxed tracking-tighter">Fee collection, reconciliation and statements — every entry tied to a learner.</p>
        </div>

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

      <Tabs defaultValue="forensic-ledger" className="space-y-8">
        <TabsList className="bg-muted/40 p-1 rounded-2xl h-12 flex w-full sm:w-fit overflow-x-auto shadow-inner border border-muted/50 px-1">
          <TabsTrigger value="reconciliation" className="rounded-xl font-semibold px-8 text-[12px]">Global Balances</TabsTrigger>
          <TabsTrigger value="forensic-ledger" className="rounded-xl font-semibold px-8 text-[12px]">Payment Ledger</TabsTrigger>
          <TabsTrigger value="control-number" className="rounded-xl font-semibold px-8 text-[12px]">Control Numbers</TabsTrigger>
          <TabsTrigger value="record-payment" className="rounded-xl font-semibold px-8 text-[12px]">Record Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/60 backdrop-blur-md">
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

        <TabsContent value="control-number" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <Card className="lg:col-span-5 border-none shadow-xl rounded-[2.5rem] bg-white p-8">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-semibold">Institutional Billing</CardTitle>
                <CardDescription className="text-[13px] font-bold text-primary/60">Generate verifiable payment references</CardDescription>
              </CardHeader>
              <form onSubmit={handleGenerateBill} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Target Student</Label>
                  <Select name="studentId" required>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                      <SelectValue placeholder="Select a student…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.id})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Fee Category</Label>
                    <Select name="feeType" defaultValue="Tuition">
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Tuition">Tuition Fee</SelectItem>
                        <SelectItem value="Boarding">Boarding</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="Exam Fee">Assessment Fee</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Amount (TZS)</Label>
                    <Input name="amount" type="number" placeholder="500,000" required className="h-12 rounded-xl bg-muted/20 border-none font-semibold px-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-semibold text-muted-foreground ml-1">Guardian Notification Number</Label>
                  <Input name="phone" placeholder="+255 7XX XXX XXX" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                </div>
                <Button type="submit" disabled={isGeneratingBill} className="w-full h-16 rounded-2xl colorful-gradient font-semibold text-xs shadow-2xl group">
                  {isGeneratingBill ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />}
                  Generate Control Number
                </Button>
              </form>
            </Card>

            <div className="lg:col-span-7 space-y-6">
              {activeBill ? (
                <Card className="border-none shadow-xl rounded-[2.5rem] bg-primary text-white p-10 relative overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                    <QrCode className="h-48 w-48" />
                  </div>
                  <div className="relative z-10 space-y-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[13px] font-semibold text-white/60">Official bill</p>
                        <h3 className="text-3xl font-semibold tracking-tighter">{formatTZS(activeBill.amount)}</h3>
                      </div>
                      <Badge className="bg-white/20 text-white border-none px-4 py-1 rounded-full font-semibold text-[12px]">EXPIRY: {activeBill.expiresAt.toLocaleDateString('en-TZ')}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
                        <img src={activeBill.qrCodeUrl} alt="Scan to pay" className="h-40 w-40" />
                        <p className="text-[13px] font-semibold text-primary">Scan to pay</p>
                      </div>
                      <div className="space-y-6">
                        <div className="p-6 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/10">
                          <p className="text-[13px] font-semibold text-white/60 mb-2">USSD payment</p>
                          <code className="text-2xl font-semibold">{activeBill.ussdCode}</code>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/10 group cursor-pointer" onClick={() => copyToClipboard(activeBill.controlNumber)}>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[13px] font-semibold text-white/60">Control Number</p>
                            <Copy className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <code className="text-xl font-semibold font-mono">{activeBill.controlNumber}</code>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button className="flex-1 rounded-2xl h-14 bg-white text-primary hover:bg-white/90 font-semibold text-[13px] shadow-xl">
                        <Smartphone className="mr-2 h-4 w-4" /> Send Notification
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-2xl h-14 border-white/20 text-white hover:bg-white/10 font-semibold text-[13px]">
                        Print Invoice
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-20 border-2 border-dashed border-primary/10 rounded-[3rem] text-center space-y-6">
                  <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center text-primary/40">
                    <Info className="h-10 w-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-primary">Ready for Audit</h3>
                    <p className="text-xs text-muted-foreground font-medium max-w-xs leading-relaxed tracking-tighter">
                      Select a student and specify the fee amount to generate an official institutional control number.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="record-payment" className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-10">
              <CardHeader className="p-0 mb-10 text-center">
                <CardTitle className="text-2xl font-semibold text-primary">Record Institutional Payment</CardTitle>
                <CardDescription className="text-[13px] font-bold text-muted-foreground mt-2">Direct ledger entry for verified deposits</CardDescription>
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
                      <Input name="amount" type="number" placeholder="50,000" required className="h-14 rounded-2xl bg-muted/20 border-none font-semibold text-xl px-6 shadow-inner" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Method</Label>
                      <Select name="method" defaultValue="Mobile Money">
                        <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold px-6"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                          <SelectItem value="Cash">Cash Deposit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Control Number (Optional)</Label>
                      <Input name="controlNumber" placeholder="CP-2026-X" className="h-14 rounded-2xl bg-muted/20 border-none font-mono font-bold px-6" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-muted-foreground ml-1">Audit Notes</Label>
                    <Input name="notes" placeholder="Optional transaction details..." className="h-14 rounded-2xl bg-muted/20 border-none font-medium px-6" />
                  </div>
                </div>

                <Button type="submit" disabled={isProcessing} className="w-full h-16 rounded-[2rem] colorful-gradient font-semibold text-sm shadow-2xl group">
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />}
                  Finalize Payment Entry
                </Button>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forensic-ledger" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/60 backdrop-blur-md">
            <CardHeader className="bg-muted/30 p-8 border-b">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div>
                  <CardTitle className="text-xl font-semibold">Institutional Ledger</CardTitle>
                  <CardDescription className="text-[13px] font-bold text-primary/60">Verified transaction stream for TRA and National Audit compliance</CardDescription>
                </div>
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Find Control No / Student..."
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
                          <div className="flex flex-col group/copy cursor-pointer" onClick={() => copyToClipboard(tx.controlNumber)}>
                            <code className="text-xs font-semibold text-primary font-mono">{tx.controlNumber}</code>
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              {tx.id.substring(0, 12)}... <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            </span>
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
                          {tx.status}
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
