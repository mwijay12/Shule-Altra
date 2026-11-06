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
  Zap,
  IdCard,
  ClipboardList,
  Receipt,
  FileDown,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, orderBy, query, limit } from "firebase/firestore";
import { downloadClassRanking, downloadAttendanceRegister } from "@/lib/pdf/class-report";
import { downloadIdCards } from "@/lib/pdf/id-card";
import { downloadFeeStatement } from "@/lib/pdf/fee-statement";

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

  const gradesQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "grades"), limit(1200)),
    [db]
  );
  const { data: grades } = useCollection<any>(gradesQuery);

  const attendanceQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "attendance"), limit(900)),
    [db]
  );
  const { data: attendance } = useCollection<any>(attendanceQuery);

  const transactionsQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "transactions"), orderBy("createdAt", "desc"), limit(240)),
    [db]
  );
  const { data: transactions } = useCollection<any>(transactionsQuery);

  const [printableJob, setPrintableJob] = useState<string | null>(null);

  const totalCollected = (students || []).reduce((sum: number, student: any) => sum + (student.totalPaid || 0), 0);
  const totalOutstanding = (students || []).reduce((sum: number, student: any) => sum + (student.balance || 0), 0);
  const collectionRate = totalCollected + totalOutstanding > 0
    ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
    : 0;

  const learners = (students || []) as any[];
  const ledger = (transactions || []) as any[];

  const printables = [
    {
      id: "ranking",
      title: "Class merit ranking",
      detail: "Cohort averages, divisions and fee status in merit order.",
      icon: GraduationCap,
      run: async () => {
        const totals = new Map<string, { total: number; count: number }>();
        ((grades || []) as any[]).forEach((row) => {
          const key = row.studentId;
          if (!key) return;
          const current = totals.get(key) ?? { total: 0, count: 0 };
          current.total += Number(row.score ?? 0);
          current.count += 1;
          totals.set(key, current);
        });
        const rows = learners
          .map((learner) => {
            const stat = totals.get(learner.id);
            const average = stat && stat.count > 0 ? stat.total / stat.count : 0;
            return {
              rank: 0,
              name: learner.name ?? "Unnamed",
              admissionNumber: learner.admissionNumber ?? learner.id,
              className: learner.className ?? learner.class ?? "Unassigned",
              average,
              division: average >= 75 ? "I" : average >= 65 ? "II" : average >= 55 ? "III" : average >= 45 ? "IV" : "V",
              balance: Number(learner.balance ?? 0),
            };
          })
          .filter((row) => row.average > 0)
          .sort((a, b) => b.average - a.average)
          .map((row, index) => ({ ...row, rank: index + 1 }));
        await downloadClassRanking(rows, { term: "Term 2", academicYear: "2026", className: "All streams" });
        toast({ title: "Ranking PDF ready", description: `${rows.length} learners ranked · vector PDF` });
      },
    },
    {
      id: "register",
      title: "Attendance register",
      detail: "Per-learner presence, lateness and absence over the term.",
      icon: ClipboardList,
      run: async () => {
        const rows = learners.map((learner) => {
          const entries = ((attendance || []) as any[]).filter((row) => row.studentId === learner.id);
          const present = entries.filter((row) => row.status === "Present").length;
          const late = entries.filter((row) => row.status === "Late").length;
          const absent = entries.filter((row) => row.status === "Absent").length;
          const total = entries.length;
          return {
            admissionNumber: learner.admissionNumber ?? learner.id,
            name: learner.name ?? "Unnamed",
            className: learner.className ?? "Unassigned",
            present,
            late,
            absent,
            rate: total > 0 ? (present / total) * 100 : 0,
          };
        });
        await downloadAttendanceRegister(rows, {
          className: "All streams",
          from: new Date(Date.now() - 90 * 86_400_000).toLocaleDateString("en-GB"),
          to: new Date().toLocaleDateString("en-GB"),
        });
        toast({ title: "Register PDF ready", description: "Vector PDF · registry copy" });
      },
    },
    {
      id: "statements",
      title: "Fee statements (top 8)",
      detail: "Bursar-ready statements for the largest outstanding balances.",
      icon: Receipt,
      run: async () => {
        const debtors = [...learners]
          .filter((learner) => Number(learner.balance ?? 0) > 0)
          .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
          .slice(0, 8);
        if (debtors.length === 0) {
          toast({ title: "Nothing to issue", description: "Every learner is cleared." });
          return;
        }
        for (const learner of debtors) {
          await downloadFeeStatement(learner, ledger.filter((row) => row.studentId === learner.id), {
            term: "Term 2",
            academicYear: "2026",
          });
        }
        toast({ title: "Statements generated", description: `${debtors.length} vector PDFs downloaded.` });
      },
    },
    {
      id: "ids",
      title: "Learner ID cards",
      detail: "A4 2-up print sheet with crop marks and QR verification.",
      icon: IdCard,
      run: async () => {
        await downloadIdCards(learners.slice(0, 12), { term: "Term 2 2026" });
        toast({ title: "ID cards generated", description: "12 cards · vector PDF" });
      },
    },
  ] as const;

  const runPrintable = async (job: (typeof printables)[number]) => {
    setPrintableJob(job.id);
    try {
      await job.run();
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${job.title} failed`,
        description: error instanceof Error ? error.message : "Unexpected export error",
      });
    } finally {
      setPrintableJob(null);
    }
  };

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
            <h2 className="text-2xl font-black mt-2">TZS {totalCollected.toLocaleString()}</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-white/20 text-white border-none font-black text-[8px] rounded-full">{collectionRate}% OF BILLED</Badge>
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

      {/* VECTOR PRINTABLES */}
      <div className="px-1 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">Vector printables</p>
            <h2 className="text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Real documents, not screenshots
            </h2>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-black text-[8px] uppercase tracking-widest rounded-full">
            pdf-lib · selectable text
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {printables.map((job) => (
            <div key={job.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <job.icon className="h-4 w-4" />
              </span>
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{job.title}</p>
              <p className="text-[9px] font-medium leading-relaxed text-muted-foreground flex-1">{job.detail}</p>
              <Button
                size="sm"
                onClick={() => runPrintable(job)}
                disabled={printableJob !== null}
                className="rounded-full h-8 font-black text-[8px] uppercase tracking-widest colorful-gradient text-white"
              >
                {printableJob === job.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <FileDown className="h-3 w-3 mr-1.5" />}
                {printableJob === job.id ? "Building..." : "Download PDF"}
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground">Sample output:</span>
          {[
            { file: "fee-statement.pdf", label: "Fee statement" },
            { file: "report-card.pdf", label: "Report card" },
            { file: "class-ranking.pdf", label: "Ranking" },
            { file: "attendance-register.pdf", label: "Register" },
            { file: "learner-id-cards.pdf", label: "ID sheet" },
          ].map((sample) => (
            <a
              key={sample.file}
              href={`/printables/${sample.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border/70 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              {sample.label}
            </a>
          ))}
        </div>
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