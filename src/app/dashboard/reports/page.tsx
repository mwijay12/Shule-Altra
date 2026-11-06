"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  GraduationCap, 
  Package, 
  Users, 
  Download, 
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
  History,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, orderBy, query } from "firebase/firestore";

// 1. Define Report Item structure
interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

// 2. Define the actual reports under each category
const financialReports: ReportItem[] = [
  { id: "fee-ledger", title: "Fee Collection Ledger", description: "Detailed record of all student payments and bank reconciliation references.", icon: DollarSign },
  { id: "expenditure", title: "Expenditure Summary", description: "Tracks institutional operational costs, petty cash, and procurement.", icon: TrendingUp },
  { id: "defaulters", title: "Fee Defaulters List", description: "Audit of students with outstanding balances for recovery actions.", icon: AlertTriangle },
];

const academicReports: ReportItem[] = [
  { id: "class-rank", title: "Class Performance Ranking", description: "Comparative analysis of average scores across all academic tiers.", icon: GraduationCap },
  { id: "subject-analysis", title: "Subject Analysis Matrix", description: "Pass rates and grade distribution breakdown per subject node.", icon: FileText },
  { id: "master-sheet", title: "Master Grade Sheet", description: "Unified export of all student results for the current term.", icon: FileText },
];

const operationsReports: ReportItem[] = [
  { id: "canteen-log", title: "Canteen Usage Log", description: "Tracking of cashless transactions and dietary consumption.", icon: Package },
  { id: "asset-register", title: "Asset Register", description: "Verified audit ledger of all school property and equipment.", icon: Package },
];

const adminReports: ReportItem[] = [
  { id: "staff-attendance", title: "Staff Attendance Summary", description: "Monthly personnel node report including clock-in data.", icon: Users },
  { id: "student-attendance", title: "Student Attendance Trends", description: "Longitudinal audit of presence rates and absenteeism warnings.", icon: Users },
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const db = useFirestore();

  const studentsQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "students"), orderBy("name", "asc")),
    [db]
  );
  const { data: students } = useCollection<any>(studentsQuery);

  const handleGenerate = (report: ReportItem) => {
    setLoadingId(report.id);
    
    // Simulate generation delay
    setTimeout(() => {
      setLoadingId(null);
      toast({
        title: "Report Generated",
        description: `${report.title} has been successfully compiled.`,
      });

      // Live CSV export for the fee defaulters report
      if (report.id === "defaulters") {
         const defaulters = (students || []).filter((student: any) => (student.balance || 0) > 0);
         const rows = defaulters.map((student: any) => {
           const balance = student.balance || 0;
           const status = balance >= 300000 ? "Critical" : balance >= 100000 ? "Partial" : "Watch";
           return `${student.name},${student.class},${balance},${status}`;
         });
         const csvContent = `data:text/csv;charset=utf-8,Student Name,Class,Balance (TZS),Status\n${rows.join("\n")}`;
         const encodedUri = encodeURI(csvContent);
         const link = document.createElement("a");
         link.setAttribute("href", encodedUri);
         link.setAttribute("download", "ShuleAltra_Defaulters_Audit.csv");
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      }

    }, 1500);
  };

  const renderReportList = (reports: ReportItem[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map((report) => (
        <Card key={report.id} className="glass-card hover:shadow-lg transition-all duration-300 border-primary/10">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/5 text-primary shadow-inner">
              <report.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-[10px] sm:text-xs uppercase tracking-widest">{report.title}</h3>
              <p className="text-[10px] text-muted-foreground mt-1 mb-4 leading-relaxed font-medium">{report.description}</p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleGenerate(report)}
                disabled={loadingId === report.id}
                className="rounded-full h-9 px-6 font-black text-[9px] uppercase border-primary/20 text-primary hover:bg-primary/5 transition-all"
              >
                {loadingId === report.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                ) : (
                  <Download className="h-3 w-3 mr-2" />
                )}
                {loadingId === report.id ? "Compiling..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-24 font-body">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-1">
          <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full">
            <Zap className="h-2.5 w-2.5 mr-1.5" /> Institutional Hub
          </Badge>
          <h1 className="text-xl sm:text-2xl font-black text-primary uppercase tracking-tight">Reports Center</h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest leading-none">Generate and export system-wide analytics and records.</p>
        </div>
        <Button variant="outline" className="rounded-full h-11 border-primary/20 text-primary bg-white shadow-sm font-black text-[9px] uppercase px-8">
          <History className="mr-2 h-4 w-4" /> Audit History
        </Button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 px-1">
        <Card className="colorful-gradient text-white border-none shadow-xl rounded-[2rem] overflow-hidden group">
          <CardContent className="p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform">
              <DollarSign className="h-20 w-20" />
            </div>
            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Total Fee Collection</p>
            <h2 className="text-2xl font-black mt-2">TZS 45,500,000</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-none font-black text-[8px] rounded-full">82% TARGET</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/10 shadow-lg rounded-[2rem] overflow-hidden group">
          <CardContent className="p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
              <TrendingUp className="h-20 w-20" />
            </div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Overall Pass Rate</p>
            <h2 className="text-2xl font-black text-primary mt-2">78.4%</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-green-100 text-green-700 border-none font-black text-[8px] rounded-full">↑ 2.1% TREND</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-primary/10 shadow-lg rounded-[2rem] overflow-hidden group">
          <CardContent className="p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:rotate-12 transition-transform">
              <Package className="h-20 w-20" />
            </div>
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Inventory Status</p>
            <h2 className="text-2xl font-black text-green-600 mt-2">Optimal</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-orange-100 text-orange-600 border-none font-black text-[8px] rounded-full">3 ITEMS LOW</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CATEGORIZED REPORTS */}
      <Tabs defaultValue="financial" className="px-1 space-y-8">
        <TabsList className="bg-muted/40 p-1 rounded-2xl w-full flex h-auto border border-muted/50 shadow-inner overflow-x-auto">
          <TabsTrigger value="financial" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Financial</TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Academic</TabsTrigger>
          <TabsTrigger value="operations" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Operations</TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl font-black text-[9px] flex-1 py-3 uppercase tracking-widest">Admin</TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(financialReports)}
        </TabsContent>
        <TabsContent value="academic" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(academicReports)}
        </TabsContent>
        <TabsContent value="operations" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(operationsReports)}
        </TabsContent>
        <TabsContent value="admin" className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(adminReports)}
        </TabsContent>
      </Tabs>
    </div>
  );
}