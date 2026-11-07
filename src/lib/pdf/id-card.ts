/**
 * @fileOverview Learner ID cards — printed 2-up on A4 with crop marks.
 * Text, crest, rules and barcode are vector; the verification QR is embedded
 * from a generated matrix (not a screenshot).
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { A4, COLORS, SCHOOL, downloadPdf, drawCrest, money, sanitize } from '@/lib/pdf/kit';

export interface IdCardLearner {
  id: string;
  name: string;
  className?: string;
  admissionNumber?: string;
  gender?: string;
  parentPhone?: string;
  balance?: number;
  house?: string;
  dateOfBirth?: string;
  /**
   * A photograph, when the school has one: a `data:` URL (the demo and any
   * offline capture), or an https URL on the storage bucket. SVG avatars are
   * skipped — pdf-lib embeds raster only, and a printed ID card wants a photo.
   */
  photoUrl?: string;
}

const PHOTO_W = 42;
const PHOTO_H = 46;

function bytesFromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Embeds the learner's photograph, or returns null and lets the card print
 * without one. Every failure mode (SVG, dead URL, offline, corrupt bytes) has
 * to degrade to a text card — a print run cannot stop because one file is bad.
 */
async function embedPhoto(
  doc: PDFDocument,
  url: string | undefined,
  cache: Map<string, any>
): Promise<any | null> {
  if (!url) return null
  if (cache.has(url)) return cache.get(url)
  try {
    if (/^data:image\/svg/i.test(url)) return null
    if (url.startsWith('data:')) {
      const match = /^data:image\/(png|jpe?g);base64,(.*)$/i.exec(url)
      if (!match) return null
      const bytes = bytesFromBase64(match[2])
      const image = /png/i.test(match[1]) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      cache.set(url, image)
      return image
    }
    if (/^https?:\/\//i.test(url)) {
      const response = await fetch(url)
      if (!response.ok) return null
      const bytes = new Uint8Array(await response.arrayBuffer())
      const type = response.headers.get('content-type') ?? ''
      const image = /png/i.test(type) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
      cache.set(url, image)
      return image
    }
  } catch {
    return null
  }
  return null
}

const CARD_W = 242.65; // 85.6 mm
const CARD_H = 153.07; // 54 mm
const PER_PAGE = 4;

async function buildQrBytes(text: string): Promise<{ bytes: Uint8Array; size: number } | null> {
  try {
    const QRCode = await import('qrcode');
    const dataUrl = await QRCode.toDataURL(text, {
      margin: 0,
      width: 240,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f2f52', light: '#ffffff' },
    });
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, size: 240 };
  } catch {
    return null;
  }
}

