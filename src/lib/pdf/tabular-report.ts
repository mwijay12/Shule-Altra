/**
 * @fileOverview Generic tabular report builder.
 * One flexible engine powers every "Generate report" action in the Reports
 * centre: letterhead + crest, metadata grid, summary cards, one or more tables
 * and a signature block. Everything is drawn as vector content.
 */

import {
  A4_LANDSCAPE,
  COLORS,
  createDocument,
  downloadPdf,
  finalize,
  keyValueGrid,
  letterhead,
  line,
  rect,
  sectionTitle,
  signatureRow,
  table,
  text,
  type Column,
} from '@/lib/pdf/kit';

export interface ReportSection {
  title?: string;
  columns: Column[];
  rows: Array<Record<string, string>>;
  note?: string;
  compact?: boolean;
}

export interface SummaryCard {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'warn' | 'neutral';
}

export interface TabularReportInput {
  title: string;
  subtitle?: string;
  reference: string;
  meta?: Array<{ label: string; value: string; emphasis?: boolean }>;
  summary?: SummaryCard[];
  sections: ReportSection[];
  declaration?: string[];
  signatures?: Array<{ role: string; name: string }>;
  orientation?: 'portrait' | 'landscape';
  emptyMessage?: string;
}

const TONE_COLOR = {
  good: COLORS.success,
  bad: COLORS.danger,
  warn: COLORS.warning,
  neutral: COLORS.navy,
} as const;

export async function buildTabularReport(input: TabularReportInput): Promise<Uint8Array> {
  const ctx = await createDocument(
    {
      title: input.title,
      subject: input.subtitle ?? input.title,
      reference: input.reference,
      issuedBy: 'Registry',
    },
    input.orientation === 'landscape' ? { size: A4_LANDSCAPE } : {}
  );

  letterhead(ctx, input.title, input.subtitle);

  if (input.meta && input.meta.length > 0) {
    sectionTitle(ctx, 'Report parameters');
    keyValueGrid(ctx, input.meta);
  }

  if (input.summary && input.summary.length > 0) {
    const columns = Math.min(3, input.summary.length);
    const cardWidth = (ctx.width - ctx.margin * 2 - (columns - 1) * 12) / columns;
    input.summary.forEach((card, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = ctx.margin + column * (cardWidth + 12);
      const y = ctx.cursorY - row * 62;
      rect(ctx, x, y - 46, cardWidth, 54, {
        color: COLORS.soft,
        border: COLORS.line,
        borderWidth: 0.6,
      });
      rect(ctx, x, y - 46, 3, 54, { color: TONE_COLOR[card.tone ?? 'neutral'] });
      text(ctx, card.label.toUpperCase(), x + 10, y - 8, {
        size: 6.6,
        font: ctx.bold,
        color: COLORS.muted,
        maxWidth: cardWidth - 16,
      });
      text(ctx, card.value, x + 10, y - 26, {
        size: 12,
        font: ctx.bold,
        color: TONE_COLOR[card.tone ?? 'neutral'],
        maxWidth: cardWidth - 16,
      });
    });
    ctx.cursorY -= Math.ceil(input.summary.length / columns) * 62 + 4;
  }

  if (input.sections.length === 0) {
    text(ctx, input.emptyMessage ?? 'No records matched this report.', ctx.margin, ctx.cursorY, {
      size: 8.5,
      font: ctx.italic,
      color: COLORS.muted,
    });
    ctx.cursorY -= 20;
  }

  input.sections.forEach((section) => {
    if (section.title) sectionTitle(ctx, section.title);
    if (section.rows.length === 0) {
      text(ctx, 'No rows in this section.', ctx.margin, ctx.cursorY, {
        size: 7.8,
        font: ctx.italic,
        color: COLORS.muted,
      });
      ctx.cursorY -= 18;
    } else {
      table(ctx, section.columns, section.rows, { compact: section.compact, zebra: true });
    }
    if (section.note) {
      text(ctx, section.note, ctx.margin, ctx.cursorY, {
        size: 7.2,
        font: ctx.italic,
        color: COLORS.muted,
        maxWidth: ctx.width - ctx.margin * 2,
      });
      ctx.cursorY -= 16;
    }
    ctx.cursorY -= 8;
  });

  if (input.declaration && input.declaration.length > 0) {
    if (ctx.cursorY < 130) {
      ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
      ctx.pageNumber += 1;
      ctx.cursorY = ctx.height - 70;
    }
    sectionTitle(ctx, 'Declaration');
    input.declaration.forEach((entry) => {
      text(ctx, `• ${entry}`, ctx.margin, ctx.cursorY, {
        size: 7.6,
        color: COLORS.ink,
        maxWidth: ctx.width - ctx.margin * 2,
      });
      ctx.cursorY -= 12;
    });
    ctx.cursorY -= 6;
  }

  if (ctx.cursorY < 100) {
    ctx.page = ctx.doc.addPage([ctx.width, ctx.height]);
    ctx.pageNumber += 1;
    ctx.cursorY = ctx.height - 70;
  }

  line(ctx, ctx.margin, ctx.cursorY + 4, ctx.width - ctx.margin);
  signatureRow(
    ctx,
    input.signatures ?? [
      { role: 'Prepared by', name: 'Accounts office' },
      { role: 'Head of school', name: 'Dr. A. Mushi' },
    ]
  );

  return finalize(ctx, 'Computer-generated report · vector PDF · official institutional copy');
}

export async function downloadTabularReport(input: TabularReportInput, filename: string) {
  const bytes = await buildTabularReport(input);
  downloadPdf(bytes, filename);
  return bytes;
}

/** Shared helpers used by the reports screen when mapping Firestore rows. */
export function formatDate(value: any): string {
  if (!value) return '—';
  const date =
    typeof value?.toDate === 'function'
      ? value.toDate()
      : value instanceof Date
        ? value
        : typeof value?.seconds === 'number'
          ? new Date(value.seconds * 1000)
          : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB');
}

export function tzs(value: number): string {
  return `TZS ${Math.round(value).toLocaleString('en-US')}`;
}
