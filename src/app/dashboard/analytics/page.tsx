'use client';

/**
 * @fileOverview Analytics studio — cross-module intelligence with live filters and
 * vector PDF exports (merit ranking + attendance register).
 */

import * as React from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, GraduationCap, Loader2, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { KpiCard } from '@/components/admin/kpi-card';
import { RevenueChart, formatCompactTzs } from '@/components/admin/revenue-chart';
import { RANGE_OPTIONS, useRange, type RangeKey } from '@/components/admin/range-context';
import { downloadClassRanking, downloadAttendanceRegister } from '@/lib/pdf/class-report';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';

const PIE_COLORS = ['hsl(214 85% 58%)', 'hsl(264 82% 66%)', 'hsl(160 74% 44%)', 'hsl(38 90% 55%)', 'hsl(340 75% 60%)', 'hsl(190 80% 45%)'];

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export default function AnalyticsPage() {
  const db = useFirestore();
  const reducedMotion = useReducedMotion();
  const { toast } = useToast();
  const { range, setRange, days, label } = useRange();
  const [exporting, setExporting] = React.useState<'ranking' | 'register' | null>(null);

  const studentsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc'), limit(300)),
    [db]
  );
  const { data: students } = useCollection<any>(studentsQuery);

  const gradesQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'grades'), limit(1200)),
    [db]
  );
  const { data: grades } = useCollection<any>(gradesQuery);

  const transactionsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'transactions'), orderBy('createdAt', 'desc'), limit(240)),
    [db]
  );
  const { data: transactions } = useCollection<any>(transactionsQuery);

  const attendanceQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'attendance'), limit(900)),
    [db]
  );
  const { data: attendance } = useCollection<any>(attendanceQuery);

  const learners = (students ?? []) as any[];
  const ledger = (transactions ?? []) as any[];
  const gradeRows = (grades ?? []) as any[];
  const attendanceRows = (attendance ?? []) as any[];

  const perLearner = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    gradeRows.forEach((row) => {
      const key = row.studentId;
      if (!key) return;
      const current = map.get(key) ?? { total: 0, count: 0 };
      current.total += Number(row.score ?? 0);
      current.count += 1;
      map.set(key, current);
    });
    return learners
      .map((learner) => {
        const stat = map.get(learner.id);
        const average = stat && stat.count > 0 ? stat.total / stat.count : 0;
        return {
          id: learner.id,
          name: learner.name ?? 'Unnamed',
          className: learner.className ?? 'Unassigned',
          admissionNumber: learner.admissionNumber ?? learner.id,
          average,
          division:
            average >= 75 ? 'I' : average >= 65 ? 'II' : average >= 55 ? 'III' : average >= 45 ? 'IV' : 'V',
          balance: Number(learner.balance ?? 0),
        };
      })
      .filter((row) => row.average > 0);
  }, [gradeRows, learners]);

  const classPerformance = React.useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    perLearner.forEach((row) => {
      const current = map.get(row.className) ?? { total: 0, count: 0 };
      current.total += row.average;
      current.count += 1;
      map.set(row.className, current);
    });
    return Array.from(map.entries())
      .map(([className, stat]) => ({
        className,
        average: Number((stat.total / stat.count).toFixed(1)),
        cohort: stat.count,
      }))
      .sort((a, b) => b.average - a.average);
  }, [perLearner]);

  const paymentMix = React.useMemo(() => {
    const map = new Map<string, number>();
    ledger
      .filter((row) => row.status !== 'Failed')
      .forEach((row) => {
        const key = row.paymentMethod ?? 'Control Number';
        map.set(key, (map.get(key) ?? 0) + Number(row.amount ?? 0));
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [ledger]);

  const presenceTrend = React.useMemo(() => {
    const buckets: Array<{ label: string; rate: number; moves: number }> = [];
    for (let index = days - 1; index >= 0; index -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - index);
      const next = new Date(day.getTime() + 86_400_000);
      const rows = attendanceRows.filter((row) => {
        const created = toDate(row.createdAt) ?? (row.date ? new Date(row.date) : null);
        return created && created >= day && created < next;
      });
      const present = rows.filter((row) => row.status === 'Present').length;
      buckets.push({
        label: day.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        rate: rows.length > 0 ? Number(((present / rows.length) * 100).toFixed(1)) : 0,
        moves: rows.length,
      });
    }
    return buckets;
  }, [attendanceRows, days]);

  const summary = React.useMemo(() => {
    const average = perLearner.length
      ? perLearner.reduce((sum, row) => sum + row.average, 0) / perLearner.length
      : 0;
    const verified = ledger.filter((row) => row.status !== 'Pending' && row.status !== 'Failed');
    const ledgerCollected = verified.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const registerPaid = learners.reduce((sum, learner) => sum + Number(learner.totalPaid ?? 0), 0);
    const collected = registerPaid > 0 ? registerPaid : ledgerCollected;
    const outstanding = learners.reduce((sum, learner) => sum + Number(learner.balance ?? 0), 0);
    const rate = collected + outstanding > 0 ? (collected / (collected + outstanding)) * 100 : 0;
    const presence = presenceTrend.filter((row) => row.moves > 0);
    const presenceRate = presence.length
      ? presence.reduce((sum, row) => sum + row.rate, 0) / presence.length
      : 0;
    const defaulters = learners.filter((learner) => Number(learner.balance ?? 0) > 0).length;
    return { average, collected, rate, presenceRate, defaulters };
  }, [perLearner, ledger, learners, presenceTrend]);

  const exportRanking = React.useCallback(async () => {
    setExporting('ranking');
    try {
      await downloadClassRanking(
        perLearner.map((row, index) => ({ ...row, rank: index + 1 })),
        { term: 'Term 2', academicYear: '2026', className: 'All streams' }
      );
      toast({ title: 'Ranking PDF generated', description: `${perLearner.length} learners · vector PDF` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ranking export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExporting(null);
    }
  }, [perLearner, toast]);

  const exportRegister = React.useCallback(async () => {
    setExporting('register');
    try {
      const rows = learners.map((learner) => {
        const entries = attendanceRows.filter((row) => row.studentId === learner.id);
        const present = entries.filter((row) => row.status === 'Present').length;
        const late = entries.filter((row) => row.status === 'Late').length;
        const absent = entries.filter((row) => row.status === 'Absent').length;
        const total = entries.length;
        return {
          admissionNumber: learner.admissionNumber ?? learner.id,
          name: learner.name ?? 'Unnamed',
          className: learner.className ?? 'Unassigned',
          present,
          late,
          absent,
          rate: total > 0 ? (present / total) * 100 : 0,
        };
      });
      await downloadAttendanceRegister(rows, {
        className: 'All streams',
        from: new Date(Date.now() - days * 86_400_000).toLocaleDateString('en-GB'),
        to: new Date().toLocaleDateString('en-GB'),
      });
      toast({ title: 'Attendance register generated', description: 'Vector PDF · registry copy' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Register export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExporting(null);
    }
  }, [learners, attendanceRows, days, toast]);

  return (
    <div className="space-y-6">
      <section data-reveal className="glass-panel flex flex-col gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Intelligence studio
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-[15px] text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            {label} · <AnimatedNumber value={perLearner.length} /> learners with assessments
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-muted/25 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key as RangeKey)}
              className={cn(
                'rounded-xl px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] transition-colors',
                range === option.key
                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.short}
            </button>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Cohort average"
          value={summary.average}
          format={(value) => `${value.toFixed(1)}%`}
          delta={2.7}
          caption="all subjects"
          icon={GraduationCap}
          tone="primary"
          progress={summary.average}
        />
        <KpiCard
          label="Collection rate"
          value={summary.rate}
          format={(value) => `${value.toFixed(1)}%`}
          delta={5.1}
          caption="of billed fees"
          icon={TrendingUp}
          tone="emerald"
          progress={summary.rate}
        />
        <KpiCard
          label="Mean presence"
          value={summary.presenceRate}
          format={(value) => `${value.toFixed(1)}%`}
          delta={-0.6}
          caption="register window"
          icon={Users}
          tone="accent"
          progress={summary.presenceRate}
        />
        <KpiCard
          label="Fee defaulters"
          value={summary.defaulters}
          format={(value) => `${Math.round(value)} learners`}
          delta={-3.4}
          caption={`${learners.length} enrolled`}
          icon={Download}
          tone="amber"
          progress={learners.length ? (summary.defaulters / learners.length) * 100 : 0}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <RevenueChart transactions={ledger} />

        <div data-reveal className="glass-panel rounded-3xl p-4 sm:p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Payment mix
          </p>
          <h3 className="mt-1 text-[13px] text-foreground">Gateway share by value</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  isAnimationActive={!reducedMotion}
                  animationDuration={700}
                >
                  {paymentMix.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `TZS ${Number(value).toLocaleString('en-US')}`}
                  contentStyle={{ borderRadius: 16, fontSize: 10, fontWeight: 700 }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(value) => <span style={{ fontSize: 9, fontWeight: 800 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div data-reveal className="glass-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                Academic performance
              </p>
              <h3 className="mt-1 text-[13px] text-foreground">Average score by stream</h3>
            </div>
            <button
              type="button"
              onClick={exportRanking}
              disabled={exporting !== null || perLearner.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              {exporting === 'ranking' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Ranking PDF
            </button>
          </div>
          <div className="mt-3 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classPerformance} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(214 85% 62%)" />
                    <stop offset="100%" stopColor="hsl(264 82% 66%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="className"
                  tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: number, key) => (key === 'average' ? [`${value}%`, 'Average'] : [value, 'Cohort'])}
                  contentStyle={{ borderRadius: 16, fontSize: 10, fontWeight: 700 }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                />
                <Bar dataKey="average" fill="url(#barFill)" radius={[8, 8, 0, 0]} isAnimationActive={!reducedMotion}
                  animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div data-reveal className="glass-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                Attendance
              </p>
              <h3 className="mt-1 text-[13px] text-foreground">Presence trend</h3>
            </div>
            <button
              type="button"
              onClick={exportRegister}
              disabled={exporting !== null || learners.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              {exporting === 'register' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
              Register PDF
            </button>
          </div>
          <div className="mt-3 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={presenceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -26 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={18}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={formatCompactTzs}
                  tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Presence']}
                  contentStyle={{ borderRadius: 16, fontSize: 10, fontWeight: 700 }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(160 74% 44%)"
                  strokeWidth={2.4}
                  dot={false}
                  isAnimationActive={!reducedMotion}
                  animationDuration={700}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
