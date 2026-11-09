'use client';

/**
 * @fileOverview Focus, staggered bar growth and a gliding tooltip for Recharts.
 *
 * Recharts starts every bar in a series on the same frame. GrowingBar replaces
 * the shape so each bar rises 40ms behind the one before it.
 */

import * as React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  DIMMED_OPACITY,
  EASE_OUT_QUART,
  DURATION,
  STAGGER,
  SPRING_GLIDE,
} from '@/lib/motion/tokens';

/** Dims sibling series so one line can be read out of three overlapping ones. */
export function useSeriesFocus() {
  const [focused, setFocused] = React.useState<string | null>(null);

  const opacityFor = React.useCallback(
    (key: string) => (focused === null || focused === key ? 1 : DIMMED_OPACITY),
    [focused],
  );

  /** Spread onto a legend row or any focusable control. */
  const bind = React.useCallback(
    (key: string) => ({
      onMouseEnter: () => setFocused(key),
      onMouseLeave: () => setFocused(null),
      onFocus: () => setFocused(key),
      onBlur: () => setFocused(null),
    }),
    [],
  );

  return { focused, setFocused, opacityFor, bind };
}

/** Recharts calls shape with the resolved geometry of each bar. */
interface GrowingBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  radius?: number;
  index?: number;
  opacity?: number;
}

/**
 * A bar that grows from the baseline, one after another.
 *
 * Pair with `isAnimationActive={false}` on the parent <Bar>: leaving Recharts'
 * own animation on fights this one and the bar jumps twice.
 */
export function GrowingBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  radius = 6,
  index = 0,
  opacity = 1,
}: GrowingBarProps) {
  const reducedMotion = useReducedMotion();
  const delay = Math.min(index, 24) * STAGGER.bar;

  // Geometry stays in the SVG attributes; only scaleY animates. Two reasons:
  // Motion treats a `y` prop as translateY rather than the SVG attribute, and
  // animating `height` repaints the rect every frame instead of compositing it.
  // Origin at the bottom edge makes the bar rise off the baseline.
  return (
    <motion.rect
      x={x}
      y={y}
      width={Math.max(0, width)}
      height={Math.max(0, height)}
      rx={radius}
      ry={radius}
      fill={fill}
      // Motion owns transform-origin and overwrites the CSS property, so the
      // origin has to go through its own originY prop. Without this the bar
      // scales out of its centre instead of rising off the baseline.
      style={{ transformBox: 'fill-box', originX: 0.5, originY: 1 }}
      initial={reducedMotion ? false : { scaleY: 0 }}
      animate={{ scaleY: 1, opacity }}
      transition={{
        scaleY: { duration: reducedMotion ? 0 : DURATION.chart, delay: reducedMotion ? 0 : delay, ease: EASE_OUT_QUART },
        opacity: { duration: reducedMotion ? 0 : 0.25 },
      }}
    />
  );
}

interface TooltipEntry {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
}

/**
 * A tooltip that glides between points. Recharts changes its absolute translate
 * the instant the pointer crosses a bucket; the spring smooths that jump.
 */
export function GlidingTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string | number) => string;
}) {
  const reducedMotion = useReducedMotion();
  if (!active || !payload?.length) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : SPRING_GLIDE}
      className="rounded-2xl border border-border/70 bg-popover px-3 py-2 shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.45)]"
    >
      {label !== undefined && (
        <p className="text-[11px] font-semibold text-muted-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => {
        const name = String(entry.name ?? entry.dataKey ?? '');
        const value = Number(entry.value ?? 0);
        return (
          <p
            key={`${name}-${i}`}
            className="mt-1 flex items-center justify-between gap-4 text-[13px] font-bold"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: entry.color }} />
              {name}
            </span>
            <span className="tabular-nums text-foreground">
              {formatter ? formatter(value, name) : value.toLocaleString('en-US')}
            </span>
          </p>
        );
      })}
    </motion.div>
  );
}

/**
 * Holds the last dataset while the next one loads so Recharts morphs in place.
 *
 * Recharts interpolates only while the element survives. A `key={range}`, or a
 * conditional that unmounts during loading, redraws the series from zero.
 */
export function useStableSeries<T>(next: T[], isLoading?: boolean): T[] {
  const previous = React.useRef<T[]>(next);
  if (!isLoading && next.length > 0) previous.current = next;
  return previous.current.length > 0 ? previous.current : next;
}
