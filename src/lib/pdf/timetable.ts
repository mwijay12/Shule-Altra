/**
 * @fileOverview Printable master timetable, landscape A4, fully vector.
 * Replaces the old `window.print()` path: the grid is drawn with real PDF
 * primitives, so the output is crisp at any DPI and the text stays selectable.
 */

import {
  A4_LANDSCAPE,
  COLORS,
  createDocument,
  downloadPdf,
  finalize,
  letterhead,
  rect,
  text,
  fit,
} from '@/lib/pdf/kit';
import type { Timetable } from '@/lib/timetable';

export async function buildTimetablePdf(timetable: Timetable, options: { saved?: boolean } = {}): Promise<Uint8Array> {
  const ctx = await createDocument(
    {
      title: `${options.saved ? "Saved" : "Example"} timetable — ${timetable.className} ${timetable.stream}`,
      subject: 'Master class timetable',
      reference: `TT-${timetable.className.replace(/\s+/g, '')}-${timetable.stream}-${new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '')}`,
      issuedBy: 'Academic office',
    },
    { size: A4_LANDSCAPE, margin: 40 }
  );

  const { page, margin, width, font, bold } = ctx;
  letterhead(ctx, options.saved ? 'Saved class timetable' : 'EXAMPLE timetable - not an official schedule', `${timetable.className} · Stream ${timetable.stream} · ${timetable.term}`);

  const gridTop = ctx.cursorY + 10;
  const gridLeft = margin;
  const gridWidth = width - margin * 2;
  const timeWidth = 104;
  const dayWidth = (gridWidth - timeWidth) / timetable.days.length;
  const headerHeight = 24;
  const rowHeight = 36;
  const breakRowHeight = 15;

  let y = gridTop;

  // Header band
  rect(ctx, gridLeft, y - headerHeight, gridWidth, headerHeight, { color: COLORS.navy });
  text(ctx, 'TIME SLOT', gridLeft + 8, y - headerHeight + 8, {
    size: 7.2,
    font: bold,
    color: COLORS.white,
    maxWidth: timeWidth - 14,
  });
  timetable.days.forEach((day, index) => {
    const x = gridLeft + timeWidth + index * dayWidth;
    text(ctx, day.toUpperCase(), x + 6, y - headerHeight + 8, {
      size: 7.6,
      font: bold,
      color: COLORS.white,
      maxWidth: dayWidth - 12,
      align: 'center',
    });
  });
  y -= headerHeight;

  timetable.periods.forEach((period, periodIndex) => {
    const height = period.isBreak ? breakRowHeight : rowHeight;

    // Time gutter
    rect(ctx, gridLeft, y - height, timeWidth, height, { color: COLORS.soft, border: COLORS.line, borderWidth: 0.5 });
    text(ctx, period.label.toUpperCase(), gridLeft + 8, y - (period.isBreak ? 12 : 16), {
      size: 7,
      font: bold,
      color: period.isBreak ? COLORS.muted : COLORS.navy,
      maxWidth: timeWidth - 16,
    });
    if (!period.isBreak) {
      text(ctx, period.time, gridLeft + 8, y - 27, {
        size: 6.2,
        font,
        color: COLORS.muted,
        maxWidth: timeWidth - 16,
      });
    }

    if (period.isBreak) {
      rect(ctx, gridLeft + timeWidth, y - height, gridWidth - timeWidth, height, {
        color: COLORS.primary,
        opacity: 0.07,
        border: COLORS.line,
        borderWidth: 0.5,
      });
      text(ctx, `${period.label} · ${period.time}`, gridLeft + timeWidth + 8, y - 12, {
        size: 6.6,
        font: bold,
        color: COLORS.muted,
        maxWidth: gridWidth - timeWidth - 16,
      });
      y -= height;
      return;
    }

    timetable.days.forEach((day, dayIndex) => {
      const x = gridLeft + timeWidth + dayIndex * dayWidth;
      const slot = timetable.grid[periodIndex]?.[dayIndex];

      rect(ctx, x, y - height, dayWidth, height, {
        color: dayIndex % 2 === 0 ? COLORS.white : COLORS.soft,
        opacity: 0.55,
        border: COLORS.line,
        borderWidth: 0.5,
      });

      if (!slot) {
        text(ctx, '—', x + dayWidth / 2 - 2, y - height / 2 - 2, {
          size: 8,
          font,
          color: COLORS.muted,
        });
        return;
      }

      text(ctx, fit(bold, slot.subject.toUpperCase(), 7, dayWidth - 12), x + 6, y - 14, {
        size: 8,
        font: bold,
        color: COLORS.navy,
        maxWidth: dayWidth - 12,
      });
      text(ctx, fit(font, slot.teacher, 5.8, dayWidth - 12), x + 6, y - 23, {
        size: 6.2,
        font,
        color: COLORS.muted,
        maxWidth: dayWidth - 12,
      });
      text(ctx, fit(font, slot.room, 5.4, dayWidth - 12), x + 6, y - 30, {
        size: 5.6,
        font,
        color: COLORS.primary,
        maxWidth: dayWidth - 12,
      });
    });

    y -= height;
  });

  // Outer frame
  page.drawRectangle({
    x: gridLeft,
    y,
    width: gridWidth,
    height: gridTop - y,
    borderColor: COLORS.line,
    borderWidth: 0.9,
  });

  ctx.cursorY = y - 22;

  // Subject load legend (5 across, wraps to a second row when needed)
  text(ctx, 'SUBJECT ALLOCATION', margin, ctx.cursorY, { size: 7, font: bold, color: COLORS.navy });
  ctx.cursorY -= 11;
  const legendColumns = 5;
  const legendWidth = gridWidth / legendColumns;
  timetable.subjectLoad.forEach((entry, index) => {
    const column = index % legendColumns;
    const row = Math.floor(index / legendColumns);
    const x = margin + column * legendWidth;
    const legendY = ctx.cursorY - row * 10;
    page.drawCircle({ x: x + 2.5, y: legendY + 2.2, size: 1.6, color: COLORS.primary });
    text(ctx, `${entry.subject}`, x + 9, legendY, {
      size: 6.4,
      font,
      color: COLORS.ink,
      maxWidth: legendWidth - 52,
    });
    text(ctx, `${entry.periods} periods`, x + legendWidth - 46, legendY, {
      size: 6.2,
      font: bold,
      color: COLORS.muted,
      maxWidth: 44,
      align: 'right',
    });
  });

  const legendRows = Math.ceil(timetable.subjectLoad.length / legendColumns);
  ctx.cursorY -= legendRows * 10 + 12;



  return finalize(ctx, options.saved ? 'Saved schedule - verify assignments and period times with the school' : 'Generated example only - not saved or checked for cross-class clashes');
}

export async function downloadTimetablePdf(timetable: Timetable, options: { saved?: boolean } = {}) {
  const bytes = await buildTimetablePdf(timetable, options);
  const name = `timetable-${timetable.className.replace(/\s+/g, '-').toLowerCase()}-${timetable.stream}.pdf`;
  downloadPdf(bytes, name);
  return bytes;
}
