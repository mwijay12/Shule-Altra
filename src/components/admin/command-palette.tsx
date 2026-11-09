'use client';

/**
 * @fileOverview ⌘K command palette: fuzzy search across navigation and learner records.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CornerDownLeft, Search, User2, X } from 'lucide-react';
import { ALL_NAV_ITEMS } from '@/components/admin/nav-config';
import { cn } from '@/lib/utils';

export interface PaletteStudent {
  id: string;
  name: string;
  className?: string;
  admissionNumber?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: PaletteStudent[];
  canAccess: (module: string) => boolean;
}

export function CommandPalette({ open, onOpenChange, students, canAccess }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [cursor, setCursor] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      setQuery('');
      setCursor(0);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const pages = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return ALL_NAV_ITEMS.filter((item) => canAccess(item.module)).filter((item) =>
      term ? `${item.title} ${item.hint ?? ''}`.toLowerCase().includes(term) : true
    );
  }, [query, canAccess]);

  const learnerMatches = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return students
      .filter((student) =>
        `${student.name} ${student.className ?? ''} ${student.admissionNumber ?? ''}`
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 6);
  }, [query, students]);

  const results = React.useMemo(
    () => [
      ...pages.map((item) => ({
        key: item.url,
        label: item.title,
        hint: item.hint ?? 'Navigates to module',
        href: item.url,
        kind: 'page' as const,
      })),
      ...learnerMatches.map((student) => ({
        key: `student-${student.id}`,
        label: student.name,
        hint: `${student.className ?? 'Unassigned'} · ${student.admissionNumber ?? student.id}`,
        href: `/dashboard/students?student=${encodeURIComponent(student.id)}`,
        kind: 'student' as const,
      })),
    ],
    [pages, learnerMatches]
  );

  React.useEffect(() => {
    setCursor((current) => (current >= results.length ? 0 : current));
  }, [results.length]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCursor((current) => (current + 1) % Math.max(results.length, 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor((current) => (current - 1 + results.length) % Math.max(results.length, 1));
      } else if (event.key === 'Enter') {
        const target = results[cursor];
        if (target) {
          event.preventDefault();
          onOpenChange(false);
          router.push(target.href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, cursor, onOpenChange, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search modules, learners, admission numbers…"
                className="h-6 w-full bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close search"
                className="grid h-7 w-7 place-items-center rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-4 py-10 text-center text-[14px] font-bold text-muted-foreground">
                  No modules or learners match “{query}”
                </p>
              )}
              {results.map((result, index) => (
                <button
                  key={result.key}
                  type="button"
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => {
                    onOpenChange(false);
                    router.push(result.href);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors',
                    index === cursor ? 'bg-primary/10' : 'hover:bg-muted/50'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-xl',
                      result.kind === 'student'
                        ? 'bg-accent/15 text-accent'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    {result.kind === 'student' ? (
                      <User2 className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
                      {result.label}
                    </span>
                    <span className="block truncate text-[13px] font-medium text-muted-foreground">
                      {result.hint}
                    </span>
                  </span>
                  {index === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] font-semibold text-muted-foreground">
              <span>↑↓ navigate · ↵ open · esc dismiss</span>
              <span>{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
