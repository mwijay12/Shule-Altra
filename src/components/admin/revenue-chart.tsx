'use client';

/**
 * @fileOverview Interactive collections chart with time-range filters.
 * Buckets live ledger data into day/week windows and animates on every change.
 */

import * as React from 'react';
import { motion } from 'motion/react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { RANGE_OPTIONS, useRange, type RangeKey } from '@/components/admin/range-context';
import { cn } from '@/lib/utils';
import { ChartFrame } from '@/components/admin/chart-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { GlidingTooltip, useSeriesFocus, useStableSeries } from '@/components/motion/chart-interaction';
import { SPRING_TACTILE, DURATION, STAGGER } from '@/lib/motion/tokens';

interface RevenueChartProps {
  transactions: any[];
  target?: number;
  isLoading?: boolean;
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  return null;
}

export function formatCompactTzs(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
}

interface Bucket {
  label: string;
  collected: number;
  pending: number;
  target: number;
  count: number;
}

function buildBuckets(transactions: any[], days: number): Bucket[] {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const start = new Date(now.getTime() - days * 86_400_000);

  // Daily buckets for short windows, weekly for long ones.
  const weekly = days > 45;
  const bucketSpan = weekly ? 7 : 1;
  const buckets: Bucket[] = [];
  const bucketCount = Math.ceil(days / bucketSpan);

  for (let i = 0; i < bucketCount; i += 1) {
    const bucketEnd = new Date(start.getTime() + (i + 1) * bucketSpan * 86_400_000);
    const startLabel = new Date(start.getTime() + i * bucketSpan * 86_400_000);
    const label = startLabel.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
    buckets.push({
      label,
      collected: 0,
      pending: 0,
      target: 0,
      count: 0,
    });
    bucketEnd.setHours(0, 0, 0, 0);
  }

  const totalTarget = 76_000_000;
  const perBucketTarget = totalTarget / bucketCount;
  buckets.forEach((bucket) => {
    bucket.target = perBucketTarget;
  });

  transactions.forEach((transaction) => {
    const created = toDate(transaction?.createdAt);
    if (!created || created < start || created > now) return;
    const index = Math.min(
      bucketCount - 1,
      Math.max(0, Math.floor((created.getTime() - start.getTime()) / (bucketSpan * 86_400_000)))
    );
    const bucket = buckets[index];
    if (!bucket) return;
    const amount = Number(transaction?.amount ?? 0);
    if (transaction?.status === 'Pending') bucket.pending += amount;
    else if (transaction?.status !== 'Failed') bucket.collected += amount;
    bucket.count += 1;
  });

  return buckets;
}

/** Series colours follow the school's published palette, not a fixed blue. */
const SERIES = {
  collected: 'hsl(var(--primary))',
  pending: 'hsl(var(--accent))',
  target: 'hsl(38 90% 55%)',
} as const;

const SERIES_LABEL: Record<string, string> = {
  collected: 'Verified',
  pending: 'Pending',
  target: 'Target',
};

