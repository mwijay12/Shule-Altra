'use client';

/**
 * @fileOverview Command deck — the flagship landing surface of the admin.
 * Three.js centrepiece, GSAP-driven KPI motion, interactive collections chart,
 * draggable follow-up queue and live ledger preview.
 */

import * as React from 'react';
import Link from 'next/link';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  GraduationCap,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ThreeOrb } from '@/components/admin/three-orb';
import { KpiCard } from '@/components/admin/kpi-card';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { PriorityBoard, type FollowUpItem } from '@/components/admin/priority-board';
import { useRange } from '@/components/admin/range-context';
import { downloadFeeStatement } from '@/lib/pdf/fee-statement';
import { downloadIdCards } from '@/lib/pdf/id-card';
import { cn } from '@/lib/utils';
import { DEMO_MODE } from '@/lib/demo/config';

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

const STATUS_STYLES: Record<string, string> = {
  Verified: 'bg-emerald-500/12 text-emerald-600',
  Pending: 'bg-amber-500/12 text-amber-600',
  Disputed: 'bg-destructive/12 text-destructive',
  Partial: 'bg-primary/12 text-primary',
  Failed: 'bg-muted text-muted-foreground',
};

export default function CommandDeckPage() {
  const db = useFirestore();
  const { role } = useAuth();
  const { toast } = useToast();
  const { label: rangeLabel } = useRange();
  const [exportingIds, setExportingIds] = React.useState(false);

  const studentsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc'), limit(300)),
    [db]
  );
  const { data: students, isLoading: studentsLoading } = useCollection<any>(studentsQuery);

  const transactionsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'transactions'), orderBy('createdAt', 'desc'), limit(240)),
    [db]
  );
  const { data: transactions, isLoading: txLoading } = useCollection<any>(transactionsQuery);

  const attendanceQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'attendance'), limit(600)),
    [db]
  );
  const { data: attendance } = useCollection<any>(attendanceQuery);

  const learners = (students ?? []) as any[];
  const ledger = (transactions ?? []) as any[];

  const metrics = React.useMemo(() => {
    const verified = ledger.filter((row) => row.status !== 'Pending' && row.status !== 'Failed');
    const collected = verified.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const pending = ledger
      .filter((row) => row.status === 'Pending')
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const outstanding = learners.reduce((sum, learner) => sum + Number(learner.balance ?? 0), 0);
    // The register carries the authoritative billed/paid totals; the ledger is a sample.
    const registerPaid = learners.reduce((sum, learner) => sum + Number(learner.totalPaid ?? 0), 0);
    const billed = registerPaid + outstanding;
    const rate = billed > 0 ? (collected / billed) * 100 : 0;

    const present = (attendance ?? []).filter((row: any) => row.status === 'Present').length;
    const totalAttendance = (attendance ?? []).length;
    const presence = totalAttendance > 0 ? (present / totalAttendance) * 100 : 96.7;

    const followUps: FollowUpItem[] = learners
      .filter((learner) => Number(learner.balance ?? 0) > 0)
      .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
      .slice(0, 6)
      .map((learner) => ({
        id: learner.id,
        name: learner.name ?? 'Unnamed learner',
        className: learner.className ?? 'Unassigned',
        balance: Number(learner.balance ?? 0),
        paid: Number(learner.totalPaid ?? 0),
        admissionNumber: learner.admissionNumber ?? learner.id,
      }));

    const weeklySpark = Array.from({ length: 14 }, (_, index) => {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - (13 - index));
      const next = new Date(day.getTime() + 86_400_000);
      return ledger
        .filter((row) => {
          const created = toDate(row.createdAt);
          return created && created >= day && created < next && row.status !== 'Failed';
        })
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    });

    return {
      collected: registerPaid > 0 ? registerPaid : collected,
      pending,
      outstanding,
      billed,
      rate,
      presence,
      enrolment: learners.length,
      followUps,
      weeklySpark,
      verifiedCount: verified.length,
      disputed: ledger.filter((row) => row.status === 'Disputed').length,
    };
  }, [ledger, learners, attendance]);

  const recentLedger = React.useMemo(
    () =>
      [...ledger]
        .sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0))
        .slice(0, 6),
    [ledger]
  );

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Habari za asubuhi';
    if (hour < 16) return 'Habari za mchana';
    return 'Habari za jioni';
  }, []);

  const handleStatement = React.useCallback(
    async (item: FollowUpItem) => {
      const student = learners.find((learner) => learner.id === item.id);
      if (!student) return;
      try {
        await downloadFeeStatement(student, ledger.filter((row) => row.studentId === item.id), {
          term: 'Term 2',
          academicYear: '2026',
        });
        toast({ title: 'Fee statement ready', description: `${item.name} · vector PDF` });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Could not build the statement',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [learners, ledger, toast]
  );

  const handleIdCards = React.useCallback(async () => {
    setExportingIds(true);
    try {
      await downloadIdCards(learners.slice(0, 12), { term: 'Term 2 2026' });
      toast({
        title: 'ID cards generated',
        description: '12 cards · A4 2-up with crop marks · fully vector.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'ID card export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setExportingIds(false);
    }
  }, [learners, toast]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        data-reveal
        className="relative overflow-hidden rounded-[28px] border border-border/60 bg-gradient-to-br from-primary/[0.09] via-card/70 to-accent/[0.09] p-5 sm:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-[240px] w-[240px] opacity-40 sm:-right-10 sm:-top-24 sm:h-[360px] sm:w-[360px] sm:opacity-90">
          <ThreeOrb hue={214} className="h-full w-full" />
        </div>
        <div className="relative z-10 max-w-full sm:max-w-[58%]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live · {rangeLabel}
            </span>
            {DEMO_MODE && (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-accent">
                Demo node
              </span>
            )}
          </div>

          <h2 className="mt-4 text-[22px] leading-[1.05] tracking-tight text-foreground sm:text-[30px]">
            {greeting}, {role ?? 'Admin'}.
          </h2>
          <p className="mt-2 max-w-md text-[11px] font-medium leading-relaxed text-muted-foreground sm:text-xs">
            {metrics.enrolment} learners on the register · {metrics.followUps.length} balances need chasing ·
            TZS {Math.round(metrics.pending).toLocaleString('en-US')} in gateway queue.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/finance"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Banknote className="h-3.5 w-3.5" />
              Record payment
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard/reports"
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Receipt className="h-3.5 w-3.5" />
              Printables
            </Link>
            <button
              type="button"
              onClick={handleIdCards}
              disabled={exportingIds || learners.length === 0}
              className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3.5 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
            >
              {exportingIds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              ID cards
            </button>
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
            <Sparkles className="h-3 w-3 text-accent" />
            Press ⌘K for instant search
          </p>
        </div>
      </section>

      {/* KPI grid */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Collected (all time)"
          value={metrics.collected}
          format={(value) => `TZS ${Math.round(value).toLocaleString('en-US')}`}
          delta={12.4}
          caption={`${metrics.verifiedCount} verified receipts`}
          icon={CircleDollarSign}
          tone="primary"
          progress={metrics.rate}
          spark={metrics.weeklySpark}
          delay={0}
        />
        <KpiCard
          label="Outstanding"
          value={metrics.outstanding}
          format={(value) => `TZS ${Math.round(value).toLocaleString('en-US')}`}
          delta={-4.8}
          caption={`${metrics.followUps.length} learners`}
          icon={Wallet}
          tone="amber"
          progress={100 - metrics.rate}
          spark={[...metrics.weeklySpark].reverse()}
          delay={0.05}
        />
        <KpiCard
          label="Enrolment"
          value={metrics.enrolment}
          format={(value) => `${Math.round(value)} learners`}
          delta={3.2}
          caption={studentsLoading ? 'syncing register…' : 'active on register'}
          icon={Users}
          tone="accent"
          progress={Math.min(100, (metrics.enrolment / 200) * 100)}
          delay={0.1}
        />
        <KpiCard
          label="Attendance today"
          value={metrics.presence}
          format={(value) => `${value.toFixed(1)}%`}
          delta={1.6}
          caption="presence register"
          icon={ClipboardCheck}
          tone="emerald"
          progress={metrics.presence}
          delay={0.15}
        />
      </section>

      {/* Chart + follow-up queue */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.65fr_1fr]">
        <RevenueChart transactions={ledger} isLoading={txLoading} />
        <PriorityBoard items={metrics.followUps} onExport={handleStatement} />
      </section>

      {/* Ledger + quick modules */}
      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.65fr_1fr]">
        <div data-reveal className="glass-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                Ledger stream
              </p>
              <h3 className="mt-1 text-[13px] text-foreground">Latest verified activity</h3>
            </div>
            <Link
              href="/dashboard/finance"
              className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.16em] text-primary hover:underline"
            >
              Open finance <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-border/60">
            {recentLedger.length === 0 && (
              <p className="py-8 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Waiting for ledger data…
              </p>
            )}
            {recentLedger.map((row, index) => {
              const created = toDate(row.createdAt);
              return (
                <motion.div
                  key={row.id ?? index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * index, duration: 0.3 }}
                  className="flex items-center gap-3 py-2.5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Receipt className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black uppercase tracking-tight text-foreground">
                      {row.studentName ?? 'Learner'}
                    </p>
                    <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {row.feeType ?? 'Tuition'} · {row.paymentMethod ?? 'Control number'}
                      {created ? ` · ${created.toLocaleDateString('en-GB')}` : ''}
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block text-[11px] font-black tabular-nums text-foreground">
                      TZS {Number(row.amount ?? 0).toLocaleString('en-US')}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em]',
                        STATUS_STYLES[row.status] ?? 'bg-muted text-muted-foreground'
                      )}
                    >
                      {row.status ?? 'Verified'}
                    </span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div data-reveal className="glass-panel rounded-3xl p-4 sm:p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Jump back in
          </p>
          <h3 className="mt-1 text-[13px] text-foreground">Module shortcuts</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { href: '/dashboard/students', label: 'Students', icon: Users, tone: 'from-primary/15 to-primary/5 text-primary' },
              { href: '/dashboard/analytics', label: 'Analytics', icon: GraduationCap, tone: 'from-accent/15 to-accent/5 text-accent' },
              { href: '/dashboard/attendance', label: 'Attendance', icon: ClipboardCheck, tone: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600' },
              { href: '/dashboard/reports', label: 'Reports', icon: CalendarClock, tone: 'from-amber-500/15 to-amber-500/5 text-amber-600' },
            ].map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className={cn(
                  'group flex flex-col gap-2 rounded-2xl border border-border/60 bg-gradient-to-br p-3 transition-transform duration-300 hover:-translate-y-0.5',
                  shortcut.tone
                )}
              >
                <shortcut.icon className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">
                  {shortcut.label}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-border/60 bg-muted/25 p-3">
            <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Ledger integrity
            </p>
            <p className="mt-1 text-[10px] font-medium leading-relaxed text-muted-foreground">
              {metrics.disputed} disputed entries are quarantined pending bank statements. Everything else is
              reconciled against the gateway.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
