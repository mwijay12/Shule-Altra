'use client';

/**
 * @fileOverview Aurora sidebar, a static, always-visible rail on desktop.
 *
 * Motion is deliberately quiet: a single sliding active pill (Framer Motion
 * layout animation), a GSAP opacity stagger on first paint, and hover states
 * that never move the layout. No collapse, no width animation, the rail is a
 * fixed piece of furniture so the content grid never shifts.
 */

import * as React from 'react';
import { SchoolLogo } from '@/components/brand/school-logo';
import { useSchoolBrand } from '@/components/admin/brand-provider';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
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
            <p className="px-3 text-[12px] font-semibold text-muted-foreground/60">
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
                    'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14px] font-semibold transition-colors duration-200 ease-out',
                    active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="aurora-nav-pill"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/25"
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
                    <span className="pointer-events-none absolute right-4 z-10 hidden text-[11px] font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-60 lg:block">
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
  const { brand, ready } = useSchoolBrand();

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pb-5 pt-5">
        <Link href="/dashboard" className="group flex items-center gap-3 overflow-hidden">
          <span className="relative shrink-0 shadow-xl shadow-primary/25">
            <SchoolLogo src={brand.logo} name={brand.shortName} size={44} radius={14} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-headline text-[16px] font-bold tracking-tight text-foreground">
              {ready ? brand.shortName : <span className="inline-block h-4 w-28 animate-pulse rounded bg-muted" />}
            </span>
            <span className="mt-1 truncate text-[12px] font-medium text-muted-foreground">
              {ready ? brand.motto : <span className="inline-block h-3 w-20 animate-pulse rounded bg-muted/70" />}
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
        <p className="text-[11px] font-semibold text-muted-foreground">Session</p>
        <p className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold tracking-wide text-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {role ?? 'GUEST'} · verified
        </p>
        {DEMO_MODE && (
          <p className="mt-1 text-[11px] font-bold text-accent">
            Demo mode · local data
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
          className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-primary/25 transition-transform duration-200 ease-out hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" />
          Record payment
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
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
      {/* Rail is furniture, not content: it lives outside the scroll area so it can never
          be pushed off-screen (sticky dies inside overflow-hidden ancestors). */}
      <aside className="hidden h-full w-[272px] shrink-0 border-r border-border/60 bg-card md:block">
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
