'use client';

/**
 * @fileOverview Draggable follow-up queue (Framer Motion Reorder).
 * The secretary of the bursar can re-order who gets chased first; order persists.
 */

import * as React from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Download, GripVertical, Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export interface FollowUpItem {
  id: string;
  name: string;
  className: string;
  balance: number;
  paid: number;
  admissionNumber: string;
}

interface PriorityBoardProps {
  items: FollowUpItem[];
  onExport: (item: FollowUpItem) => Promise<void> | void;
}

const STORAGE_KEY = 'altra-followup-order';

function formatTzs(value: number) {
  return `TZS ${Math.round(value).toLocaleString('en-US')}`;
}

function DraggableRow({
  item,
  index,
  onExport,
}: {
  item: FollowUpItem;
  index: number;
  onExport: (item: FollowUpItem) => Promise<void> | void;
}) {
  const controls = useDragControls();
  const [busy, setBusy] = React.useState(false);

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: '0 18px 40px -18px rgba(15,23,42,0.45)' }}
      className="group relative flex items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-2.5 py-2.5"
    >
      <button
        type="button"
        aria-label={`Reorder ${item.name}`}
        onPointerDown={(event) => controls.start(event)}
        className="cursor-grab touch-none rounded-lg p-1 text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-[10px] font-black text-primary">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-black uppercase tracking-tight text-foreground">
          {item.name}
        </p>
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {item.className} · {item.admissionNumber}
        </p>
      </div>

      <div className="hidden text-right sm:block">
        <p className="text-[10px] font-black tabular-nums text-destructive">{formatTzs(item.balance)}</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {item.paid > 0 ? `${formatTzs(item.paid)} paid` : 'nothing paid'}
        </p>
      </div>

      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          try {
            await onExport(item);
          } finally {
            setBusy(false);
          }
        }}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        aria-label={`Export statement for ${item.name}`}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      </button>
    </Reorder.Item>
  );
}

export function PriorityBoard({ items, onExport }: PriorityBoardProps) {
  const { toast } = useToast();
  const [order, setOrder] = React.useState<FollowUpItem[]>(items);

  React.useEffect(() => {
    if (items.length === 0) return;
    let saved: string[] = [];
    try {
      saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      saved = [];
    }
    if (saved.length === 0) {
      setOrder(items);
      return;
    }
    const ranked = [...items].sort((a, b) => {
      const aIndex = saved.indexOf(a.id);
      const bIndex = saved.indexOf(b.id);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    setOrder(ranked);
  }, [items]);

  const handleReorder = (next: FollowUpItem[]) => {
    setOrder(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map((item) => item.id)));
    } catch {
      /* ignore */
    }
  };

  return (
    <div data-reveal className="glass-panel flex h-full flex-col rounded-3xl p-4 sm:p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">
            Follow-up queue
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-[13px] text-foreground">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            {order.length} balances to chase
          </h3>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em] text-primary">
          Draggable
        </span>
      </div>

      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Drag to set priority · tap ↓ for a vector fee statement
      </p>

      <Reorder.Group
        axis="y"
        values={order}
        onReorder={handleReorder}
        className={cn('mt-3 flex flex-1 flex-col gap-2', order.length === 0 && 'justify-center')}
      >
        {order.map((item, index) => (
          <DraggableRow key={item.id} item={item} index={index} onExport={onExport} />
        ))}
      </Reorder.Group>

      {order.length === 0 && (
        <p className="py-8 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          No outstanding balances 🎉
        </p>
      )}

      <button
        type="button"
        onClick={() =>
          toast({
            title: 'Priority order saved',
            description: 'The queue is stored on this device and survives reloads.',
          })
        }
        className="mt-3 rounded-xl border border-border/70 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        Confirm order
      </button>
    </div>
  );
}