export async function buildIdCards(learners: IdCardLearner[], options: { term?: string } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle('Learner identity cards');
  doc.setSubject('Learner identification documents');
  doc.setAuthor(SCHOOL.name);
  doc.setCreator('Shule Altra Command OS');
  doc.setProducer('Shule Altra · pdf-lib vector engine');

  const slots = learners.slice(0, 24);
  const photoCache = new Map<string, any>();
  const photos = new Map<number, any>();
  // Resolve before drawing: the card layout shifts when a face exists.
  for (let index = 0; index < slots.length; index += 1) {
    const image = await embedPhoto(doc, slots[index].photoUrl, photoCache);
    if (image) photos.set(index, image);
  }

  for (let index = 0; index < slots.length; index += PER_PAGE) {
    const page = doc.addPage(A4);
    const chunk = slots.slice(index, index + PER_PAGE);

    page.drawText(sanitize(`LEARNER IDENTITY CARDS · ${options.term ?? 'Term 2 2026'} · ${SCHOOL.name}`), {
      x: 44,
      y: A4[1] - 40,
      size: 8,
      font: bold,
      color: COLORS.navy,
    });
    page.drawText(sanitize('Cut along the dashed guides. Cards are printed at 100% scale on 300gsm stock.'), {
      x: 44,
      y: A4[1] - 52,
      size: 6.8,
      font,
      color: COLORS.muted,
    });

    for (let slot = 0; slot < chunk.length; slot += 1) {
      const learner = chunk[slot];
      const column = slot % 2;
      const row = Math.floor(slot / 2);
      const x = 44 + column * (CARD_W + 24);
      const y = A4[1] - 116 - CARD_H - row * (CARD_H + 46);

      // Card stock + crop marks
      page.drawRectangle({ x, y, width: CARD_W, height: CARD_H, color: rgb(1, 1, 1), borderColor: COLORS.line, borderWidth: 0.6 });
      page.drawRectangle({ x, y: y + CARD_H - 46, width: CARD_W, height: 46, color: COLORS.navy });
      page.drawRectangle({ x, y: y + CARD_H - 50, width: CARD_W * 0.6, height: 4, color: COLORS.primary });
      page.drawRectangle({ x: x + CARD_W * 0.6, y: y + CARD_H - 50, width: CARD_W * 0.4, height: 4, color: COLORS.accent });

      drawCrest(page, {
        x: x + 10,
        y: y + CARD_H - 6,
        size: 24,
        tone: 'dark',
        font: bold,
      });

      page.drawText('SHULE ALTRA', { x: x + 42, y: y + CARD_H - 17, size: 9, font: bold, color: COLORS.white });
      page.drawText(sanitize('SECONDARY SCHOOL · DAR ES SALAAM'), {
        x: x + 42,
        y: y + CARD_H - 27,
        size: 4.8,
        font,
        color: COLORS.white,
        opacity: 0.8,
      });
      page.drawText(sanitize('LEARNER IDENTITY CARD'), {
        x: x + 42,
        y: y + CARD_H - 36,
        size: 5.4,
        font: bold,
        color: COLORS.white,
        opacity: 0.85,
      });

      const photo = photos.get(index + slot);
      const textWidth = photo ? CARD_W - 112 : CARD_W - 90;

      if (photo) {
        // Fit inside the frame without stretching a face.
        const scale = Math.min(PHOTO_W / photo.width, PHOTO_H / photo.height);
        const drawW = photo.width * scale;
        const drawH = photo.height * scale;
        const frameX = x + CARD_W - PHOTO_W - 12;
        const frameY = y + CARD_H - PHOTO_H - 54;
        page.drawRectangle({
          x: frameX - 1.5,
          y: frameY - 1.5,
          width: PHOTO_W + 3,
          height: PHOTO_H + 3,
          color: rgb(1, 1, 1),
          borderColor: COLORS.line,
          borderWidth: 0.5,
        });
        page.drawImage(photo, {
          x: frameX + (PHOTO_W - drawW) / 2,
          y: frameY + (PHOTO_H - drawH) / 2,
          width: drawW,
          height: drawH,
        });
      }

      page.drawText(sanitize(learner.name.toUpperCase()), {
        x: x + 12,
        y: y + 78,
        size: 11,
        font: bold,
        color: COLORS.navy,
        maxWidth: textWidth,
      });
      page.drawText(sanitize(learner.admissionNumber ?? learner.id), {
        x: x + 12,
        y: y + 66,
        size: 7.4,
        font: bold,
        color: COLORS.primary,
        maxWidth: textWidth,
      });
      page.drawText(sanitize(`${learner.className ?? 'Unassigned'}${learner.house ? ` · ${learner.house} House` : ''}`), {
        x: x + 12,
        y: y + 55,
        size: 6.4,
        font,
        color: COLORS.muted,
        maxWidth: textWidth,
      });
      page.drawText(sanitize(`Guardian: ${learner.parentPhone ?? 'On file'}`), {
        x: x + 12,
        y: y + 45,
        size: 6,
        font,
        color: COLORS.muted,
        maxWidth: CARD_W - 90,
      });
      page.drawText(sanitize(`Status: ${Number(learner.balance ?? 0) > 0 ? 'Active · fees pending' : 'Active · cleared'}`), {
        x: x + 12,
        y: y + 35,
        size: 6,
        font,
        color: Number(learner.balance ?? 0) > 0 ? COLORS.warning : COLORS.success,
        maxWidth: CARD_W - 90,
      });
      page.drawText(sanitize(`Term 2 · 2026 · ${money(Number(learner.balance ?? 0))} balance`), {
        x: x + 12,
        y: y + 24,
        size: 5.4,
        font,
        color: COLORS.muted,
        maxWidth: CARD_W - 90,
      });

      // QR (verification payload)
      const qr = await buildQrBytes(
        `SHULE-ALTRA|${learner.admissionNumber ?? learner.id}|${learner.className ?? ''}`
      );
      if (qr) {
        const image = await doc.embedPng(qr.bytes);
        page.drawImage(image, { x: x + CARD_W - 62, y: y + 34, width: 50, height: 50 });
        page.drawText('SCAN TO VERIFY', {
          x: x + CARD_W - 62,
          y: y + 25,
          size: 4.4,
          font: bold,
          color: COLORS.muted,
        });
      } else {
        // Deterministic vector barcode fallback (no raster dependency)
        const seed = (learner.admissionNumber ?? learner.id).replace(/\D/g, '').slice(-8).padStart(8, '0');
        let bx = x + CARD_W - 62;
        for (let i = 0; i < seed.length; i += 1) {
          const width = 1 + (Number(seed[i]) % 3);
          page.drawRectangle({ x: bx, y: y + 40, width, height: 32, color: COLORS.navy });
          bx += width + 1.6;
        }
      }

      page.drawLine({
        start: { x: x + 12, y: y + 16 },
        end: { x: x + CARD_W - 12, y: y + 16 },
        color: COLORS.line,
        thickness: 0.5,
      });
      page.drawText(sanitize(`${SCHOOL.contacts} · ${SCHOOL.registration}`), {
        x: x + 12,
        y: y + 8,
        size: 4,
        font,
        color: COLORS.muted,
        maxWidth: CARD_W - 24,
      });

      // crop marks
      const mark = (mx: number, my: number, horizontal: boolean) =>
        horizontal
          ? page.drawLine({ start: { x: mx - 6, y: my }, end: { x: mx + 6, y: my }, color: COLORS.muted, thickness: 0.35 })
          : page.drawLine({ start: { x: mx, y: my - 6 }, end: { x: mx, y: my + 6 }, color: COLORS.muted, thickness: 0.35 });
      mark(x, y, true);
      mark(x, y, false);
      mark(x + CARD_W, y + CARD_H, true);
      mark(x + CARD_W, y + CARD_H, false);
    }

    const totalPages = Math.ceil(slots.length / PER_PAGE);
    page.drawText(
      sanitize(`Computer-generated identity cards · vector PDF · page ${Math.floor(index / PER_PAGE) + 1} of ${totalPages}`),
      { x: 44, y: 34, size: 6, font, color: COLORS.muted }
    );
  }

  return doc.save();
}

export async function downloadIdCards(learners: IdCardLearner[], options?: { term?: string }) {
  const bytes = await buildIdCards(learners, options);
  downloadPdf(bytes, `learner-id-cards-${learners.length}.pdf`);
  return bytes;
}
