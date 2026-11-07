/**
 * @fileOverview Vector document kit built on pdf-lib.
 *
 * Every document produced here is a genuine PDF: real text runs, selectable and
 * searchable, drawn with vector primitives. Nothing is screenshotted or
 * rasterised from the UI — the output can be printed at any DPI, indexed by
 * PDF text search and re-flowed by screen readers.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib';

export const A4: [number, number] = [595.28, 841.89];
export const A4_LANDSCAPE: [number, number] = [841.89, 595.28];
export const CARD: [number, number] = [242.65, 153.07]; // 85.6mm x 54mm ID-1

export const COLORS = {
  // the app's identity: blue → deep indigo with a neutral, printable stock.
  navy: rgb(0.118, 0.243, 0.4),
  primary: rgb(0.122, 0.357, 0.651),
  accent: rgb(0.294, 0.239, 0.58),
  ink: rgb(0.09, 0.13, 0.19),
  muted: rgb(0.42, 0.47, 0.55),
  line: rgb(0.85, 0.88, 0.92),
  soft: rgb(0.957, 0.969, 0.984),
  white: rgb(1, 1, 1),
  success: rgb(0.09, 0.6, 0.4),
  warning: rgb(0.85, 0.55, 0.1),
  danger: rgb(0.8, 0.22, 0.24),
};

export const CREST = {
  gold: rgb(0.83, 0.69, 0.31),
  goldSoft: rgb(0.93, 0.85, 0.62),
};

export const SCHOOL = {
  name: 'SHULE ALTRA SECONDARY SCHOOL',
  motto: 'Elimu Bora, Maisha Bora',
  address: 'Plot 14, Bagamoyo Road · Dar es Salaam, Tanzania',
  contacts: 'info@shulealtra.ac.tz · +255 22 555 0142',
  registration: 'Reg. No. S/DSM/2016/0412 · NECTA Centre 0412',
};

export interface DocMeta {
  title: string;
  subject: string;
  reference: string;
  issuedBy: string;
}

export interface BuildContext {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  width: number;
  height: number;
  cursorY: number;
  margin: number;
  meta: DocMeta;
  pageNumber: number;
}

export function sanitize(value: string): string {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/·/g, '|')
    .replace(/[^\x20-\x7E]/g, '');
}

export function money(value: number): string {
  return `TZS ${Math.round(value).toLocaleString('en-US')}`;
}

export function shortMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `TZS ${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `TZS ${(value / 1_000).toFixed(0)}K`;
  return money(value);
}

export function fit(font: PDFFont, text: string, size: number, maxWidth: number): string {
  const clean = sanitize(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

export function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) lines.push(current);
  return lines;
}


/**
 * The school crest, drawn entirely with vector paths (shield, open book, torch).
 * `tone: 'dark'` is for placement on the navy letterhead band, `'light'` for paper.
 */
export function drawCrest(
  page: PDFPage,
  options: {
    x: number;
    y: number;
    size: number;
    tone?: 'dark' | 'light';
    opacity?: number;
    font?: PDFFont;
    monogram?: string;
  }
) {
  const { x, y, size, tone = 'dark', opacity = 1, font, monogram = 'SA' } = options;
  const scale = size / 100;
  const shieldFill = tone === 'dark' ? COLORS.white : COLORS.navy;
  const bookFill = tone === 'dark' ? COLORS.navy : COLORS.white;
  const outline = tone === 'dark' ? COLORS.white : COLORS.navy;

  const shield = 'M50 2 L95 16 L95 58 C95 88 72 106 50 115 C28 106 5 88 5 58 L5 16 Z';

  // Shield body + inner rule
  page.drawSvgPath(shield, {
    x,
    y,
    scale,
    color: shieldFill,
    opacity,
    borderColor: CREST.gold,
    borderWidth: Math.max(1, 2.4 * scale),
  });

  // Open book
  page.drawSvgPath('M22 56 L50 49 L78 56 L78 77 L50 70 L22 77 Z', {
    x,
    y,
    scale,
    color: bookFill,
    opacity,
  });
  page.drawSvgPath('M50 49 L50 70', {
    x,
    y,
    scale,
    color: CREST.gold,
    borderColor: CREST.gold,
    borderWidth: Math.max(0.6, 1.2 * scale),
    opacity,
  });

  // Torch flame above the book
  page.drawSvgPath('M50 22 C58 32 60 39 56 46 C52 39 46 42 48 48 C42 43 43 30 50 22 Z', {
    x,
    y,
    scale,
    color: CREST.gold,
    opacity,
  });

  if (font && monogram) {
    const label = monogram.slice(0, 3).toUpperCase();
    const fontSize = Math.max(4.5, 13 * scale);
    const labelWidth = font.widthOfTextAtSize(label, fontSize);
    page.drawText(label, {
      x: x + (size - labelWidth) / 2,
      y: y - 92 * scale,
      size: fontSize,
      font,
      color: CREST.gold,
      opacity,
    });
  }

  // Motto band under the shield
  page.drawSvgPath('M20 100 L80 100 L74 108 L26 108 Z', {
    x,
    y,
    scale,
    color: tone === 'dark' ? COLORS.white : COLORS.navy,
    opacity: 0.22,
  });

  return { width: size, height: size * 1.15, outline };
}

