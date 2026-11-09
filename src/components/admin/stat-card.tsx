'use client';

/**
 * @fileOverview The one stat tile every module uses.
 *
 * Sixteen dashboard pages hand-rolled the same card: a label, a bare number and
 * a decorative icon. Only the overview and analytics had the ring, the sparkline
 * and the staggered arrival, so moving from Finance to Canteen felt like leaving
 * a finished screen for a draft.
 *
 * This is that card, shared. It counts up, draws its own progress ring or bar,
 * traces a sparkline when there is a series to show, and arrives in sequence
 * with its siblings. Everything collapses to a still, final state under
 * reduced motion — the numbers are never hidden from a screen reader.
 */

import * as React from 'react';
import { motion, useInView } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/use-count-up';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export type StatTone = 'primary' | 'accent' | 'emerald' | 'amber' | 'rose' | 'slate';

/** Ring and spark colours ride the active palette, not fixed hex values. */
const TONES: Record<StatTone, { stroke: string; chip: string; text: string }> = {
  primary: { stroke: 'hsl(var(--primary))', chip: 'bg-primary/12', text: 'text-primary' },
  accent: { stroke: 'hsl(var(--accent))', chip: 'bg-accent/12', text: 'text-accent' },
  emerald: { stroke: 'hsl(160 74% 42%)', chip: 'bg-emerald-500/12', text: 'text-emerald-600' },
  amber: { stroke: 'hsl(38 92% 50%)', chip: 'bg-amber-500/12', text: 'text-amber-600' },
  rose: { stroke: 'hsl(0 72% 55%)', chip: 'bg-destructive/12', text: 'text-destructive' },
  slate: { stroke: 'hsl(var(--muted-foreground))', chip: 'bg-muted', text: 'text-muted-foreground' },
};

/** Maps the legacy `text-green-600` style props onto a tone. */
export function toneFromClass(className?: string): StatTone {
  if (!className) return 'primary';
  if (/green|emerald/.test(className)) return 'emerald';
  if (/orange|amber|yellow/.test(className)) return 'amber';
  if (/destructive|red|rose/.test(className)) return 'rose';
  if (/accent|violet|purple/.test(className)) return 'accent';
  if (/blue/.test(className)) return 'primary';
  if (/muted|slate|gray/.test(className)) return 'slate';
  return 'primary';
}

interface StatCardProps {
  label: string;
  value: number;
  /** Formats the counting value. Defaults to a grouped whole number. */
  format?: (value: number) => string;
  prefix?: string;
  suffix?: string;
  /** Secondary line under the number. */
  sub?: string;
  /** Exact figure shown as a tooltip and, for compact money, as a caption. */
  exact?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  /** 0–100. Draws the ring behind the icon. */
  progress?: number;
  /** A series to trace under the number. */
  spark?: number[];
  /** Percentage change chip. */
  delta?: number;
  /** Position in the grid, for the arrival stagger. */
  index?: number;
  className?: string;
}

function Sparkline({ points, colour, delay }: { points: number[]; colour: string; delay: number }) {
  const reducedMotion = useReducedMotion();
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((point, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 26 - ((point - min) / span) * 20 - 3;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-3 h-7 w-full" aria-hidden>
      <defs>
        <linearGradient id={`spark-fill-${colour.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="0.22" />
          <stop offset="100%" stopColor={colour} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${path} L100,26 L0,26 Z`}
        fill={`url(#spark-fill-${colour.replace(/\W/g, '')})`}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : delay + 0.5 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke={colour}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reducedMotion ? 0 : 1.2, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : delay + 0.25 }}
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  format,
  prefix = '',
  suffix = '',
  sub,
  exact,
  icon: Icon,
  tone = 'primary',
  progress,
  spark,
  delta,
  index = 0,
  className,
}: StatCardProps) {
  const reducedMotion = useReducedMotion();
  const display = useCountUp(value);
  const palette = TONES[tone];
  const ref = React.useRef<HTMLDivElement | null>(null);
  // Long pages: a tile below the fold animates when it is actually reached.
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const show = reducedMotion || inView;

  const delay = Math.min(index, 7) * 0.06;
  const ringProgress = Math.max(0, Math.min(100, progress ?? 0));
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const rendered = format ? format(display) : Math.round(display).toLocaleString('en-US');

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={show ? { opacity: 1, y: 0, scale: 1 } : undefined}
      transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-panel sheen group relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_hsl(var(--primary)/0.45)]',
        className
      )}
    >
      {/* The oversized watermark icon still drifts on hover, as the old cards did. */}
      {Icon && (
        <div
          className={cn(
            'pointer-events-none absolute -right-5 -top-5 opacity-[0.055] transition-transform duration-500 ease-out',
            'group-hover:rotate-12 group-hover:scale-110',
            palette.text
          )}
          aria-hidden
        >
          <Icon className="h-20 w-20 sm:h-24 sm:w-24" />
        </div>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-snug text-muted-foreground sm:text-[13px]">
            {label}
          </p>
          <p
            title={exact}
            // Same hook AnimatedNumber exposes, so a test (or a reader script)
            // can tell the target from whatever is currently displayed.
            data-count-value={Number.isFinite(value) ? value : 0}
            className={cn(
              'mt-2 font-headline text-[clamp(1.25rem,3.2vw,1.85rem)] font-bold leading-none tracking-tight tabular-nums',
              palette.text
            )}
          >
            {prefix}
            {rendered}
            {suffix}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            {typeof delta === 'number' && Number.isFinite(delta) && (
              <motion.span
                initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
                animate={show ? { opacity: 1, scale: 1 } : undefined}
                transition={{ duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : delay + 0.7 }}
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-semibold',
                  delta >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-destructive/12 text-destructive'
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(delta).toFixed(1)}%
              </motion.span>
            )}
            {sub && (
              <span className="line-clamp-2 text-[12px] font-medium leading-snug text-muted-foreground">{sub}</span>
            )}
          </div>
          {exact && (
            <p className="mt-1 text-[12px] font-medium tabular-nums text-muted-foreground/80">{exact}</p>
          )}
        </div>

        {Icon && (
          <div className="relative grid h-[52px] w-[52px] shrink-0 place-items-center">
            {typeof progress === 'number' && (
              <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="3.5" className="stroke-muted" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r={radius}
                  fill="none"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke={palette.stroke}
                  strokeDasharray={circumference}
                  initial={reducedMotion ? false : { strokeDashoffset: circumference }}
                  animate={show ? { strokeDashoffset: circumference * (1 - ringProgress / 100) } : undefined}
                  transition={{
                    duration: reducedMotion ? 0 : 1.15,
                    ease: [0.22, 1, 0.36, 1],
                    delay: reducedMotion ? 0 : delay + 0.15,
                  }}
                />
              </svg>
            )}
            <span className={cn('grid h-8 w-8 place-items-center rounded-xl', palette.chip, palette.text)}>
              <Icon className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>

      {spark && spark.length > 1 && <Sparkline points={spark} colour={palette.stroke} delay={delay} />}

      {/* A flat bar suits a percentage better than a ring around a small icon. */}
      {typeof progress === 'number' && !Icon && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/50">
          <motion.div
            className="h-full rounded-full"
            style={{ background: palette.stroke }}
            initial={reducedMotion ? false : { width: 0 }}
            animate={show ? { width: `${ringProgress}%` } : undefined}
            transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1], delay: reducedMotion ? 0 : delay + 0.2 }}
          />
        </div>
      )}
    </motion.div>
  );
}
