"use client";

/**
 * @fileOverview Reports centre, every "generate" action produces a real vector
 * PDF (letterhead + crest, metadata, summary cards, tables, signatures).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { currencySpec } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { ChartPanel, FeesByClass, AttendanceByClass } from "@/components/admin/module-charts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  GENERATED_DOCUMENTS,
  ROLE_LABEL,
  canGenerateDocument,
  canOpenDocument,
  type DocRole,
} from "@/lib/documents/registry";
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
  ShieldCheck,
  Receipt,
  ClipboardList,
  IdCard,
  Building2,
  UtensilsCrossed,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, orderBy, query, limit } from "firebase/firestore";
import {
  buildAttendanceRows,
  buildPerLearnerScores,
  buildReportPayload,
} from "@/lib/reports/builders";
import { WaveSection } from '@/components/motion/wave-section';

interface ReportItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const financialReports: ReportItem[] = [
  { id: "fee-ledger", title: "Fee Collection Ledger", description: "Every captured payment with gateway reference, method and reconciliation status.", icon: DollarSign },
  { id: "expenditure", title: "Expenditure Summary", description: "Petty cash requests by department, approval state and value.", icon: TrendingUp },
  { id: "defaulters", title: "Fee Defaulters Register", description: "Outstanding balances in merit order, ready for the bursar's recovery list.", icon: AlertTriangle },
];

const academicReports: ReportItem[] = [
  { id: "class-rank", title: "Class Performance Ranking", description: "Cohort averages, division and fee status in merit order.", icon: GraduationCap },
  { id: "subject-analysis", title: "Subject analysis", description: "Mean score, pass rate and grade spread for every subject.", icon: FileText },
  { id: "master-sheet", title: "Master Grade Sheet", description: "Landscape matrix of every learner against every assessed subject.", icon: ClipboardList, badge: "A4 landscape" },
];

const operationsReports: ReportItem[] = [
  { id: "canteen-log", title: "Canteen Usage Log", description: "Cashless wallet sales by learner, item and value.", icon: UtensilsCrossed },
  { id: "asset-register", title: "Asset Register", description: "Verified audit ledger of school property, condition and book value.", icon: Package },
];

const adminReports: ReportItem[] = [
  { id: "staff-attendance", title: "Staff Establishment Summary", description: "Personnel roster with department, contact and employment state.", icon: Users },
  { id: "student-attendance", title: "Student Attendance Register", description: "Per-learner presence, lateness and absence over the term.", icon: Building2 },
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
    () => query(collection(db, "schools", "school-001", "grades"), limit(3000)),
    [db]
  );
  const { data: grades } = useCollection<any>(gradesQuery);

  const attendanceQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "attendance"), limit(1500)),
    [db]
  );
  const { data: attendance } = useCollection<any>(attendanceQuery);

  const transactionsQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "transactions"), orderBy("createdAt", "desc"), limit(240)),
    [db]
  );
  const { data: transactions } = useCollection<any>(transactionsQuery);

  const pettyQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "petty_cash"), limit(200)),
    [db]
  );
  const { data: petty } = useCollection<any>(pettyQuery);

  const canteenQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "canteen_sales"), limit(300)),
    [db]
  );
  const { data: canteen } = useCollection<any>(canteenQuery);

  const assetsQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "assets"), limit(300)),
    [db]
  );
  const { data: assets } = useCollection<any>(assetsQuery);

  const staffQuery = useMemoFirebase(
    () => query(collection(db, "schools", "school-001", "staff"), limit(200)),
    [db]
  );
  const { data: staff } = useCollection<any>(staffQuery);

  const learners = (students || []) as any[];
  const ledger = (transactions || []) as any[];
  const gradeRows = (grades || []) as any[];
  const attendanceRows = (attendance || []) as any[];

  const totalCollected = learners.reduce((sum, student) => sum + Number(student.totalPaid || 0), 0);
  const totalOutstanding = learners.reduce((sum, student) => sum + Number(student.balance || 0), 0);
  const collectionRate =
    totalCollected + totalOutstanding > 0
      ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 100)
      : 0;

  const overallPassRate = gradeRows.length > 0
    ? gradeRows.filter((row) => Number(row.score) >= 45).length / gradeRows.length * 100
    : 0;

  const perLearnerScores = useMemo(
    () => buildPerLearnerScores(learners, gradeRows),
    [learners, gradeRows]
  );

  const reportData = useMemo(
    () => ({
      learners,
      ledger,
      gradeRows,
      attendanceRows,
      petty: (petty || []) as any[],
      canteen: (canteen || []) as any[],
      assets: (assets || []) as any[],
      staff: (staff || []) as any[],
      perLearnerScores,
      collectionRate,
    }),
    [learners, ledger, gradeRows, attendanceRows, petty, canteen, assets, staff, perLearnerScores, collectionRate]
  );

  const buildRankingRows = () =>
    perLearnerScores.map((row, index) => ({ ...row, rank: index + 1 }));

  const attendanceSummary = () => buildAttendanceRows(learners, attendanceRows);

  const generate = async (report: ReportItem) => {
    setLoadingId(report.id);
    try {
      if (report.id === "class-rank") {
        const { downloadClassRanking } = await import("@/lib/pdf/class-report");
        const rows = buildRankingRows();
        if (rows.length === 0) throw new Error("No assessment records found for this term.");
        await downloadClassRanking(rows, { term: "Term 2", academicYear: "2026", className: "All streams" });
      } else if (report.id === "student-attendance") {
        const { downloadAttendanceRegister } = await import("@/lib/pdf/class-report");
        await downloadAttendanceRegister(attendanceSummary(), {
          className: "All streams",
          from: new Date(Date.now() - 90 * 86_400_000).toLocaleDateString("en-GB"),
          to: new Date().toLocaleDateString("en-GB"),
        });
      } else {
        const { downloadTabularReport } = await import("@/lib/pdf/tabular-report");
        const payload = buildReportPayload(report.id, reportData);
        if (!payload) throw new Error("This report is not configured yet.");
        const fileName = `${report.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
        await downloadTabularReport(payload, fileName);
      }
      toast({
        title: `${report.title} ready`,
        description: "Vector PDF generated · letterhead, crest and selectable text.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${report.title} failed`,
        description: error instanceof Error ? error.message : "Unexpected export error",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const { role: authRole, canAccess } = useAuth();
  const CURRENCY = currencySpec();
  const role = (authRole ?? null) as DocRole | null;

  const printables = [
    {
      id: "ranking",
      title: "Class merit ranking",
      detail: "Cohort averages, divisions and fee status in merit order.",
      icon: GraduationCap,
      run: async () => {
        const { downloadClassRanking } = await import("@/lib/pdf/class-report");
        return downloadClassRanking(buildRankingRows(), { term: "Term 2", academicYear: "2026", className: "All streams" });
      },
    },
    {
      id: "register",
      title: "Attendance register",
      detail: "Per-learner presence, lateness and absence over the term.",
      icon: ClipboardList,
      run: async () => {
        const { downloadAttendanceRegister } = await import("@/lib/pdf/class-report");
        return downloadAttendanceRegister(attendanceSummary(), {
          className: "All streams",
          from: new Date(Date.now() - 90 * 86_400_000).toLocaleDateString("en-GB"),
          to: new Date().toLocaleDateString("en-GB"),
        });
      },
    },
    {
      id: "statements",
      title: "Fee statements (top 8)",
      detail: "Bursar-ready statements for the largest outstanding balances.",
      icon: Receipt,
      run: async () => {
        const { downloadFeeStatement } = await import("@/lib/pdf/fee-statement");
        const debtors = [...learners]
          .filter((learner) => Number(learner.balance ?? 0) > 0)
          .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
          .slice(0, 8);
        for (const learner of debtors) {
          await downloadFeeStatement(learner, ledger.filter((row) => row.studentId === learner.id), {
            term: "Term 2",
            academicYear: "2026",
          });
        }
      },
    },
    {
      id: "ids",
      title: "Learner ID cards",
      detail: "A4 sheet with crop marks, crest and learner ID QR.",
      icon: IdCard,
      run: async () => {
        const { downloadIdCards } = await import("@/lib/pdf/id-card");
        return downloadIdCards(learners.slice(0, 12));
      },
    },
  ];

  const allowedPrintables = printables.filter((job) => canGenerateDocument(role, job.id));

  const runPrintable = async (job: (typeof printables)[number]) => {
    if (!canGenerateDocument(role, job.id)) {
      const policy = GENERATED_DOCUMENTS[job.id];
      toast({
        variant: "destructive",
        title: "Not your document to build",
        description: `“${job.title}” carries ${policy?.reason.toLowerCase() ?? "restricted data"}, so it stays with ${(policy?.roles ?? [])
          .map((allowed) => ROLE_LABEL[allowed])
          .join(", ")}.`,
      });
      return;
    }
    setLoadingId(job.id);
    try {
      await job.run();
      toast({ title: `${job.title} ready`, description: "Vector PDF downloaded." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: `${job.title} failed`,
        description: error instanceof Error ? error.message : "Unexpected export error",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const renderReportList = (reports: ReportItem[]) => (
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map((report) => (
        <Card key={report.id} className="glass-panel border-border/60 hover-lift">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/8 text-primary">
              <report.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[13px] sm:text-xs text-foreground">{report.title}</h3>
                {report.badge && (
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {report.badge}
                  </span>
                )}
              </div>
              <p className="text-[13px] text-muted-foreground mt-1 mb-4 leading-relaxed font-medium">{report.description}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generate(report)}
                disabled={loadingId === report.id}
                className="rounded-full h-9 px-5 font-semibold text-[12px] border-primary/20 text-primary hover:bg-primary/5"
              >
                {loadingId === report.id ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-2" />
                ) : (
                  <Download className="h-3 w-3 mr-2" />
                )}
                {loadingId === report.id ? "Building PDF…" : "Generate PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-24 font-body">
      <WaveSection as="div" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 px-1">
        <div className="space-y-1">
          <Badge data-wave="badge" variant="outline" className="border-primary/20 bg-primary/5 text-primary px-3 py-0.5 text-[11px] font-semibold rounded-full">
            <Zap className="h-2.5 w-2.5 mr-1.5" /> Reports centre
          </Badge>
          <h1 data-wave="heading" className="text-xl sm:text-2xl font-semibold text-primary tracking-tight">Reports Center</h1>
          <p data-wave="subcopy" className="text-muted-foreground text-[13px] font-bold leading-none">
            Every report is a real vector PDF — letterhead, crest and selectable text.
          </p>
        </div>
        {canAccess('audit') ? (
          <Button asChild variant="outline" className="rounded-full h-11 border-border/70 text-primary bg-card shadow-sm font-semibold text-[12px] px-8">
            <Link href="/dashboard/audit">
              <History className="mr-2 h-4 w-4" /> Audit trail
            </Link>
          </Button>
        ) : null}
      </WaveSection>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 px-1">
        <StatCard
          index={0}
          label="Total fee collection"
          value={totalCollected}
          prefix={`${CURRENCY.code} `}
          tone="primary"
          icon={DollarSign}
          progress={collectionRate}
          sub={`${collectionRate}% of what was billed`}
        />
        <StatCard
          index={1}
          label="Overall pass rate"
          value={overallPassRate}
          format={(n) => (gradeRows.length > 0 ? n.toFixed(1) : '—')}
          suffix={gradeRows.length > 0 ? '%' : ''}
          tone="emerald"
          icon={GraduationCap}
          progress={overallPassRate}
          sub={gradeRows.length > 0 ? `${gradeRows.length} recorded marks` : 'No marks recorded yet'}
        />
        <StatCard
          index={2}
          label="Still outstanding"
          value={totalOutstanding}
          prefix={`${CURRENCY.code} `}
          tone={totalOutstanding > 0 ? 'amber' : 'emerald'}
          icon={Receipt}
          sub={`${learners.filter((l) => Number(l.balance) > 0).length} learners carry a balance`}
        />
      </div>

      <div className="grid gap-4 px-1 lg:grid-cols-2">
        <ChartPanel title="Collected against owed" hint="Per class, from the live register." data-reveal>
          <FeesByClass students={learners} />
        </ChartPanel>
        <ChartPanel title="Presence by class" hint="From the recorded register." data-reveal>
          <AttendanceByClass students={attendanceRows.length > 0 ? learners : []} />
        </ChartPanel>
      </div>

      <div className="px-1 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[12px] font-semibold text-muted-foreground">Vector printables</p>
            <h2 className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" /> Real documents, not screenshots
            </h2>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-semibold text-[11px] rounded-full">
            pdf-lib · selectable text
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {allowedPrintables.map((job) => (
            <div key={job.id} className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <job.icon className="h-4 w-4" />
              </span>
              <p className="text-[13px] font-semibold text-foreground">{job.title}</p>
              <p className="text-[12px] font-medium leading-relaxed text-muted-foreground flex-1">{job.detail}</p>
              <Button
                size="sm"
                onClick={() => runPrintable(job)}
                disabled={loadingId !== null}
                className="rounded-full h-8 font-semibold text-[11px] colorful-gradient text-white"
              >
                {loadingId === job.id ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Download className="h-3 w-3 mr-1.5" />}
                {loadingId === job.id ? "Building..." : "Download PDF"}
              </Button>
            </div>
          ))}
        </div>

        {allowedPrintables.length < printables.length && (
          <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-[12px] font-medium leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            {printables.length - allowedPrintables.length} of these builders are hidden for your role
            ({role ? ROLE_LABEL[role] : "guest"}) — fee statements need finance, ID sheets need an
            administrator.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground">Reference samples (pre-generated; colours do not change with the theme):</span>
          {[
            { file: "fee-statement.pdf", label: "Fee statement" },
            { file: "report-card.pdf", label: "Report card" },
            { file: "class-ranking.pdf", label: "Ranking" },
            { file: "attendance-register.pdf", label: "Register" },
            { file: "learner-id-cards.pdf", label: "ID sheet" },
            { file: "timetable.pdf", label: "Timetable" },
            { file: "reports/fee-ledger.pdf", label: "Ledger report" },
          ].map((sample) => {
            const allowed = canOpenDocument(role, sample.file);
            return allowed ? (
              <a
                key={sample.file}
                href={`/printables/${sample.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                {sample.label}
              </a>
            ) : (
              <span
                key={sample.file}
                title="Restricted to another role"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground/50"
              >
                <ShieldCheck className="h-2.5 w-2.5" />
                {sample.label}
              </span>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="financial" className="px-1 space-y-6">
        <TabsList className="bg-muted/40 p-1.5 rounded-2xl w-full flex h-auto border border-border/60 overflow-x-auto gap-1">
          <TabsTrigger value="financial" className="rounded-xl font-semibold text-[12px] flex-1 py-3">Financial</TabsTrigger>
          <TabsTrigger value="academic" className="rounded-xl font-semibold text-[12px] flex-1 py-3">Academic</TabsTrigger>
          <TabsTrigger value="operations" className="rounded-xl font-semibold text-[12px] flex-1 py-3">Operations</TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl font-semibold text-[12px] flex-1 py-3">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(financialReports)}
        </TabsContent>
        <TabsContent value="academic" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(academicReports)}
        </TabsContent>
        <TabsContent value="operations" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(operationsReports)}
        </TabsContent>
        <TabsContent value="admin" className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {renderReportList(adminReports)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
