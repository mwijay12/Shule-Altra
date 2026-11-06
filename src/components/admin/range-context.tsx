'use client';

/**
 * @fileOverview Shared reporting-window state for the command deck + topbar.
 */

import * as React from 'react';

export type RangeKey = '7d' | '30d' | '90d' | 'term';

export const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; short: string }> = [
  { key: '7d', label: 'Last 7 days', short: '7D' },
  { key: '30d', label: 'Last 30 days', short: '30D' },
  { key: '90d', label: 'Last 90 days', short: '90D' },
  { key: 'term', label: 'This term', short: 'TERM' },
];

export const RANGE_DAYS: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  term: 120,
};

interface RangeContextValue {
  range: RangeKey;
  setRange: (range: RangeKey) => void;
  days: number;
  label: string;
  from: Date;
  to: Date;
}

const RangeContext = React.createContext<RangeContextValue | null>(null);

export function RangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = React.useState<RangeKey>('30d');

  const value = React.useMemo(() => {
    const days = RANGE_DAYS[range];
    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);
    const label = RANGE_OPTIONS.find((option) => option.key === range)?.label ?? 'Last 30 days';
    return { range, setRange, days, label, from, to };
  }, [range]);

  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange() {
  const ctx = React.useContext(RangeContext);
  if (!ctx) {
    const days = 30;
    const to = new Date();
    const from = new Date(to.getTime() - days * 86_400_000);
    return {
      range: '30d' as RangeKey,
      setRange: () => {},
      days,
      label: 'Last 30 days',
      from,
      to,
    };
  }
  return ctx;
}