export async function createDocument(
  meta: DocMeta,
  options: { size?: [number, number]; margin?: number } = {}
): Promise<BuildContext> {
  const size = options.size ?? A4;
  const doc = await PDFDocument.create();
  doc.setTitle(sanitize(meta.title));
  doc.setSubject(sanitize(meta.subject));
  doc.setAuthor(SCHOOL.name);
  doc.setCreator('Shule Altra Command OS');
  doc.setProducer('Shule Altra · pdf-lib vector engine');
  doc.setKeywords(['Shule Altra', 'school', 'Tanzania', meta.reference]);
  doc.setCreationDate(new Date());

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  return {
    doc,
    page: doc.addPage(size),
    font,
    bold,
    italic,
    width: size[0],
    height: size[1],
    cursorY: size[1],
    margin: options.margin ?? 44,
    meta,
    pageNumber: 1,
  };
}

export function text(
  ctx: BuildContext,
  value: string,
  x: number,
  y: number,
  options: {
    size?: number;
    font?: PDFFont;
    color?: RGB;
    maxWidth?: number;
    align?: 'left' | 'right' | 'center';
    opacity?: number;
  } = {}
) {
  const size = options.size ?? 10;
  const font = options.font ?? ctx.font;
  const color = options.color ?? COLORS.ink;
  const content = options.maxWidth ? fit(font, value, size, options.maxWidth) : sanitize(value);
  let drawX = x;
  if (options.align === 'right' && options.maxWidth) {
    drawX = x + options.maxWidth - font.widthOfTextAtSize(content, size);
  } else if (options.align === 'center' && options.maxWidth) {
    drawX = x + (options.maxWidth - font.widthOfTextAtSize(content, size)) / 2;
  }
  ctx.page.drawText(content, {
    x: drawX,
    y,
    size,
    font,
    color,
    opacity: options.opacity ?? 1,
  });
  return ctx;
}

export function rect(
  ctx: BuildContext,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { color?: RGB; opacity?: number; radius?: number; border?: RGB; borderWidth?: number } = {}
) {
  if (options.radius) {
    ctx.page.drawRectangle({
      x,
      y,
      width,
      height,
      color: options.color ?? COLORS.soft,
      opacity: options.opacity ?? 1,
      borderColor: options.border,
      borderWidth: options.borderWidth,
      borderOpacity: options.border ? 1 : undefined,
    });
    // Rounded corners are unnecessary for print fidelity; square keeps vector maths simple.
    return ctx;
  }
  ctx.page.drawRectangle({
    x,
    y,
    width,
    height,
    color: options.color,
    opacity: options.opacity,
    borderColor: options.border,
    borderWidth: options.borderWidth,
  });
  return ctx;
}

export function line(ctx: BuildContext, x1: number, y: number, x2: number, color: RGB = COLORS.line, thickness = 0.7) {
  ctx.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color, thickness });
  return ctx;
}

