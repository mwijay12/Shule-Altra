'use client';

/**
 * @fileOverview Aurora admin shell — sidebar, topbar, palette, notifications and
 * route transitions wrapped around the authenticated dashboard.
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { AuroraSidebar } from '@/components/admin/sidebar';
import { Topbar, type NotificationItem } from '@/components/admin/topbar';
import { CommandPalette, type PaletteStudent } from '@/components/admin/command-palette';
import { PageTransition } from '@/components/admin/page-transition';
import { ThemeProvider } from '@/components/admin/theme-provider';
import { RangeProvider } from '@/components/admin/range-context';
import { ALL_NAV_ITEMS } from '@/components/admin/nav-config';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';

interface AuroraShellProps {
  children: React.ReactNode;
  role: string | null;
  canAccess: (module: string) => boolean;
  signOut: () => Promise<void> | void;
}

function prettifyModule(segment?: string) {
  if (!segment) return 'Command deck';
  const match = ALL_NAV_ITEMS.find((item) => item.url === `/dashboard/${segment}`);
  return match?.title ?? segment.replace(/-/g, ' ');
}

export function AuroraShell({ children, role, canAccess, signOut }: AuroraShellProps) {
  const pathname = usePathname();
  const db = useFirestore();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem('altra-sidebar-collapsed');
      if (stored === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapse = React.useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('altra-sidebar-collapsed', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const studentsQuery = useMemoFirebase(
    () => query(collection(db, 'schools', 'school-001', 'students'), orderBy('name', 'asc'), limit(200)),
    [db]
  );
  const { data: students } = useCollection<any>(studentsQuery);

  const transactionsQuery = useMemoFirebase(
    () =>
      query(
        collection(db, 'schools', 'school-001', 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(120)
      ),
    [db]
  );
  const { data: transactions } = useCollection<any>(transactionsQuery);

  const paletteStudents = React.useMemo<PaletteStudent[]>(
    () =>
      (students ?? []).map((student: any) => ({
        id: student.id,
        name: student.name ?? 'Unnamed learner',
        className: student.className,
        admissionNumber: student.admissionNumber ?? student.admissionNo,
      })),
    [students]
  );

  const notifications = React.useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];
    const rows = (transactions ?? []) as any[];
    const pending = rows.filter((row) => row.status === 'Pending');
    const disputed = rows.filter((row) => row.status === 'Disputed' || row.disputed);
    const learners = (students ?? []) as any[];
    const indebted = learners.filter((student) => Number(student.balance ?? 0) > 0);

    if (disputed.length > 0) {
      list.push({
        id: 'disputed',
        title: `${disputed.length} disputed payments`,
        detail: 'Bank statements need manual verification before reconciliation.',
        tone: 'danger',
        href: '/dashboard/finance',
      });
    }
    if (pending.length > 0) {
      list.push({
        id: 'pending',
        title: `${pending.length} payments awaiting verification`,
        detail: 'Mobile-money confirmations are queued in the ledger.',
        tone: 'warning',
        href: '/dashboard/finance',
      });
    }
    if (indebted.length > 0) {
      list.push({
        id: 'balances',
        title: `${indebted.length} learners with fee balances`,
        detail: 'Generate a fee statement PDF for the follow-up register.',
        tone: 'info',
        href: '/dashboard/reports',
      });
    }
    list.push({
      id: 'term',
      title: 'Term 2 reporting window open',
      detail: 'Report cards and class rankings can now be issued as vector PDFs.',
      tone: 'success',
      href: '/dashboard/reports',
    });
    return list.slice(0, 5);
  }, [transactions, students]);

  const segment = pathname.split('/')[2];
  const title = segment ? prettifyModule(segment) : 'Command deck';
  const eyebrow = segment
    ? `${ALL_NAV_ITEMS.find((item) => item.url === `/dashboard/${segment}`)?.hint ?? 'Module'} · school-001`
    : 'Live institutional overview · school-001';

  return (
    <ThemeProvider>
      <RangeProvider>
        <div className={cn('aurora-shell flex min-h-screen w-full bg-background')}>
          <div className="pointer-events-none fixed inset-0 -z-10 grid-overlay" aria-hidden />
          <AuroraSidebar
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
            mobileOpen={mobileOpen}
            onCloseMobile={() => setMobileOpen(false)}
            role={role}
            canAccess={canAccess}
            signOut={signOut}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              title={title}
              eyebrow={eyebrow}
              onOpenSearch={() => setPaletteOpen(true)}
              onOpenMobile={() => setMobileOpen(true)}
              notifications={notifications}
              role={role}
            />
            <main className="min-h-0 flex-1">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          students={paletteStudents}
          canAccess={canAccess}
        />
      </RangeProvider>
    </ThemeProvider>
  );
}
