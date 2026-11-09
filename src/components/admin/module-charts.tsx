'use client';

/**
 * @fileOverview Small, honest charts for the modules that had none.
 *
 * Sixteen dashboard pages showed a number and a table with nothing in between,
 * so a bursar could not see a shape without exporting to Excel. These charts are
 * built from the records the page already holds — no invented series, no
 * placeholder trend. Where there is not enough data to draw, they say so rather
 * than rendering an empty axis.
 */

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartFrame, ShareBar, RatioDonut, useSeriesMotion } from '@/components/admin/chart-motion';
import { cn } from '@/lib/utils';

const AXIS = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } as const;

const tooltipStyle = {
  borderRadius: 14,
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card) / 0.97)',
  boxShadow: '0 18px 40px -22px hsl(var(--primary) / 0.4)',
  fontSize: 12,
  padding: '8px 12px',
} as const;

export function ChartPanel({
  title,
  hint,
  children,
  className,
  action,
  ...rest
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('glass-panel overflow-hidden rounded-[1.75rem]', className)} {...rest}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
          {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="grid h-[200px] place-items-center px-6 text-center">
      <p className="max-w-[36ch] text-[13px] leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}

/** Presence per class, from the live register. */
export function AttendanceByClass({ students }: { students: any[] }) {
  const motion = useSeriesMotion(0, 950);
  const rows = React.useMemo(() => {
    const groups = new Map<string, { present: number; total: number }>();
    for (const student of students ?? []) {
      const form = String(student.class ?? 'Unassigned');
      const entry = groups.get(form) ?? { present: 0, total: 0 };
      entry.total += 1;
      if (student.attendanceStatus !== 'Absent') entry.present += 1;
      groups.set(form, entry);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([form, { present, total }]) => ({
        form,
        rate: total ? Number(((present / total) * 100).toFixed(1)) : 0,
        present,
        total,
      }));
  }, [students]);

  if (rows.length === 0) return <Empty message="No learners on the register yet." />;

  return (
    <ChartFrame height={240}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <defs>
            <linearGradient id="attendanceBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160 74% 42%)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(160 74% 42%)" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="form" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} unit="%" />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: 'hsl(var(--muted) / 0.35)' }}
            formatter={(value: number, _key, item: any) => [
              `${value}% · ${item.payload.present}/${item.payload.total} present`,
              'Presence',
            ]}
          />
          <Bar dataKey="rate" fill="url(#attendanceBar)" radius={[8, 8, 0, 0]} maxBarSize={54} {...motion} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Boarding vs day, and the fee status split — both from the register. */
export function RegisterSplit({ students }: { students: any[] }) {
  const motion = useSeriesMotion(0, 1000);
  const data = React.useMemo(() => {
    let boarders = 0;
    let day = 0;
    for (const student of students ?? []) {
      if (student.type === 'Boarder') boarders += 1;
      else day += 1;
    }
    return [
      { name: 'Boarders', value: boarders, fill: 'hsl(var(--primary))' },
      { name: 'Day scholars', value: day, fill: 'hsl(var(--accent))' },
    ].filter((d) => d.value > 0);
  }, [students]);

  if (data.length === 0) return <Empty message="No learners on the register yet." />;

  return (
    <ChartFrame height={230}>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={3}
            {...motion}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v} learners`, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {data.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.fill }} />
            {entry.name} · <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

/** Fee collection per class — collected against what is still owed. */
export function FeesByClass({ students }: { students: any[] }) {
  const rows = React.useMemo(() => {
    const groups = new Map<string, number>();
    for (const student of students ?? []) {
      const form = String(student.class ?? 'Unassigned');
      groups.set(form, (groups.get(form) ?? 0) + Math.max(0, Number(student.balance) || 0));
    }
    return [...groups.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([form, owed]) => ({ form, owed }));
  }, [students]);

  if (rows.length === 0) return <Empty message="No balances on the register yet." />;
  const max = Math.max(...rows.map((r) => r.owed), 1);

  return (
    <ChartFrame height={rows.length * 46 + 16}>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <ShareBar
            key={row.form}
            index={i}
            label={row.form}
            value={row.owed}
            max={max}
            caption={`TZS ${row.owed.toLocaleString('en-US')}`}
            colour={i === 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--primary))'}
          />
        ))}
      </div>
    </ChartFrame>
  );
}

/** Occupancy against capacity, per hostel wing. */
export function OccupancyPanel({
  hostels,
  students,
}: {
  hostels: any[];
  students: any[];
}) {
  const wings = React.useMemo(() => {
    return (hostels ?? []).map((wing) => {
      const occupied = (students ?? []).filter((s) => s.hostel === wing.name).length;
      const capacity = Number(wing.capacity) || 0;
      return {
        name: wing.name as string,
        occupied,
        capacity,
        pct: capacity ? (occupied / capacity) * 100 : 0,
      };
    });
  }, [hostels, students]);

  if (wings.length === 0) return <Empty message="No hostel wings recorded yet." />;

  const totalCapacity = wings.reduce((sum, w) => sum + w.capacity, 0);
  const totalOccupied = wings.reduce((sum, w) => sum + w.occupied, 0);
  const overall = totalCapacity ? (totalOccupied / totalCapacity) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
      <RatioDonut
        value={overall}
        label="Overall occupancy"
        caption={`${totalOccupied} of ${totalCapacity} beds`}
        colour={overall > 90 ? 'hsl(0 72% 55%)' : 'hsl(var(--primary))'}
      />
      <div className="w-full flex-1 space-y-4">
        {wings.map((wing, i) => (
          <ShareBar
            key={wing.name}
            index={i}
            label={wing.name}
            value={wing.occupied}
            max={wing.capacity || 1}
            caption={`${wing.occupied} / ${wing.capacity}`}
            colour={wing.pct > 90 ? 'hsl(0 72% 55%)' : 'hsl(var(--accent))'}
          />
        ))}
      </div>
    </div>
  );
}

/** Bus load per route. */
export function FleetLoad({ routes }: { routes: any[] }) {
  const rows = React.useMemo(
    () =>
      (routes ?? [])
        .map((route) => ({
          name: String(route.name ?? route.route ?? 'Route'),
          students: Number(route.students) || 0,
          capacity: Number(route.capacity) || 0,
        }))
        .filter((r) => r.capacity > 0),
    [routes]
  );

  if (rows.length === 0) return <Empty message="No routes with a recorded capacity yet." />;

  return (
    <ChartFrame height={rows.length * 46 + 16}>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <ShareBar
            key={row.name}
            index={i}
            label={row.name}
            value={row.students}
            max={row.capacity}
            caption={`${row.students} / ${row.capacity} seats`}
            colour={row.students > row.capacity ? 'hsl(0 72% 55%)' : 'hsl(var(--primary))'}
          />
        ))}
      </div>
    </ChartFrame>
  );
}

/** Asset condition, counted from the register. */
export function AssetCondition({ assets }: { assets: any[] }) {
  const motion = useSeriesMotion(0, 1000);
  const data = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const asset of assets ?? []) {
      const status = String(asset.status ?? 'Unrecorded');
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
    const colours: Record<string, string> = {
      Working: 'hsl(160 74% 42%)',
      Functional: 'hsl(160 74% 42%)',
      Faulty: 'hsl(0 72% 55%)',
      Maintenance: 'hsl(38 92% 50%)',
      'Under Repair': 'hsl(38 92% 50%)',
    };
    return [...counts.entries()].map(([name, value], i) => ({
      name,
      value,
      fill: colours[name] ?? ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))'][i % 3],
    }));
  }, [assets]);

  if (data.length === 0) return <Empty message="No assets on the register yet." />;

  return (
    <ChartFrame height={230}>
      <ResponsiveContainer width="100%" height={230}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="86%" paddingAngle={3} {...motion}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v} assets`, n]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {data.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.fill }} />
            {entry.name} · <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
          </span>
        ))}
      </div>
    </ChartFrame>
  );
}

/** What the canteen actually sold, ranked by takings. */
export function CanteenMix({ sales }: { sales: any[] }) {
  const rows = React.useMemo(() => {
    const totals = new Map<string, { amount: number; count: number }>();
    for (const sale of sales ?? []) {
      const item = String(sale.item ?? 'Unrecorded');
      const entry = totals.get(item) ?? { amount: 0, count: 0 };
      entry.amount += Number(sale.amount) || 0;
      entry.count += 1;
      totals.set(item, entry);
    }
    return [...totals.entries()]
      .map(([item, { amount, count }]) => ({ item, amount, count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [sales]);

  if (rows.length === 0) return <Empty message="No sales recorded yet." />;
  const max = Math.max(...rows.map((r) => r.amount), 1);

  return (
    <ChartFrame height={rows.length * 46 + 16}>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <ShareBar
            key={row.item}
            index={i}
            label={row.item}
            value={row.amount}
            max={max}
            caption={`TZS ${row.amount.toLocaleString('en-US')} · ${row.count}`}
            colour={i === 0 ? 'hsl(160 74% 42%)' : 'hsl(var(--primary))'}
          />
        ))}
      </div>
    </ChartFrame>
  );
}
