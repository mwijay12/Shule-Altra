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
          <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary px-4 py-1 h-6 text-[9px] font-black tracking-widest uppercase rounded-full shadow-sm">
            Institutional Financial Registry • 2026
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-headline font-black text-primary tracking-tight">Revenue Assurance</h1>
          <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-xl leading-relaxed uppercase tracking-tighter">Fee collection, reconciliation and statements — every entry tied to a learner.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-primary p-6 rounded-3xl text-white shadow-xl min-w-[280px]">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase text-white/60 tracking-widest">Collection Rate</p>
            <p className="text-2xl font-black"><AnimatedNumber value={collectionRate} format={(n) => n.toFixed(1)} suffix="%" /></p>
            <Progress value={collectionRate} aria-label="Fee collection rate" className="mt-2 h-1 bg-white/20" indicatorClassName="bg-white" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Revenue (7D)",
            value: weeklyTotal,
            format: formatTZSCompact,
            exact: formatTZS(weeklyTotal),
            icon: Zap,
            color: "text-green-600",
          },
          { title: "Audit Disputes", value: disputed, format: undefined, icon: AlertTriangle, color: "text-destructive" },
          { title: "Awaiting confirmation", value: pending, format: undefined, icon: History, color: "text-primary" },
          {
            title: "Outstanding Fees",
            value: outstanding,
            format: formatTZSCompact,
            exact: formatTZS(outstanding),
            icon: Scale,
            color: "text-orange-600",
          },
        ].map((stat) => (
          <Card key={stat.title} className="border-none shadow-xl rounded-[2rem] bg-white/60 backdrop-blur-md overflow-hidden group hover:-translate-y-1 transition-all">
            <CardContent className="p-5 sm:p-6">
              <p className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-widest">{stat.title}</p>
              <div className="mt-2 flex items-baseline gap-2">
                <stat.icon className={cn("h-4 w-4 shrink-0", stat.color)} />
                <span
                  title={"exact" in stat ? String(stat.exact) : undefined}
                  className={cn(
                    "font-black tabular-nums tracking-tight text-[clamp(1.05rem,3.1vw,1.5rem)]",
                    stat.color
                  )}
                >
                  <AnimatedNumber value={stat.value} format={stat.format} />
                </span>
              </div>
              {"exact" in stat ? (
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {stat.exact}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="forensic-ledger" className="space-y-8">
        <TabsList className="bg-muted/40 p-1 rounded-2xl h-12 flex w-full sm:w-fit overflow-x-auto shadow-inner border border-muted/50 px-1">
          <TabsTrigger value="reconciliation" className="rounded-xl font-black px-8 text-[9px] uppercase tracking-widest">Global Balances</TabsTrigger>
          <TabsTrigger value="forensic-ledger" className="rounded-xl font-black px-8 text-[9px] uppercase tracking-widest">Payment Ledger</TabsTrigger>
          <TabsTrigger value="control-number" className="rounded-xl font-black px-8 text-[9px] uppercase tracking-widest">Control Numbers</TabsTrigger>
          <TabsTrigger value="record-payment" className="rounded-xl font-black px-8 text-[9px] uppercase tracking-widest">Record Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="bg-muted/30 p-6 sm:p-10 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Transaction ledger</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Live verification of student fee status</CardDescription>
              </div>
              <Button 
                onClick={() => exportToExcel(students || [], "Financial_Audit_Ledger")}
                className="h-12 rounded-full colorful-gradient font-black text-[10px] uppercase px-8 shadow-xl"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export ledger
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/10">
                  <TableRow className="border-none h-14">
                    <TableHead className="pl-10 text-[9px] font-black uppercase tracking-widest">Student</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Expected</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Collected</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Balance</TableHead>
                    <TableHead className="text-right pr-10 text-[9px] font-black uppercase tracking-widest">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading transactions…</TableCell></TableRow>
                  ) : students?.map((s) => (
                    <TableRow key={s.id} className="group border-b last:border-none hover:bg-primary/[0.02]">
                      <TableCell className="pl-10 py-6">
                        <p className="font-black text-sm text-foreground/80">{s.name}</p>
                        <p className="text-[9px] text-muted-foreground font-mono font-black uppercase">{s.id} • {s.class}</p>
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
                          "font-black text-[9px] px-4 py-1 rounded-full uppercase shadow-sm",
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
                <CardTitle className="text-xl font-black uppercase">Institutional Billing</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Generate verifiable payment references</CardDescription>
              </CardHeader>
              <form onSubmit={handleGenerateBill} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Target Student</Label>
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
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Fee Category</Label>
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
                    <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Amount (TZS)</Label>
                    <Input name="amount" type="number" placeholder="500,000" required className="h-12 rounded-xl bg-muted/20 border-none font-black px-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Guardian Notification Number</Label>
                  <Input name="phone" placeholder="+255 7XX XXX XXX" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                </div>
                <Button type="submit" disabled={isGeneratingBill} className="w-full h-16 rounded-2xl colorful-gradient font-black text-xs uppercase shadow-2xl group">
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
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Official bill</p>
                        <h3 className="text-3xl font-black tracking-tighter">{formatTZS(activeBill.amount)}</h3>
                      </div>
                      <Badge className="bg-white/20 text-white border-none px-4 py-1 rounded-full font-black text-[9px] uppercase">EXPIRY: {activeBill.expiresAt.toLocaleDateString('en-TZ')}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="bg-white p-6 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
                        <img src={activeBill.qrCodeUrl} alt="Scan to pay" className="h-40 w-40" />
                        <p className="text-[10px] font-black text-primary uppercase">Scan to pay</p>
                      </div>
                      <div className="space-y-6">
                        <div className="p-6 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/10">
                          <p className="text-[10px] font-black uppercase text-white/60 mb-2">USSD payment</p>
                          <code className="text-2xl font-black tracking-widest">{activeBill.ussdCode}</code>
                        </div>
                        <div className="p-6 rounded-[2rem] bg-white/10 backdrop-blur-md border border-white/10 group cursor-pointer" onClick={() => copyToClipboard(activeBill.controlNumber)}>
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black uppercase text-white/60">Control Number</p>
                            <Copy className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <code className="text-xl font-black tracking-widest font-mono">{activeBill.controlNumber}</code>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button className="flex-1 rounded-2xl h-14 bg-white text-primary hover:bg-white/90 font-black text-[10px] uppercase shadow-xl">
                        <Smartphone className="mr-2 h-4 w-4" /> Send Notification
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-2xl h-14 border-white/20 text-white hover:bg-white/10 font-black text-[10px] uppercase">
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
                    <h3 className="text-xl font-black text-primary uppercase">Ready for Audit</h3>
                    <p className="text-xs text-muted-foreground font-medium max-w-xs leading-relaxed uppercase tracking-tighter">
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
                <CardTitle className="text-2xl font-black uppercase text-primary">Record Institutional Payment</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Direct ledger entry for verified deposits</CardDescription>
              </CardHeader>
              <form onSubmit={handleProcessManualPayment} className="space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Student</Label>
                    <Select name="studentId" required>
                      <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-none font-bold text-lg px-6"><SelectValue placeholder="Identify student..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {students?.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name} ({s.id})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Fee Type</Label>
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
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Amount (TZS)</Label>
                      <Input name="amount" type="number" placeholder="50,000" required className="h-14 rounded-2xl bg-muted/20 border-none font-black text-xl px-6 shadow-inner" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Method</Label>
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
                      <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Control Number (Optional)</Label>
                      <Input name="controlNumber" placeholder="CP-2026-X" className="h-14 rounded-2xl bg-muted/20 border-none font-mono font-bold px-6 uppercase" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Audit Notes</Label>
                    <Input name="notes" placeholder="Optional transaction details..." className="h-14 rounded-2xl bg-muted/20 border-none font-medium px-6" />
                  </div>
                </div>

                <Button type="submit" disabled={isProcessing} className="w-full h-16 rounded-[2rem] colorful-gradient font-black text-sm uppercase tracking-widest shadow-2xl group">
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
                  <CardTitle className="text-xl font-black uppercase">Institutional Ledger</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase text-primary/60">Verified transaction stream for TRA and National Audit compliance</CardDescription>
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
                    <TableHead className="pl-10 text-[9px] font-black uppercase">Reference</TableHead>
                    <TableHead className="text-[9px] font-black uppercase">Student</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Amount</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Category</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-center">Status</TableHead>
                    <TableHead className="text-right pr-10 text-[9px] font-black uppercase">Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-[10px] font-black uppercase tracking-widest"><Loader2 className="animate-spin inline mr-2" /> Loading transactions…</TableCell></TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground uppercase text-[10px] font-black tracking-widest">No verified transactions identified.</TableCell></TableRow>
                  ) : filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="group border-b last:border-none hover:bg-primary/[0.02] transition-colors">
                      <TableCell className="pl-10 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col group/copy cursor-pointer" onClick={() => copyToClipboard(tx.controlNumber)}>
                            <code className="text-xs font-black text-primary font-mono tracking-wider">{tx.controlNumber}</code>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                              {tx.id.substring(0, 12)}... <Copy className="h-2 w-2 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-black uppercase text-foreground/80">{tx.studentName}</span>
                          <span className="text-[9px] text-muted-foreground font-black uppercase">{tx.class} • {tx.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-xs">{formatTZS(tx.amount)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[8px] font-black uppercase rounded-full bg-white border-muted px-3">{tx.feeType}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[8px] font-black uppercase px-4 py-1 rounded-full border-none shadow-sm",
                          tx.status === 'Verified' ? 'bg-green-500 text-white' : 
                          tx.status === 'Pending' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                        )}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-10">
                        <div className="flex justify-end items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[8px] font-black text-muted-foreground uppercase leading-none">By: {tx.recordedBy?.split('@')[0]}</p>
                            <p className="text-[7px] font-bold text-muted-foreground/60 uppercase mt-1">
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
                                    <DialogTitle className="text-xl font-black uppercase">Payment Receipt</DialogTitle>
                                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Payment receipt</DialogDescription>
                                  </div>
                                  <div className="p-8 rounded-[2rem] bg-muted/20 border-2 border-dashed border-muted text-left space-y-4">
                                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground border-b border-muted pb-2">
                                        <span>Reference</span>
                                        <code className="text-primary">{tx.controlNumber}</code>
                                     </div>
                                     <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-muted-foreground">Payer</span>
                                        <span>{tx.studentName}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-muted-foreground">Category</span>
                                        <span>{tx.feeType}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-[10px] font-black uppercase pt-4 border-t border-muted">
                                        <span className="text-muted-foreground text-lg">Total</span>
                                        <span className="text-xl text-primary">{formatTZS(tx.amount)}</span>
                                     </div>
                                  </div>
                                  <Button className="w-full h-12 rounded-xl colorful-gradient font-black uppercase text-[10px] tracking-widest shadow-lg">Print Official Copy</Button>
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
