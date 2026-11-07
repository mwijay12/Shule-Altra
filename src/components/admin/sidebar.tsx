'use client';

/**
 * @fileOverview Aurora sidebar — a static, always-visible rail on desktop.
 *
 * Motion is deliberately quiet: a single sliding active pill (Framer Motion
 * layout animation), a GSAP opacity stagger on first paint, and hover states
 * that never move the layout. No collapse, no width animation — the rail is a
 * fixed piece of furniture so the content grid never shifts.
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Plus, ShieldCheck, X } from 'lucide-react';
import { NAV_GROUPS } from '@/components/admin/nav-config';
import { cn } from '@/lib/utils';
import { DEMO_MODE } from '@/lib/demo/config';

interface AuroraSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  role: string | null;
  canAccess: (module: string) => boolean;
  signOut: () => Promise<void> | void;
}

function useQuietEntrance(scope: React.RefObject<HTMLElement | null>) {
  React.useEffect(() => {
    const root = scope.current;
    if (!root) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const { gsap } = await import('gsap');
      if (cancelled || !scope.current) return;
      ctx = gsap.context(() => {
        gsap.from('[data-nav-item]', {
          opacity: 0,
          y: 6,
          duration: 0.4,
          ease: 'power2.out',
          stagger: 0.02,
          clearProps: 'transform,opacity',
        });
      }, scope);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [scope]);
}

function NavList({
  onNavigate,
  canAccess,
}: {
  onNavigate?: () => void;
  canAccess: (module: string) => boolean;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5 px-3 pb-4">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => canAccess(item.module));
        if (items.length === 0) return null;

        return (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground/60">
              {group.label}
            </p>
            {items.map((item) => {
              const active =
                pathname === item.url ||
                (item.url !== '/dashboard' && pathname.startsWith(item.url));
              return (
                <Link
                  key={item.url}
                  href={item.url}
                  onClick={onNavigate}
                  data-nav-item
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-colors duration-200 ease-out',
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="aurora-nav-pill"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary via-primary to-accent shadow-lg shadow-primary/25"
                      transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.6 }}
                    />
                  )}
                  {!active && (
                    <span className="absolute inset-0 rounded-2xl bg-primary/[0.06] opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" />
                  )}
                  <item.icon
                    className={cn(
                      'relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.06]'
                    )}
                  />
                  <span className="relative z-10 flex-1 truncate">{item.title}</span>
                  {item.hint && (
                    <span className="relative z-10 hidden text-[8px] font-bold uppercase tracking-widest opacity-0 transition-opacity duration-200 group-hover:opacity-60 lg:block">
                      {item.hint}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarBody({
  onCloseMobile,
  isMobile,
  role,
  canAccess,
  signOut,
}: Omit<AuroraSidebarProps, 'mobileOpen'> & { isMobile: boolean }) {
  const scope = React.useRef<HTMLDivElement | null>(null);
  useQuietEntrance(scope);

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pb-5 pt-5">
        <Link href="/dashboard" className="group flex items-center gap-3 overflow-hidden">
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary to-accent text-white shadow-xl shadow-primary/30">
            <ShieldCheck className="h-6 w-6" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-headline text-[15px] font-black uppercase tracking-tight text-foreground">
              Shule Altra
            </span>
            <span className="mt-1 text-[8px] font-black uppercase tracking-[0.28em] text-muted-foreground">
              Command OS · 2026
            </span>
          </span>
        </Link>
        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="grid h-9 w-9 place-items-center rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mx-4 mb-4 rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.07] to-accent/[0.07] p-3">
        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-muted-foreground">Session</p>
        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {role ?? 'GUEST'} · verified
        </p>
        {DEMO_MODE && (
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-accent">
            Demo node · local data
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <NavList onNavigate={isMobile ? onCloseMobile : undefined} canAccess={canAccess} />
      </div>

      <div className="space-y-2 border-t border-border/60 p-3">
        <Link
          href="/dashboard/finance"
          onClick={isMobile ? onCloseMobile : undefined}
          className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25 transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Record payment
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AuroraSidebar(props: AuroraSidebarProps) {
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 border-r border-border/60 bg-card/70 backdrop-blur-xl md:block">
        <SidebarBody {...props} isMobile={false} />
      </aside>

      <AnimatePresence>
        {props.mobileOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={props.onCloseMobile}
              aria-hidden
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 34 }}
              className="relative h-full w-[86vw] max-w-[320px] border-r border-border/60 bg-card shadow-2xl"
            >
              <SidebarBody {...props} isMobile />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      className="grid h-10 w-10 place-items-center rounded-xl border border-border/60 bg-card/70 text-foreground md:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
      </svg>
    </button>
  );
}
