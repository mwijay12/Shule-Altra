'use client';

import * as React from 'react';
import { useInView } from 'motion/react';
import { useCountUp } from '@/hooks/use-count-up';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

const wholeNumber = (value: number) => Math.round(value).toLocaleString('en-US');

/** Shared dashboard counter. No live region: a tick must not interrupt a reader. */
export function AnimatedNumber({
  value,
  format = wholeNumber,
  duration,
  prefix = '',
  suffix = '',
  className,
}: AnimatedNumberProps) {
  const ref = React.useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true });
  const display = useCountUp(value, duration, inView);
  const target = Number.isFinite(value) ? value : 0;
  return (
    <span ref={ref} data-count-value={target} aria-label={`${prefix}${format(target)}${suffix}`} className={cn('tabular-nums', className)}>
      {prefix}{format(display)}{suffix}
    </span>
  );
}
