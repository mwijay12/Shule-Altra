'use client';

/**
 * @fileOverview Command deck, the flagship landing surface of the admin.
 * Three.js centrepiece, GSAP-driven KPI motion, interactive collections chart,
 * draggable follow-up queue and live ledger preview.
 */

import * as React from 'react';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { motion } from 'motion/react';
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
  Users,
  Wallet,
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { KpiCard } from '@/components/admin/kpi-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { RevenueChart } from '@/components/admin/revenue-chart';
import { PriorityBoard, type FollowUpItem } from '@/components/admin/priority-board';
import { downloadFeeStatement } from '@/lib/pdf/fee-statement';
import { formatTZSCompact } from '@/lib/finance-engine';
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
  const { role, canAccess } = useAuth();
  const { toast } = useToast();
  const [exportingIds, setExportingIds] = React.useState(false);

  const studentsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc')),
    [db]
  );
  const { data: students, isLoading: studentsLoading } = useCollection<any>(studentsQuery);

  const transactionsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'transactions'), orderBy('createdAt', 'desc')),
    [db]
  );
  const { data: transactions, isLoading: txLoading } = useCollection<any>(transactionsQuery);



  const learners = (students ?? []) as any[];
  const ledger = (transactions ?? []) as any[];

  const metrics = React.useMemo(() => {
    const verified = ledger.filter((row) => row.status === 'Verified');
    const collected = verified.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const pending = ledger
      .filter((row) => row.status === 'Pending')
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const outstanding = learners.reduce((sum, learner) => sum + Number(learner.balance ?? 0), 0);
    // The register carries the authoritative billed/paid totals; the ledger is a sample.
    const registerPaid = learners.reduce((sum, learner) => sum + Number(learner.totalPaid ?? 0), 0);
    const billed = registerPaid + outstanding;
    const authoritativeCollected = learners.some((learner) => learner.totalPaid != null) ? registerPaid : collected;
    const rate = billed > 0 ? Math.min(100, authoritativeCollected / billed * 100) : 0;

    // The attendance screen currently stores the latest status on each learner.
    // This is not a dated daily register, so do not label it as today's data.
    const marked = learners.filter((row) => ['Present', 'Late', 'Absent'].includes(row.attendanceStatus));
    const present = marked.filter((row) => row.attendanceStatus === 'Present' || row.attendanceStatus === 'Late').length;
    const presence = marked.length > 0 ? (present / marked.length) * 100 : null;
    const outstandingCount = learners.filter((learner) => Number(learner.balance ?? 0) > 0).length;

    const followUps: FollowUpItem[] = learners
      .filter((learner) => Number(learner.balance ?? 0) > 0)
      .sort((a, b) => Number(b.balance ?? 0) - Number(a.balance ?? 0))
      .slice(0, 6)
      .map((learner) => ({
        id: learner.id,
        name: learner.name ?? 'Unnamed learner',
        className: learner.className ?? learner.class ?? 'Unassigned',
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
          return created && created >= day && created < next && row.status === 'Verified';
        })
        .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    });

    return {
      collected: authoritativeCollected,
      pending,
      outstanding,
      billed,
      rate,
      presence,
      enrolment: learners.length,
      followUps,
      outstandingCount,
      weeklySpark,
      verifiedCount: verified.length,
      disputed: ledger.filter((row) => row.status === 'Disputed').length,
    };
  }, [ledger, learners]);

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
      await downloadIdCards(learners.slice(0, 12));
      toast({
        title: 'ID cards generated',
        description: 'Up to 12 cards · A4 sheet with crop marks.',
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

  // Roles are stored as enum constants; people are not.
  const roleLabel = (role ?? 'Admin').toLowerCase().replace(/(^|[_\s-])([a-z])/g, (_, sep, char) => (sep ? ' ' : '') + char.toUpperCase());

  return (
    <div className="space-y-6">
      {/* A compact overview keeps the real register in focus. */}
      <section data-reveal className="rounded-3xl bg-card px-5 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(15rem,1fr)] lg:items-end">
          <div>
            {DEMO_MODE && <p className="mb-3 text-sm font-medium text-muted-foreground">Demo school · sample records</p>}
            <h1 className="font-headline text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" style={{ textWrap: 'balance' }}>
              {greeting}, {roleLabel}.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Review the register, follow up on balances and prepare school documents from one place.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {canAccess('finance') && <Link href="/dashboard/finance" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none">
                <Banknote className="h-4 w-4" /> Record payment <ArrowRight className="h-4 w-4" />
              </Link>}
              {canAccess('reports') && <Link href="/dashboard/reports" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Receipt className="h-4 w-4" /> Open reports
              </Link>}
              {canAccess('students') && <button type="button" onClick={handleIdCards} disabled={exportingIds || learners.length === 0} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50">
                {exportingIds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} ID cards
              </button>}
            </div>
          </div>
          <div className="space-y-3 border-t border-border pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-label="Register overview">
            <p className="font-semibold text-foreground">At a glance</p>
            {studentsLoading || txLoading ? <p className="text-muted-foreground" role="status">Loading register and ledger…</p> : <>
              <p className="flex justify-between gap-4 text-muted-foreground"><span>Learners on register</span><span className="font-semibold tabular-nums text-foreground"><AnimatedNumber value={metrics.enrolment} /></span></p>
              <p className="flex justify-between gap-4 text-muted-foreground"><span>Balances to follow up</span><span className="font-semibold tabular-nums text-foreground"><AnimatedNumber value={metrics.outstandingCount} /></span></p>
              <p className="flex justify-between gap-4 text-muted-foreground"><span>Pending payments</span><span className="font-semibold tabular-nums text-foreground"><AnimatedNumber value={metrics.pending} prefix="TZS " /></span></p>
            </>}
          </div>
        </div>
      </section>

      {/* KPI grid */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Collected (all time)"
          value={metrics.collected}
          format={formatTZSCompact}
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
          format={formatTZSCompact}
          caption={`${metrics.outstandingCount} learners`}
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
          caption={studentsLoading ? 'syncing register…' : 'active on register'}
          icon={Users}
          tone="accent"
          progress={Math.min(100, (metrics.enrolment / 200) * 100)}
          delay={0.1}
        />
        <KpiCard
          label="Register presence"
          value={metrics.presence ?? 0}
          format={(value) => metrics.presence === null ? 'No records' : `${value.toFixed(1)}%`}
          caption={metrics.presence === null ? "No attendance status recorded" : "Present or late among marked learners"}
          icon={ClipboardCheck}
          tone="emerald"
          progress={metrics.presence ?? undefined}
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
              <p className="text-[12px] font-semibold text-muted-foreground">
                Ledger stream
              </p>
              <h3 className="mt-1 text-[13px] text-foreground">Latest ledger activity</h3>
            </div>
            <Link
              href="/dashboard/finance"
              className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline"
            >
              Open finance <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-border/60">
            {recentLedger.length === 0 && (
              <p className="py-8 text-center text-[13px] font-bold text-muted-foreground">
                {txLoading ? 'Loading ledger activity…' : 'No ledger activity yet. Record a payment in Finance to see it here.'}
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
                    <p className="truncate text-[14px] font-semibold tracking-tight text-foreground">
                      {row.studentName ?? 'Learner'}
                    </p>
                    <p className="truncate text-[12px] font-bold text-muted-foreground">
                      {row.feeType ?? 'Tuition'} · {row.paymentMethod ?? 'Control number'}
                      {created ? ` · ${created.toLocaleDateString('en-GB')}` : ''}
                    </p>
                  </div>
                  <span className="text-right">
                    <span className="block text-[14px] font-bold tabular-nums text-foreground">
                      TZS {Number(row.amount ?? 0).toLocaleString('en-US')}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
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
          <p className="text-[12px] font-semibold text-muted-foreground">
            Jump back in
          </p>
          <h3 className="mt-1 text-[13px] text-foreground">Module shortcuts</h3>
          <div className="mt-3 divide-y divide-border/60">
            {[
              { href: '/dashboard/students', label: 'Students', module: 'students', icon: Users },
              { href: '/dashboard/analytics', label: 'Analytics', module: 'analytics', icon: GraduationCap },
              { href: '/dashboard/attendance', label: 'Attendance', module: 'attendance', icon: ClipboardCheck },
              { href: '/dashboard/reports', label: 'Reports', module: 'reports', icon: CalendarClock },
            ].filter(shortcut => canAccess(shortcut.module)).map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="flex min-h-11 items-center gap-3 rounded-md py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <shortcut.icon className="h-4 w-4 text-muted-foreground" /> {shortcut.label}
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p><span className="font-semibold tabular-nums text-foreground">{metrics.disputed}</span> disputed ledger entries. Review their status in Finance.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
