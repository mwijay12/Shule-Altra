'use client';

/**
 * @fileOverview Command-deck topbar: global search trigger, reporting window,
 * notification stream, theme switch and identity chip.
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarRange, Check, Command, Moon, Search, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRange, RANGE_OPTIONS, type RangeKey } from '@/components/admin/range-context';
import { useTheme } from '@/components/admin/theme-provider';
import { MobileMenuButton } from '@/components/admin/sidebar';

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
  href?: string;
}

interface TopbarProps {
  title: string;
  eyebrow?: string;
  onOpenSearch: () => void;
  onOpenMobile: () => void;
  notifications: NotificationItem[];
  role: string | null;
}

function useClickOutside(onOutside: () => void) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
}

const TONE_STYLES: Record<NotificationItem['tone'], string> = {
  warning: 'bg-amber-500',
  danger: 'bg-destructive',
  info: 'bg-primary',
  success: 'bg-emerald-500',
};

export function Topbar({ title, eyebrow, onOpenSearch, onOpenMobile, notifications, role }: TopbarProps) {
  const { range, setRange } = useRange();
  const { theme, toggleTheme } = useTheme();
  const [rangeOpen, setRangeOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);
  const rangeRef = useClickOutside(React.useCallback(() => setRangeOpen(false), []));
  const bellRef = useClickOutside(React.useCallback(() => setBellOpen(false), []));
  const activeRange = RANGE_OPTIONS.find((option) => option.key === range);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="flex h-[68px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileMenuButton onClick={onOpenMobile} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[8px] font-black uppercase tracking-[0.28em] text-muted-foreground">
            {eyebrow ?? 'Shule Altra · Command OS'}
          </p>
          <h1 className="truncate text-[15px] font-black uppercase leading-tight tracking-tight text-foreground sm:text-[17px]">
            {title}
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          className="group hidden h-10 items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-3 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground sm:flex"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Search students, pages…</span>
          <kbd className="ml-2 hidden items-center gap-0.5 rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground lg:flex">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="grid h-10 w-10 place-items-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground hover:text-foreground sm:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="relative hidden md:block" ref={rangeRef}>
          <button
            type="button"
            onClick={() => setRangeOpen((open) => !open)}
            className={cn(
              'flex h-10 items-center gap-2 rounded-xl border px-3 text-[10px] font-black uppercase tracking-[0.14em] transition-colors',
              rangeOpen
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border/70 bg-card/70 text-muted-foreground hover:text-foreground'
            )}
          >
            <CalendarRange className="h-4 w-4" />
            {activeRange?.short ?? '30D'}
          </button>
          <AnimatePresence>
            {rangeOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 shadow-2xl"
              >
                <p className="px-3 py-2 text-[8px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  Reporting window
                </p>
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setRange(option.key as RangeKey);
                      setRangeOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-colors',
                      option.key === range
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    )}
                  >
                    {option.label}
                    {option.key === range && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((open) => !open)}
            aria-label="Notifications"
            className={cn(
              'relative grid h-10 w-10 place-items-center rounded-xl border transition-colors',
              bellOpen
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border/70 bg-card/70 text-muted-foreground hover:text-foreground'
            )}
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[8px] font-black text-white">
                {notifications.length > 9 ? '9+' : notifications.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="absolute right-0 top-12 w-[320px] overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                    Live signals
                  </p>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black text-primary">
                    {notifications.length} open
                  </span>
                </div>
                <div className="max-h-[320px] overflow-y-auto p-1.5">
                  {notifications.length === 0 && (
                    <p className="px-3 py-6 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      All clear
                    </p>
                  )}
                  {notifications.map((item) => (
                    <a
                      key={item.id}
                      href={item.href ?? '/dashboard/finance'}
                      className="flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', TONE_STYLES[item.tone])} />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black uppercase tracking-tight text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-medium leading-snug text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                    </a>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle colour theme"
          className="grid h-10 w-10 place-items-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -60, opacity: 0, scale: 0.7 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 60, opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              className="grid place-items-center"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 py-1 pl-1 pr-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-accent text-[11px] font-black text-white">
            {(role ?? 'A').slice(0, 1)}
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-foreground">
              {role ?? 'Guest'}
            </span>
            <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              school-001
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