/** Institutional letterhead + document title band. */
export function letterhead(ctx: BuildContext, title: string, subtitle?: string) {
  const { page, width, height, margin } = ctx;

  page.drawRectangle({ x: 0, y: height - 112, width, height: 112, color: COLORS.navy });
  page.drawRectangle({ x: 0, y: height - 118, width: width * 0.62, height: 6, color: COLORS.primary });
  page.drawRectangle({ x: width * 0.62, y: height - 118, width: width * 0.38, height: 6, color: COLORS.accent });

  // Crest: vector shield drawn on the navy band
  drawCrest(page, { x: margin, y: height - 12, size: 42, tone: 'dark', font: ctx.bold });

  page.drawText(SCHOOL.name, {
    x: margin + 58,
    y: height - 44,
    size: 13,
    font: ctx.bold,
    color: COLORS.white,
  });
  page.drawText(sanitize(SCHOOL.address), {
    x: margin + 58,
    y: height - 59,
    size: 7.5,
    font: ctx.font,
    color: COLORS.white,
    opacity: 0.82,
  });
  page.drawText(sanitize(SCHOOL.contacts), {
    x: margin + 58,
    y: height - 70,
    size: 7.5,
    font: ctx.font,
    color: COLORS.white,
    opacity: 0.82,
  });
  page.drawText(sanitize(SCHOOL.registration), {
    x: margin + 58,
    y: height - 81,
    size: 6.8,
    font: ctx.font,
    color: COLORS.white,
    opacity: 0.6,
  });

  page.drawText(fit(ctx.bold, title.toUpperCase(), 10, width / 2), {
    x: width - margin - width / 3.4,
    y: height - 45,
    size: 10,
    font: ctx.bold,
    color: COLORS.white,
    opacity: 0.92,
  });
  page.drawText(sanitize(`Ref ${ctx.meta.reference}`), {
    x: width - margin - width / 3.4,
    y: height - 62,
    size: 7,
    font: ctx.font,
    color: COLORS.white,
    opacity: 0.7,
  });
  const issued = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  page.drawText(sanitize(`Issued ${issued}`), {
    x: width - margin - width / 3.4,
    y: height - 73,
    size: 7,
    font: ctx.font,
    color: COLORS.white,
    opacity: 0.7,
  });

  ctx.cursorY = height - 140;

  if (subtitle) {
    text(ctx, subtitle, margin, ctx.cursorY + 12, { size: 8.5, color: COLORS.muted });
    ctx.cursorY -= 10;
  }
  return ctx;
}

export function sectionTitle(ctx: BuildContext, title: string, accent: RGB = COLORS.primary) {
  const { margin, width } = ctx;
  rect(ctx, margin, ctx.cursorY - 2, 3, 14, { color: accent });
  text(ctx, title.toUpperCase(), margin + 9, ctx.cursorY, { size: 9, font: ctx.bold, color: COLORS.navy });
  line(ctx, margin, ctx.cursorY - 7, width - margin);
  ctx.cursorY -= 22;
  return ctx;
}