export function RevenueChart({ transactions, target, isLoading }: RevenueChartProps) {
  const { range, setRange, days } = useRange();
  const reducedMotion = useReducedMotion();
  const buckets = React.useMemo(() => buildBuckets(transactions ?? [], days), [transactions, days]);
  // Hold the last dataset while the next one loads so Recharts interpolates the
  // points in place. Unmounting here made every 7D -> 30D switch redraw from zero.
  const data = useStableSeries(buckets, isLoading);
  const { focused, opacityFor, bind } = useSeriesFocus();

  const totals = React.useMemo(() => {
    const collected = data.reduce((sum, bucket) => sum + bucket.collected, 0);
    const pending = data.reduce((sum, bucket) => sum + bucket.pending, 0);
    const expected = target ?? data.reduce((sum, bucket) => sum + bucket.target, 0);
    const rate = expected > 0 ? Math.min(100, (collected / expected) * 100) : 0;
    return { collected, pending, expected, rate };
  }, [data, target]);

  const average = totals.collected / Math.max(1, data.length);

  return (
    <div data-reveal className="glass-panel relative overflow-hidden rounded-3xl p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold text-muted-foreground">
            Fee collections
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
            <p className="whitespace-nowrap font-headline text-[24px] font-bold leading-none tracking-tight text-foreground tabular-nums sm:text-[28px]">
              <AnimatedNumber value={totals.collected} prefix="TZS " />
            </p>
            <span className="mb-1 flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[12px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-2.5 w-2.5" />
              <AnimatedNumber value={totals.rate} format={(n) => n.toFixed(1)} suffix="% of target" />
            </span>
          </div>
          <p className="mt-2 text-[13px] font-bold text-muted-foreground">
            {totals.pending > 0
              ? `TZS ${totals.pending.toLocaleString('en-US')} pending verification`
              : 'No payments awaiting verification'}
            {isLoading ? ' · syncing' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-muted/25 p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key as RangeKey)}
              className={cn(
                'relative rounded-xl px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                range === option.key ? 'text-white' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {range === option.key && (
                <motion.span
                  layoutId="chart-range-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-accent shadow-md shadow-primary/30"
                  transition={SPRING_TACTILE}
                />
              )}
              <span className="relative z-10">{option.short}</span>
            </button>
          ))}
        </div>
      </div>

      <ChartFrame className="mt-5 h-[260px] w-full sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.collected} stopOpacity={0.45} />
                <stop offset="100%" stopColor={SERIES.collected} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={formatCompactTzs}
              tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <Tooltip
              content={
                <GlidingTooltip
                  formatter={(value) => `TZS ${value.toLocaleString('en-US')}`}
                />
              }
              cursor={{ stroke: 'hsl(var(--primary))', strokeDasharray: '4 4' }}
              wrapperStyle={{ transition: 'none', zIndex: 20 }}
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke={SERIES.collected}
              strokeWidth={2.4}
              fill="url(#collectedFill)"
              isAnimationActive={!reducedMotion}
              animationDuration={DURATION.chart * 1000}
              animationEasing="ease-out"
              animationBegin={0}
              strokeOpacity={opacityFor('collected')}
              fillOpacity={opacityFor('collected')}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
              onMouseEnter={() => bind('collected').onMouseEnter()}
              onMouseLeave={() => bind('collected').onMouseLeave()}
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke={SERIES.pending}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={!reducedMotion}
              animationDuration={DURATION.chart * 1000}
              animationEasing="ease-out"
              animationBegin={STAGGER.series * 1000}
              strokeOpacity={opacityFor('pending')}
              onMouseEnter={() => bind('pending').onMouseEnter()}
              onMouseLeave={() => bind('pending').onMouseLeave()}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke={SERIES.target}
              strokeWidth={1.4}
              strokeDasharray="2 5"
              dot={false}
              isAnimationActive={!reducedMotion}
              animationDuration={DURATION.chart * 1000}
              animationEasing="ease-out"
              animationBegin={STAGGER.series * 2000}
              strokeOpacity={opacityFor('target')}
              onMouseEnter={() => bind('target').onMouseEnter()}
              onMouseLeave={() => bind('target').onMouseLeave()}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
        {[
          { label: 'Verified', value: totals.collected, dot: 'bg-primary', series: 'collected' },
          { label: 'Pending', value: totals.pending, dot: 'bg-accent', series: 'pending' },
          { label: 'Target', value: totals.expected, dot: 'bg-amber-500', series: 'target' },
          { label: 'Avg / bucket', value: Math.round(average), dot: 'bg-emerald-500', series: null },
        ].map((item) => (
          <div
            key={item.label}
            {...(item.series ? bind(item.series) : {})}
            tabIndex={item.series ? 0 : undefined}
            className={cn(
              'rounded-lg outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-ring',
              item.series && 'cursor-default',
              focused && item.series && focused !== item.series && 'opacity-40'
            )}
          >
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 rounded-full', item.dot)} />
              {item.label}
            </p>
            <p className="mt-1 truncate text-[14px] font-bold tabular-nums text-foreground"><AnimatedNumber value={item.value} prefix="TZS " /></p>
          </div>
        ))}
      </div>

      <TrendingUp className="pointer-events-none absolute right-6 top-6 hidden h-4 w-4 text-primary/20 sm:block" />
    </div>
  );
}
