'use client';

/**
 * @fileOverview Animated KPI tile: GSAP number count-up, SVG progress ring and a
 * sparkline. Values animate whenever the reporting window changes.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: number;
  format?: (value: number) => string;
  delta?: number;
  caption?: string;
  icon: LucideIcon;
  tone?: 'primary' | 'accent' | 'emerald' | 'amber';
  progress?: number;
  spark?: number[];
  delay?: number;
}

const TONES = {
  primary: {
    ring: 'hsl(214 85% 58%)',
    chip: 'bg-primary/12 text-primary',
    glow: 'shadow-primary/20',
    stroke: 'stroke-primary',
  },
  accent: {
    ring: 'hsl(264 82% 66%)',
    chip: 'bg-accent/12 text-accent',
    glow: 'shadow-accent/20',
    stroke: 'stroke-accent',
  },
  emerald: {
    ring: 'hsl(160 74% 44%)',
    chip: 'bg-emerald-500/12 text-emerald-600',
    glow: 'shadow-emerald-500/20',
    stroke: 'stroke-emerald-500',
  },
  amber: {
    ring: 'hsl(38 90% 55%)',
    chip: 'bg-amber-500/12 text-amber-600',
    glow: 'shadow-amber-500/20',
    stroke: 'stroke-amber-500',
  },
} as const;

function useCountUp(value: number, duration = 1.1) {
  const [display, setDisplay] = React.useState(value);
  const previous = React.useRef(value);

  React.useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) {
      setDisplay(value);
      return;
    }

    const reduceMotion =
      typeof window === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    let frame: number | undefined;
    let cancelled = false;
    const started = Date.now();
    const total = Math.max(120, duration * 1000);
    const fallback = window.setTimeout(() => setDisplay(value), total + 220);

    const tick = () => {
      if (cancelled) return;
      const progress = Math.min(1, Math.max(0, (Date.now() - started) / total));
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) {
        // Timer-driven so the sweep also runs in throttled/headless environments.
        frame = window.setTimeout(tick, 16);
      } else {
        setDisplay(value);
      }
    };
    frame = window.setTimeout(tick, 16);

    return () => {
      cancelled = true;
      if (frame !== undefined) window.clearTimeout(frame);
      window.clearTimeout(fallback);
    };
  }, [value, duration]);

  // Final authority: never leave a stale figure on screen.
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDisplay(value), duration * 1000 + 200);
    return () => window.clearTimeout(timer);
  }, [value, duration]);

  return display;
}

function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 26 - ((point - min) / span) * 22 - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className={cn('h-7 w-full', className)} aria-hidden>
      <path d={`${path} L100,26 L0,26 Z`} className="fill-current opacity-10" />
      <motion.path
        d={path}
        fill="none"
        strokeWidth={1.8}
        strokeLinecap="round"
        className="stroke-current"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  format = (input) => Math.round(input).toLocaleString('en-US'),
  delta,
  caption,
  icon: Icon,
  tone = 'primary',
  progress,
  spark,
  delay = 0,
}: KpiCardProps) {
  const display = useCountUp(value);
  const palette = TONES[tone];
  const ringProgress = Math.max(0, Math.min(100, progress ?? 0));
  const radius = 20;
  const circumference = 2 * Math.PI * radius;

  return (
    <motion.div
      data-reveal
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-panel hover-lift sheen group relative overflow-hidden rounded-3xl p-4 sm:p-5',
        palette.glow
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate font-headline text-[22px] font-black leading-none tracking-tight text-foreground sm:text-[26px]">
            {format(display)}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            {typeof delta === 'number' && (
              <span
                className={cn(
                  'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black',
                  delta >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-destructive/12 text-destructive'
                )}
              >
                {delta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
            {caption && (
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {caption}
              </span>
            )}
          </div>
        </div>

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
                stroke={palette.ring}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference * (1 - ringProgress / 100) }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: delay + 0.1 }}
              />
            </svg>
          )}
          <span className={cn('grid h-8 w-8 place-items-center rounded-xl', palette.chip)}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </div>

      {spark && spark.length > 1 && (
        <div className={cn('mt-3', palette.chip.split(' ')[1])}>
          <Sparkline points={spark} />
        </div>
      )}
    </motion.div>
  );
}