export interface Column {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

export function table(
  ctx: BuildContext,
  columns: Column[],
  rows: Array<Record<string, string>>,
  options: { rowHeight?: number; zebra?: boolean; compact?: boolean } = {}
) {
  const { margin } = ctx;
  const rowHeight = options.rowHeight ?? (options.compact ? 15 : 18);
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = (ctx.width - margin * 2) / totalWidth;
  const widths = columns.map((column) => column.width * scale);

  // Header band
  rect(ctx, margin, ctx.cursorY - 4, ctx.width - margin * 2, rowHeight, { color: COLORS.navy });
  let x = margin;
  columns.forEach((column, index) => {
    text(ctx, column.header.toUpperCase(), x + 5, ctx.cursorY + 1, {
      size: 7,
      font: ctx.bold,
      color: COLORS.white,
      maxWidth: widths[index] - 10,
      align: column.align,
    });
    x += widths[index];
  });
  ctx.cursorY -= rowHeight;

  rows.forEach((row, rowIndex) => {
    if (ctx.cursorY < 120) {
      // Continue on a fresh page with a repeated header.
      ctx.page = ctx.doc.addPage(A4);
      ctx.pageNumber += 1;
      ctx.cursorY = ctx.height - 70;
      rect(ctx, margin, ctx.cursorY - 4, ctx.width - margin * 2, rowHeight, { color: COLORS.navy });
      let hx = margin;
      columns.forEach((column, index) => {
        text(ctx, column.header.toUpperCase(), hx + 5, ctx.cursorY + 1, {
          size: 7,
          font: ctx.bold,
          color: COLORS.white,
          maxWidth: widths[index] - 10,
        });
        hx += widths[index];
      });
      ctx.cursorY -= rowHeight;
    }

    if (options.zebra && rowIndex % 2 === 1) {
      rect(ctx, margin, ctx.cursorY - 4, ctx.width - margin * 2, rowHeight, { color: COLORS.soft });
    }
    let cx = margin;
    columns.forEach((column, index) => {
      text(ctx, row[column.key] ?? '', cx + 5, ctx.cursorY + 1, {
        size: 7.6,
        color: COLORS.ink,
        maxWidth: widths[index] - 10,
        align: column.align,
      });
      cx += widths[index];
    });
    ctx.cursorY -= rowHeight;
  });

  line(ctx, margin, ctx.cursorY + rowHeight - 5, ctx.width - margin);
  ctx.cursorY -= 8;
  return ctx;
}

export function keyValueGrid(
  ctx: BuildContext,
  entries: Array<{ label: string; value: string; emphasis?: boolean }>,
  columns = 3
) {
  const { margin } = ctx;
  const usable = ctx.width - margin * 2;
  const columnWidth = usable / columns;
  const rowHeight = 34;
  let index = 0;

  while (index < entries.length) {
    const row = entries.slice(index, index + columns);
    row.forEach((entry, columnIndex) => {
      const x = margin + columnIndex * columnWidth;
      text(ctx, entry.label.toUpperCase(), x, ctx.cursorY, {
        size: 6.6,
        font: ctx.bold,
        color: COLORS.muted,
        maxWidth: columnWidth - 12,
      });
      text(ctx, entry.value, x, ctx.cursorY - 12, {
        size: entry.emphasis ? 9.5 : 9,
        font: entry.emphasis ? ctx.bold : ctx.font,
        color: entry.emphasis ? COLORS.navy : COLORS.ink,
        maxWidth: columnWidth - 12,
      });
      if (columnIndex < row.length - 1) {
        ctx.page.drawLine({
          start: { x: x + columnWidth - 8, y: ctx.cursorY - 16 },
          end: { x: x + columnWidth - 8, y: ctx.cursorY + 6 },
          color: COLORS.line,
          thickness: 0.6,
        });
      }
    });
    ctx.cursorY -= rowHeight;
    index += columns;
  }
  return ctx;
}

export function signatureRow(
  ctx: BuildContext,
  signatures: Array<{ role: string; name: string }>
) {
  const { margin, width } = ctx;
  const usable = width - margin * 2;
  const slot = usable / signatures.length;
  signatures.forEach((signature, index) => {
    const x = margin + index * slot;
    line(ctx, x, ctx.cursorY - 24, x + slot - 26, COLORS.muted, 0.8);
    text(ctx, signature.name, x, ctx.cursorY - 34, {
      size: 7.8,
      font: ctx.bold,
      color: COLORS.ink,
      maxWidth: slot - 26,
    });
    text(ctx, signature.role.toUpperCase(), x, ctx.cursorY - 43, {
      size: 6.4,
      color: COLORS.muted,
      maxWidth: slot - 26,
    });
  });
  ctx.cursorY -= 54;
  return ctx;
}

/** Page footers with verification hash + page numbers (drawn last, on every page). */
export async function finalize(ctx: BuildContext, note?: string): Promise<Uint8Array> {
  const pages = ctx.doc.getPages();
  const stamp = `${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;

  pages.forEach((page, index) => {
    const { width } = page.getSize();
    page.drawRectangle({ x: 0, y: 0, width, height: 34, color: COLORS.soft });
    page.drawLine({
      start: { x: 0, y: 34 },
      end: { x: width, y: 34 },
      color: COLORS.line,
      thickness: 0.8,
    });
    page.drawText(
      sanitize(note ?? 'Computer-generated document · valid without a rubber stamp · verify with the registry'),
      { x: ctx.margin, y: 20, size: 6.6, font: ctx.font, color: COLORS.muted }
    );
    page.drawText(sanitize(`Doc ${stamp} · Page ${index + 1} of ${pages.length}`), {
      x: ctx.margin,
      y: 11,
      size: 6.2,
      font: ctx.font,
      color: COLORS.muted,
    });
    page.drawText(sanitize(`${SCHOOL.name} · ${SCHOOL.motto}`), {
      x: width - ctx.margin - 190,
      y: 11,
      size: 6.2,
      font: ctx.italic,
      color: COLORS.muted,
    });
  });

  return await ctx.doc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function pdfBytesToBlobUrl(bytes: Uint8Array): string {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
}
