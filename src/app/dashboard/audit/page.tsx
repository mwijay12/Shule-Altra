'use client';

/**
 * @fileOverview The audit trail, and a button that proves it.
 *
 * A log nobody can check is just a list. "Verify chain" recomputes every digest
 * and every link, then says plainly whether history is intact and, if not,
 * which entry broke. That is the moment to show a school board.
 */

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Loader2,
  Download,
  RefreshCw,
  FileClock,
  ChevronDown,
  ChevronRight,
  Fingerprint,
} from 'lucide-react';
import { collection, orderBy, query, limit as fsLimit } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/admin/stat-card';
import { cn } from '@/lib/utils';
import { AUDIT_COLLECTION, type AuditEntry, type AuditAction } from '@/lib/audit/types';
import { verifyChain, type ChainReport } from '@/lib/audit/chain';
import { recordAudit } from '@/lib/audit/record';

const ACTION_LABEL: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Changed',
  delete: 'Deleted',
  sign_in: 'Signed in',
  sign_out: 'Signed out',
  export: 'Exported',
  send: 'Sent',
  publish: 'Published',
};

const ACTION_TONE: Record<AuditAction, string> = {
  create: 'bg-emerald-500/12 text-emerald-600',
  update: 'bg-primary/12 text-primary',
  delete: 'bg-destructive/12 text-destructive',
  sign_in: 'bg-muted text-muted-foreground',
  sign_out: 'bg-muted text-muted-foreground',
  export: 'bg-accent/12 text-accent',
  send: 'bg-accent/12 text-accent',
  publish: 'bg-amber-500/12 text-amber-600',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function EntryRow({ entry, index }: { entry: AuditEntry; index: number }) {
  const [open, setOpen] = React.useState(false);
  const when = new Date(entry.at);

  return (
    <div
      className="border-b border-border/50 last:border-none"
      style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/25 sm:px-6"
      >
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <span className="w-12 shrink-0 pt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
          #{entry.seq}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[12px] font-semibold',
                ACTION_TONE[entry.action]
              )}
            >
              {ACTION_LABEL[entry.action]}
            </span>
            {entry.severity === 'critical' && (
              <Badge variant="outline" className="border-destructive/40 text-[11px] text-destructive">
                Critical
              </Badge>
            )}
            <span className="text-[13px] font-medium text-foreground">{entry.summary}</span>
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
            <span className="font-medium">{entry.actor.name}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{entry.actor.role}</span>
            <span className="font-mono">
              {entry.target.documentId
                ? `${entry.target.collection}/${entry.target.documentId}`
                : entry.target.collection}
            </span>
          </span>
        </span>

        <span className="hidden shrink-0 pt-0.5 text-right text-[12px] tabular-nums text-muted-foreground sm:block">
          {when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          <br />
          {when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </button>

      {open && (
        <div className="space-y-4 bg-muted/15 px-4 pb-5 pt-1 sm:px-6 sm:pl-[4.75rem]">
          {entry.changes.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-[12px]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Field</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Before</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">After</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.changes.map((change) => (
                    <tr key={change.field} className="border-t border-border/50">
                      <td className="px-3 py-2 font-mono font-medium text-foreground">{change.field}</td>
                      <td className="px-3 py-2 text-muted-foreground line-through decoration-destructive/40">
                        {formatValue(change.before)}
                      </td>
                      <td className="px-3 py-2 font-medium text-emerald-600">{formatValue(change.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No field-level changes recorded for this action.</p>
          )}

          <div className="space-y-1 font-mono text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Fingerprint className="h-3 w-3" />
              <span className="break-all">hash {entry.hash}</span>
            </p>
            <p className="break-all pl-[18px]">prev {entry.prevHash}</p>
            <p className="pl-[18px]">actor {entry.actor.uid} · {entry.actor.email || 'no email'}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const db = useFirestore();
  const { schoolId, canAccess } = useAuth();
  const [search, setSearch] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState<'all' | AuditAction>('all');
  const [report, setReport] = React.useState<ChainReport | null>(null);
  const [verifying, setVerifying] = React.useState(false);

  const auditQuery = useMemoFirebase(
    () => query(collection(db, 'schools', schoolId ?? 'school-001', AUDIT_COLLECTION), orderBy('seq', 'desc'), fsLimit(500)),
    [db, schoolId]
  );
  const { data, isLoading } = useCollection<AuditEntry>(auditQuery);

  const entries = React.useMemo(() => data ?? [], [data]);
  const oldestFirst = React.useMemo(() => [...entries].sort((a, b) => a.seq - b.seq), [entries]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false;
      if (!needle) return true;
      return (
        entry.summary.toLowerCase().includes(needle) ||
        entry.actor.name.toLowerCase().includes(needle) ||
        entry.actor.role.toLowerCase().includes(needle) ||
        `${entry.target.collection}/${entry.target.documentId}`.toLowerCase().includes(needle)
      );
    });
  }, [entries, search, actionFilter]);

  const stats = React.useMemo(() => {
    const today = new Date().toDateString();
    return {
      total: entries.length,
      today: entries.filter((e) => new Date(e.at).toDateString() === today).length,
      critical: entries.filter((e) => e.severity === 'critical').length,
      actors: new Set(entries.map((e) => e.actor.uid)).size,
    };
  }, [entries]);

  const runVerification = React.useCallback(async () => {
    setVerifying(true);
    try {
      // A short beat so the button reads as doing work rather than flickering.
      const [result] = await Promise.all([
        verifyChain(oldestFirst),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
      setReport(result);
    } finally {
      setVerifying(false);
    }
  }, [oldestFirst]);

  const exportLog = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(oldestFirst, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    void recordAudit({
      action: 'export',
      path: `schools/${schoolId ?? 'school-001'}/audit`,
      summary: `Exported the audit trail (${oldestFirst.length} entries).`,
      label: 'audit trail',
    });
  }, [oldestFirst, schoolId]);

  if (!canAccess('settings')) {
    return (
      <div className="grid min-h-[50vh] place-items-center px-6 text-center">
        <div className="max-w-md">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">The audit trail is restricted</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            It records who changed fees, learner records and settings, so it stays with the
            administrator, bursar and accountant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-full space-y-6 pb-24">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
            <FileClock className="h-3.5 w-3.5" /> Append-only · hash-chained
          </div>
          <h1 className="mt-3 font-headline text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
            Audit trail
          </h1>
          <p className="mt-1 text-[13px] font-medium text-muted-foreground">
            Every change to a learner, a fee or a setting — who made it, what it was before, and when.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={exportLog}
            disabled={entries.length === 0}
            className="h-11 rounded-full border-primary/20 bg-white px-5 text-[13px] font-semibold text-primary"
          >
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button
            onClick={runVerification}
            disabled={verifying || entries.length === 0}
            className="h-11 rounded-full colorful-gradient px-6 text-[13px] font-semibold shadow-lg"
          >
            {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {verifying ? 'Verifying…' : 'Verify chain'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Entries recorded" value={stats.total} sub="Append-only" icon={FileClock} tone="primary" />
        <StatCard index={1} label="Today" value={stats.today} sub="Since midnight" icon={RefreshCw} tone="accent" />
        <StatCard index={2} label="Critical changes" value={stats.critical} sub="Money, identity, deletions" icon={ShieldAlert} tone="rose" />
        <StatCard index={3} label="Staff involved" value={stats.actors} sub="Distinct actors" icon={ShieldCheck} tone="emerald" />
      </div>

      {report && (
        <Card
          className={cn(
            'overflow-hidden rounded-[1.75rem] border-none shadow-xl',
            report.ok ? 'bg-emerald-500/[0.07]' : 'bg-destructive/[0.07]'
          )}
        >
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            {report.ok ? (
              <ShieldCheck className="h-9 w-9 shrink-0 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-9 w-9 shrink-0 text-destructive" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('text-[15px] font-semibold', report.ok ? 'text-emerald-700' : 'text-destructive')}>
                {report.ok
                  ? `Chain intact — ${report.checked} ${report.checked === 1 ? 'entry' : 'entries'} verified`
                  : `Chain broken at ${report.failures.length} point${report.failures.length === 1 ? '' : 's'}`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {report.ok
                  ? 'Every digest matches its contents and every entry follows the one before it. Nothing has been edited or removed.'
                  : 'An entry no longer matches the digest recorded at the time, or a link is missing. Details below.'}
              </p>
              {!report.ok && (
                <ul className="mt-2 space-y-1 text-[12px] text-destructive">
                  {report.failures.slice(0, 5).map((failure, i) => (
                    <li key={i}>
                      <span className="font-mono">#{failure.seq}</span> — {failure.detail}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 break-all font-mono text-[11px] text-muted-foreground">head {report.head}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden rounded-[1.75rem] border-none bg-card/60 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by person, record or summary…"
              className="h-11 rounded-full border-none bg-muted/30 pl-10 text-[13px]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'create', 'update', 'delete', 'export'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActionFilter(key)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors',
                  actionFilter === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                )}
              >
                {key === 'all' ? 'All' : ACTION_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-[13px] font-medium text-muted-foreground">Reading the trail…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileClock className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-[15px] font-semibold text-foreground">
              {entries.length === 0 ? 'Nothing recorded yet' : 'No entries match that filter'}
            </p>
            <p className="mx-auto mt-2 max-w-[46ch] text-[13px] leading-relaxed text-muted-foreground">
              {entries.length === 0
                ? 'Record a payment, edit a learner or change a setting. The change appears here with your name against it.'
                : 'Try a different name, record or action.'}
            </p>
          </div>
        ) : (
          <div className="sd-stagger-rows">
            {filtered.map((entry, index) => (
              <EntryRow key={entry.id ?? entry.seq} entry={entry} index={index} />
            ))}
          </div>
        )}
      </Card>

      <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
        Entries cannot be edited or deleted — the database rules refuse it for every role, including
        the owner. Each entry carries the digest of the one before it, so removing a row breaks the
        chain and <span className="font-medium text-foreground">Verify chain</span> names where.
        Photographs, phone numbers and secrets are redacted before they reach the log.
      </p>
    </div>
  );
}
