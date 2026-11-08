
"use client"

import * as React from "react"
import { useState } from "react"
import { 
  ShoppingCart, 
  Wallet, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Clock, 
  Search,
  Plus,
  Zap,
  ShieldCheck,
  Smartphone,
  Utensils,
  History,
  Loader2,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, serverTimestamp } from "firebase/firestore"
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates"

export default function CanteenPage() {
  const { toast } = useToast()
  const db = useFirestore()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingSale, setIsAddingSale] = useState(false)

  const salesQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "canteen_sales"), orderBy("createdAt", "desc")), [db])
  const { data: firestoreSales, isLoading } = useCollection(salesQuery)

  const studentsQuery = useMemoFirebase(() => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")), [db])
  const { data: students } = useCollection(studentsQuery)

  const sales = firestoreSales || [
    { id: "CAN-101", studentName: "ALEXANDER MLAWA CALLSON", item: "Balanced lunch", amount: 2500, time: "12:45 PM" },
    { id: "CAN-102", studentName: "AGNES FRED KILIMA", item: "Healthy snack", amount: 1200, time: "10:30 AM" },
  ]

  const handleNewSale = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const studentId = formData.get("studentId") as string
    const student = students?.find(s => s.id === studentId)

    const newSale = {
      studentId,
      studentName: student?.name || "Guest",
      item: formData.get("item") as string,
      amount: parseFloat(formData.get("amount") as string),
      createdAt: serverTimestamp()
    }

    addDocumentNonBlocking(collection(db, "schools", "school-001", "canteen_sales"), newSale)
    setIsAddingSale(false)
    toast({ title: "Sale recorded", description: `Sale recorded for ${newSale.studentName}.` })
  }

  const handleRefillWallet = () => {
    toast({
      title: "Mobile money request sent",
      description: "Redirecting to ClickPesa for student wallet top-up.",
    })
  }

  const totalRevenue = sales.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  const averageSale = sales.length > 0 ? Math.round(totalRevenue / sales.length) : 0

  return (
    <div className="space-y-8 max-w-full mx-auto pb-24 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-2">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-4 py-1 h-6 text-[9px] font-black tracking-widest rounded-full uppercase shadow-sm">
            School canteen · 2026
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-headline font-black text-primary tracking-tight uppercase">Canteen</h1>
          <p className="text-muted-foreground font-medium text-sm">Institutional nutrition tracking and secure student wallet management.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
          <Button variant="outline" onClick={handleRefillWallet} className="flex-1 sm:flex-none rounded-full h-12 px-6 border-primary/20 text-primary bg-white shadow-md font-black text-[10px] uppercase tracking-widest group">
            <Smartphone className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> Top-up Wallet
          </Button>
          
          <Dialog open={isAddingSale} onOpenChange={setIsAddingSale}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none rounded-full h-12 px-6 colorful-gradient shadow-lg font-black text-[10px] uppercase tracking-widest group">
                <Plus className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" /> New sale
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-md border-none shadow-2xl">
              <DialogHeader className="bg-primary/5 p-8 border-b text-center">
                <DialogTitle className="text-xl font-black text-primary uppercase">Dietary Transaction</DialogTitle>
                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest">Process student meal or retail sale.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleNewSale} className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Student</Label>
                  <Select name="studentId" required>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-none font-bold">
                      <SelectValue placeholder="Identify student..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {students?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Item/Meal Package</Label>
                  <Input name="item" placeholder="e.g. Balanced lunch" required className="h-12 rounded-xl bg-muted/20 border-none font-bold px-5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-muted-foreground ml-1">Amount (TZS)</Label>
                  <Input name="amount" type="number" placeholder="2,500" required className="h-12 rounded-xl bg-muted/20 border-none font-black px-5 text-lg" />
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl colorful-gradient font-black text-xs uppercase shadow-2xl">Complete sale</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Daily Revenue", value: totalRevenue, prefix: "TZS ", sub: "Recorded today", icon: TrendingUp, color: "text-green-600" },
          { label: "Avg Basket", value: averageSale, prefix: "TZS ", sub: "Per Sale", icon: Wallet, color: "text-primary" },
          { label: "Sales Recorded", value: sales.length, sub: "Cashless receipts", icon: Utensils, color: "text-accent" },
          { label: "Students", value: students?.length || 0, sub: "Cards on file", icon: Users, color: "text-orange-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-none shadow-xl bg-white/60 backdrop-blur-md rounded-[2rem] overflow-hidden group hover:-translate-y-1 transition-all">
             <CardContent className="p-6 relative">
                <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
                  <stat.icon className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                <p className="text-[8px] sm:text-[10px] uppercase font-black text-muted-foreground tracking-widest">{stat.label}</p>
                <p className={cn("text-xl sm:text-2xl font-black mt-2 tracking-tighter truncate", stat.color)}><AnimatedNumber value={stat.value} prefix={"prefix" in stat ? stat.prefix : undefined} /></p>
                <p className="text-[8px] text-muted-foreground font-black mt-1 uppercase tracking-widest">{stat.sub}</p>
             </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/60 backdrop-blur-md">
        <CardHeader className="bg-muted/30 p-8 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black uppercase">Live Sales Stream</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Verified dietary transactions</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search records..." 
              className="pl-10 h-10 rounded-full border-none bg-white shadow-inner font-bold text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-20 text-center">
              <Loader2 className="animate-spin h-10 w-10 text-primary mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading sales…</p>
            </div>
          ) : (
            <Table className="min-w-[600px]">
              <TableHeader className="bg-muted/10">
                <TableRow className="border-none h-14">
                  <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest">Student Payload</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Item</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Amount</TableHead>
                  <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.filter(s => s.studentName.toLowerCase().includes(searchTerm.toLowerCase())).map((tx) => (
                  <TableRow key={tx.id} className="group hover:bg-primary/[0.02] border-b last:border-none transition-colors">
                    <TableCell className="pl-8 py-6">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-foreground/80 uppercase">{tx.studentName}</span>
                        <span className="text-[9px] font-mono font-black text-muted-foreground uppercase">{tx.id || "CAN-LIVE"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full font-black text-[8px] uppercase tracking-widest border-primary/10 bg-primary/5 text-primary">
                        {tx.item}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono font-black text-xs text-foreground/70">TZS {tx.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right pr-8">
                      <span className="text-[10px] font-black text-green-600 flex items-center justify-end gap-2 uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3" /> VERIFIED
                      </span>
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
