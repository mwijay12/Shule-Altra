'use client';

/**
 * @fileOverview Shared motion for every chart in the hub.
 *
 * Recharts animates by default, but each page was passing its own duration and
 * easing, and two pages had chart containers that simply appeared. These helpers
 * give one grammar: the frame rises, then bars grow from the baseline, lines
 * trace left to right, and arcs sweep, each series a beat behind the last.
 *
 * Under reduced motion every duration is zero and Recharts animation is off, so
 * the final chart is drawn immediately rather than half-drawn.
 */

import * as React from 'react';
import { motion, useInView } from 'motion/react';
import type { AnimationTiming } from 'recharts/types/util/types';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils';
import { EASE_OUT_QUART, DURATION, STAGGER } from '@/lib/motion/tokens';

/** One easing curve for the whole product. Kept as an alias for existing callers. */
export const CHART_EASE = EASE_OUT_QUART;
// Recharts' type omits cubic-bezier, although react-smooth accepts it.
export const RECHARTS_EASE = `cubic-bezier(${EASE_OUT_QUART.join(',')})` as AnimationTiming;

/**
 * Spread this onto a Recharts series (Bar, Line, Area, Pie).
 * `order` staggers multiple series so they do not all move at once.
 */
export function useSeriesMotion(order = 0, duration = DURATION.chart * 1000) {
  const reducedMotion = useReducedMotion();
  return {
    isAnimationActive: !reducedMotion,
    animationDuration: reducedMotion ? 0 : duration,
    animationBegin: reducedMotion ? 0 : 150 + order * STAGGER.series * 1000,
    animationEasing: RECHARTS_EASE,
  };
}

/**
 * Wraps a chart so it animates when scrolled into view, not while off-screen.
 * A chart that played its entrance above the fold is a chart the user never saw
 * animate; this defers the first paint of the series until it is on screen.
 */
export function ChartFrame({
  children,
  className,
  delay = 0,
  /** Aspect helper: keeps the ResponsiveContainer from collapsing. */
  height = 260,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  height?: number;
}) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const ready = reducedMotion || inView;

  return (
    <motion.div
      ref={ref}
      initial={reducedMotion ? false : { opacity: 0, y: 26 }}
      animate={ready ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : delay, ease: CHART_EASE }}
      className={cn('w-full', className)}
      style={{ minHeight: height }}
    >
      {/* Mount the chart only once visible, so its own entrance is seen. */}
      {ready ? children : <div style={{ height }} aria-hidden />}
    </motion.div>
  );
}

/**
 * A horizontal bar that grows to its share, for league tables and breakdowns
 * where a whole Recharts instance would be overkill.
 */
export function ShareBar({
  value,
  max,
  label,
  caption,
  colour = 'hsl(var(--primary))',
  index = 0,
}: {
  value: number;
  max: number;
  label: string;
  caption?: string;
  colour?: string;
  index?: number;
}) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const delay = Math.min(index, 10) * STAGGER.bar;

  return (
    <div ref={ref}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">
          {caption ?? value.toLocaleString('en-US')}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted/50">
        <motion.div
          className="h-full rounded-full"
          style={{ background: colour, originX: 0 }}
          initial={reducedMotion ? false : { scaleX: 0 }}
          animate={inView || reducedMotion ? { scaleX: pct / 100 } : undefined}
          transition={{ duration: reducedMotion ? 0 : DURATION.chart, delay: reducedMotion ? 0 : delay, ease: CHART_EASE }}
        />
      </div>
    </div>
  );
}

/**
 * A donut drawn with SVG, for a single ratio (occupancy, collection rate).
 * Lighter than a one-slice Recharts pie and it animates the sweep properly.
 */
export function RatioDonut({
  value,
  label,
  caption,
  size = 132,
  colour = 'hsl(var(--primary))',
}: {
  /** 0–100 */
  value: number;
  label: string;
  caption?: string;
  size?: number;
  colour?: string;
}) {
  const reducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted/60"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke={colour}
            strokeDasharray={circumference}
            initial={reducedMotion ? false : { strokeDashoffset: circumference }}
            animate={inView || reducedMotion ? { strokeDashoffset: circumference * (1 - pct / 100) } : undefined}
            transition={{ duration: reducedMotion ? 0 : 1.3, ease: CHART_EASE, delay: reducedMotion ? 0 : 0.15 }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-headline text-[22px] font-bold tabular-nums text-foreground">
            {pct.toFixed(pct % 1 === 0 ? 0 : 1)}%
          </span>
        </div>
      </div>
      <p className="text-center text-[13px] font-semibold text-foreground">{label}</p>
      {caption && <p className="text-center text-[12px] text-muted-foreground">{caption}</p>}
    </div>
  );
}
