/**
 * @fileOverview The school's identity, in one object.
 *
 * Settings already writes `config/identity` (name, address, contacts, logo) and
 * the Theme Studio writes `config/branding` (palette, type pairing). This module
 * folds both into a single resolved brand that the chrome, the crest and the PDF
 * kit all read, so renaming a school or recolouring it changes the letterhead in
 * the same save — not in a second place someone has to remember.
 *
 * Print always uses the palette's LIGHT tokens: paper is white, and a colour
 * tuned for a midnight screen disappears on a laser printer.
 */

import { resolvePalette, type AppFontId, type PaletteId, DEFAULT_APP_FONT, DEFAULT_PALETTE } from '@/lib/theme/palettes';

export interface SchoolBrand {
  name: string;
  shortName: string;
  motto: string;
  address: string;
  contacts: string;
  registration: string;
  /** PNG/JPEG URL or data URL. Empty means "draw the vector crest". */
  logo: string;
  paletteId: PaletteId;
  fontId: AppFontId;
  /** HSL triples, taken from the palette's light mode for print. */
  primaryHsl: string;
  accentHsl: string;
  inkHsl: string;
}

export const DEFAULT_BRAND: SchoolBrand = {
  name: 'SHULE ALTRA SECONDARY SCHOOL',
  shortName: 'Shule Altra',
  motto: 'Elimu Bora, Maisha Bora',
  address: 'Plot 14, Bagamoyo Road · Dar es Salaam, Tanzania',
  contacts: 'info@shulealtra.ac.tz · +255 22 555 0142',
  registration: 'Reg. No. S/DSM/2016/0412 · NECTA Centre 0412',
  logo: '',
  paletteId: DEFAULT_PALETTE,
  fontId: DEFAULT_APP_FONT,
  primaryHsl: resolvePalette(DEFAULT_PALETTE).light.primary,
  accentHsl: resolvePalette(DEFAULT_PALETTE).light.accent,
  inkHsl: resolvePalette(DEFAULT_PALETTE).light.foreground,
};

/** "217 83% 42%" -> [0..1, 0..1, 0..1] */
export function hslToRgb(triple: string): [number, number, number] {
  const parts = triple.trim().split(/[\s,]+/);
  const h = parseFloat(parts[0] ?? '0') / 360;
  const s = parseFloat((parts[1] ?? '0').replace('%', '')) / 100;
  const l = parseFloat((parts[2] ?? '0').replace('%', '')) / 100;

  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return [0, 0, 0];
  if (s === 0) return [l, l, l];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)];
}

/**
 * A readable short name for the sidebar, derived from the printed name.
 *
 * `identity.systemName` is deliberately NOT used here: that field holds the
 * product name ("Shule Altra"), so using it labelled every school's sidebar and
 * crest with our brand instead of theirs.
 */
export function deriveShortName(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return DEFAULT_BRAND.shortName;
  const stripped = trimmed
    .replace(/\b(SECONDARY|HIGH|PRIMARY|MIDDLE)\s+SCHOOL\b/gi, '')
    .replace(/\bSCHOOL\b/gi, '')
    .replace(/[\s·,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const base = stripped || trimmed;
  // Names are stored shouted for the letterhead; the sidebar should not shout.
  // Capitalise after a space or hyphen only — an apostrophe is inside a word,
  // so "MARY'S" must become "Mary's", not "Mary'S".
  return base === base.toUpperCase()
    ? base.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep, char) => sep + char.toUpperCase())
    : base;
}

/** Initials for the crest monogram when no logo has been uploaded. */
export function monogram(name: string, shortName?: string): string {
  const source = (shortName || name || '').trim();
  const words = source.split(/[\s·-]+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length === 0) return 'SA';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

type IdentityDoc = Record<string, any> | null | undefined;
type BrandingDoc = Record<string, any> | null | undefined;

export function resolveBrand(identity: IdentityDoc, branding: BrandingDoc): SchoolBrand {
  const paletteId = (branding?.paletteId as PaletteId) ?? DEFAULT_PALETTE;
  const palette = resolvePalette(paletteId);

  // A school that has been named is a real school. From that point on we print
  // only what it actually told us — never Shule Altra's sample address, phone or
  // registration number. Inventing a NECTA centre number on a school's letterhead
  // is worse than leaving the line blank.
  const configured = typeof identity?.name === 'string' && identity.name.trim().length > 0;
  const name = configured ? (identity!.name as string) : DEFAULT_BRAND.name;
  const shortName = (identity?.shortName as string) || deriveShortName(name);

  const contacts = [identity?.contactEmail, identity?.contactPhone].filter(Boolean).join(' · ');
  // Schools often type the district into the street address already. Drop any
  // part the line already contains so the letterhead never reads
  // "Ali Hassan Mwinyi Road · Kinondoni · Kinondoni · Dar es Salaam".
  const addressParts: string[] = [];
  for (const part of [identity?.address, identity?.district, identity?.region]) {
    const value = typeof part === 'string' ? part.trim() : '';
    if (!value) continue;
    if (addressParts.some((existing) => existing.toLowerCase().includes(value.toLowerCase()))) continue;
    addressParts.push(value);
  }
  const registration = [
    identity?.registrationNumber ? `Reg. No. ${identity.registrationNumber}` : '',
    identity?.centerId ? `NECTA Centre ${identity.centerId}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const sample = configured ? '' : null;
  return {
    name,
    shortName,
    motto: (identity?.motto as string) || (configured ? '' : DEFAULT_BRAND.motto),
    address: addressParts.length ? addressParts.join(' · ') : (sample ?? DEFAULT_BRAND.address),
    contacts: contacts || (sample ?? DEFAULT_BRAND.contacts),
    registration: registration || (sample ?? DEFAULT_BRAND.registration),
    logo: (identity?.logo as string) || '',
    paletteId: palette.id as PaletteId,
    fontId: (branding?.fontId as AppFontId) ?? DEFAULT_APP_FONT,
    primaryHsl: palette.light.primary,
    accentHsl: palette.light.accent,
    inkHsl: palette.light.foreground,
  };
}

/**
 * Process-wide active brand for the PDF builders.
 *
 * The document builders are plain functions called from many places (buttons,
 * bulk exports, seed scripts). Rather than thread a brand argument through all
 * sixteen, the provider sets it once per resolved change and the kit reads it at
 * draw time. Single-tenant app: one school, one brand at a time.
 */
let activeBrand: SchoolBrand = DEFAULT_BRAND;
const listeners = new Set<(brand: SchoolBrand) => void>();

export function setActiveBrand(brand: SchoolBrand): void {
  activeBrand = brand;
  listeners.forEach((listener) => listener(brand));
}

export function getActiveBrand(): SchoolBrand {
  return activeBrand;
}

export function subscribeBrand(listener: (brand: SchoolBrand) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
