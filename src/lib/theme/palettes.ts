/**
 * @fileOverview Brand palette registry.
 *
 * Palettes, each carrying BOTH light and dark surface tokens, so a school
 * can change its identity without anyone editing CSS. Adapted from the
 * VoltaRentals theme studio pattern: one registry, applied as CSS variables.
 *
 * Light-mode primaries are deliberately darker than their dark-mode counterparts
 * so white button text keeps a usable contrast ratio on paper.
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  chart: [string, string, string, string, string];
};

export type Palette = {
  id: string;
  name: string;
  description: string;
  /** Three dots shown on the studio card, and the sphere tint. */
  swatch: [string, string, string];
  sphere: string;
  /** Base hue for the WebGL orb and any hue-derived accents. */
  orbHue: number;
  light: ThemeTokens;
  dark: ThemeTokens;
};

const neutralChart = (a: string, b: string, c: string, d: string, e: string): [string, string, string, string, string] => [a, b, c, d, e];

export const PALETTES: Record<string, Palette> = {
  blue_ridge: {
    id: 'blue_ridge',
    name: 'Blue & Cyan',
    description: 'Cool blue with a cyan accent. The calm, default institutional voice.',
    swatch: ['#1D4ED8', '#22D3EE', '#0B1220'],
    sphere: '#2563EB',
    orbHue: 217,
    light: {
      background: '220 33% 97%',
      foreground: '222 47% 11%',
      card: '0 0% 100%',
      cardForeground: '222 47% 11%',
      popover: '0 0% 100%',
      popoverForeground: '222 47% 11%',
      primary: '217 83% 42%',
      primaryForeground: '0 0% 100%',
      secondary: '214 40% 94%',
      secondaryForeground: '217 83% 34%',
      muted: '218 30% 94%',
      mutedForeground: '218 14% 40%',
      accent: '199 89% 34%',
      accentForeground: '0 0% 100%',
      border: '218 26% 87%',
      input: '218 26% 87%',
      ring: '217 83% 42%',
      sidebarBackground: '0 0% 100%',
      sidebarForeground: '222 47% 11%',
      sidebarAccent: '214 40% 95%',
      sidebarAccentForeground: '217 83% 34%',
      sidebarBorder: '218 26% 89%',
      chart: neutralChart('217 83% 45%', '199 89% 42%', '262 70% 55%', '173 70% 36%', '38 92% 45%'),
    },
    dark: {
      background: '224 47% 7%',
      foreground: '210 40% 96%',
      card: '222 40% 11%',
      cardForeground: '210 40% 96%',
      popover: '222 44% 9%',
      popoverForeground: '210 40% 96%',
      primary: '217 91% 62%',
      primaryForeground: '224 47% 8%',
      secondary: '222 32% 17%',
      secondaryForeground: '210 40% 96%',
      muted: '222 28% 17%',
      mutedForeground: '215 20% 68%',
      accent: '199 89% 60%',
      accentForeground: '224 47% 8%',
      border: '222 26% 22%',
      input: '222 26% 22%',
      ring: '217 91% 62%',
      sidebarBackground: '222 44% 9%',
      sidebarForeground: '210 40% 96%',
      sidebarAccent: '222 32% 17%',
      sidebarAccentForeground: '217 91% 66%',
      sidebarBorder: '222 26% 20%',
      chart: neutralChart('217 91% 62%', '199 89% 58%', '262 80% 70%', '173 70% 48%', '38 92% 58%'),
    },
  },

  emerald: {
    id: 'emerald',
    name: 'Green & Gold',
    description: 'Deep green with a gold accent. Reads well on printed reports.',
    swatch: ['#15803D', '#EAB308', '#0A1410'],
    sphere: '#16A34A',
    orbHue: 142,
    light: {
      background: '150 24% 97%',
      foreground: '150 30% 10%',
      card: '0 0% 100%',
      cardForeground: '150 30% 10%',
      popover: '0 0% 100%',
      popoverForeground: '150 30% 10%',
      primary: '142 72% 29%',
      primaryForeground: '0 0% 100%',
      secondary: '150 28% 93%',
      secondaryForeground: '142 72% 24%',
      muted: '150 20% 93%',
      mutedForeground: '150 10% 38%',
      accent: '38 92% 47%',
      accentForeground: '150 30% 10%',
      border: '150 16% 86%',
      input: '150 16% 86%',
      ring: '142 72% 29%',
      sidebarBackground: '0 0% 100%',
      sidebarForeground: '150 30% 10%',
      sidebarAccent: '150 28% 94%',
      sidebarAccentForeground: '142 72% 24%',
      sidebarBorder: '150 16% 88%',
      chart: neutralChart('142 72% 32%', '38 92% 44%', '173 70% 34%', '217 70% 45%', '0 65% 45%'),
    },
    dark: {
      background: '150 30% 6%',
      foreground: '150 12% 96%',
      card: '150 25% 10%',
      cardForeground: '150 12% 96%',
      popover: '150 25% 8%',
      popoverForeground: '150 12% 96%',
      primary: '142 71% 48%',
      primaryForeground: '150 30% 7%',
      secondary: '150 20% 16%',
      secondaryForeground: '150 12% 96%',
      muted: '150 20% 16%',
      mutedForeground: '150 10% 66%',
      accent: '45 93% 58%',
      accentForeground: '150 30% 7%',
      border: '150 20% 21%',
      input: '150 20% 21%',
      ring: '142 71% 48%',
      sidebarBackground: '150 25% 8%',
      sidebarForeground: '150 12% 96%',
      sidebarAccent: '150 20% 16%',
      sidebarAccentForeground: '142 71% 55%',
      sidebarBorder: '150 20% 19%',
      chart: neutralChart('142 71% 48%', '45 93% 58%', '173 70% 48%', '217 80% 65%', '0 70% 60%'),
    },
  },

  carbon_gold: {
    id: 'carbon_gold',
    name: 'Gold & Charcoal',
    description: 'Graphite and gold. Formal, high-contrast, board-meeting ready.',
    swatch: ['#CA8A04', '#E5E7EB', '#0A0A0A'],
    sphere: '#3F3F46',
    orbHue: 45,
    light: {
      background: '45 20% 97%',
      foreground: '0 0% 9%',
      card: '0 0% 100%',
      cardForeground: '0 0% 9%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 9%',
      primary: '40 82% 33%',
      primaryForeground: '0 0% 100%',
      secondary: '45 18% 93%',
      secondaryForeground: '40 82% 28%',
      muted: '45 15% 93%',
      mutedForeground: '45 8% 38%',
      accent: '220 9% 30%',
      accentForeground: '0 0% 100%',
      border: '45 12% 85%',
      input: '45 12% 85%',
      ring: '40 82% 33%',
      sidebarBackground: '0 0% 100%',
      sidebarForeground: '0 0% 9%',
      sidebarAccent: '45 18% 94%',
      sidebarAccentForeground: '40 82% 28%',
      sidebarBorder: '45 12% 87%',
      chart: neutralChart('40 82% 38%', '220 9% 34%', '173 60% 32%', '217 60% 42%', '0 60% 42%'),
    },
    dark: {
      background: '0 0% 6%',
      foreground: '0 0% 97%',
      card: '0 0% 10%',
      cardForeground: '0 0% 97%',
      popover: '0 0% 8%',
      popoverForeground: '0 0% 97%',
      primary: '45 93% 55%',
      primaryForeground: '0 0% 7%',
      secondary: '0 0% 16%',
      secondaryForeground: '0 0% 97%',
      muted: '0 0% 16%',
      mutedForeground: '0 0% 66%',
      accent: '0 0% 88%',
      accentForeground: '0 0% 7%',
      border: '0 0% 22%',
      input: '0 0% 22%',
      ring: '45 93% 55%',
      sidebarBackground: '0 0% 8%',
      sidebarForeground: '0 0% 97%',
      sidebarAccent: '0 0% 16%',
      sidebarAccentForeground: '45 93% 60%',
      sidebarBorder: '0 0% 20%',
      chart: neutralChart('45 93% 55%', '0 0% 82%', '173 60% 48%', '217 80% 65%', '0 70% 60%'),
    },
  },

  crimson: {
    id: 'crimson',
    name: 'Maroon & Amber',
    description: 'Maroon with amber. Strong house colours for a school with a crest.',
    swatch: ['#B91C1C', '#F59E0B', '#0B0A0A'],
    sphere: '#DC2626',
    orbHue: 0,
    light: {
      background: '20 24% 97%',
      foreground: '0 0% 10%',
      card: '0 0% 100%',
      cardForeground: '0 0% 10%',
      popover: '0 0% 100%',
      popoverForeground: '0 0% 10%',
      primary: '0 72% 38%',
      primaryForeground: '0 0% 100%',
      secondary: '20 26% 94%',
      secondaryForeground: '0 72% 32%',
      muted: '20 18% 93%',
      mutedForeground: '20 10% 38%',
      accent: '32 90% 48%',
      accentForeground: '0 0% 10%',
      border: '20 16% 87%',
      input: '20 16% 87%',
      ring: '0 72% 38%',
      sidebarBackground: '0 0% 100%',
      sidebarForeground: '0 0% 10%',
      sidebarAccent: '20 26% 95%',
      sidebarAccentForeground: '0 72% 32%',
      sidebarBorder: '20 16% 89%',
      chart: neutralChart('0 72% 42%', '32 90% 44%', '217 70% 45%', '173 65% 33%', '262 60% 50%'),
    },
    dark: {
      background: '0 30% 6%',
      foreground: '20 14% 96%',
      card: '0 24% 10%',
      cardForeground: '20 14% 96%',
      popover: '0 24% 8%',
      popoverForeground: '20 14% 96%',
      primary: '0 84% 62%',
      primaryForeground: '0 30% 7%',
      secondary: '0 18% 16%',
      secondaryForeground: '20 14% 96%',
      muted: '0 18% 16%',
      mutedForeground: '20 10% 66%',
      accent: '38 92% 58%',
      accentForeground: '0 30% 7%',
      border: '0 18% 22%',
      input: '0 18% 22%',
      ring: '0 84% 62%',
      sidebarBackground: '0 24% 8%',
      sidebarForeground: '20 14% 96%',
      sidebarAccent: '0 18% 16%',
      sidebarAccentForeground: '0 84% 66%',
      sidebarBorder: '0 18% 20%',
      chart: neutralChart('0 84% 62%', '38 92% 58%', '217 85% 66%', '173 65% 48%', '262 75% 70%'),
    },
  },
};

// Build on the same complete surface system while giving purple its own identity.
PALETTES.plum = {
  id: 'plum',
  name: 'Purple & Rose',
  description: 'Purple buttons and highlights with a warm rose accent.',
  swatch: ['#6b21a8', '#be185d', '#faf5ff'],
  sphere: '#7e22ce',
  orbHue: 280,
  light: {
    ...PALETTES.crimson.light,
    background: '280 30% 97%', foreground: '280 25% 12%', cardForeground: '280 25% 12%',
    popoverForeground: '280 25% 12%', primary: '280 65% 35%', primaryForeground: '0 0% 100%',
    secondary: '280 25% 94%', secondaryForeground: '280 65% 30%', muted: '280 18% 94%',
    mutedForeground: '280 10% 38%', accent: '330 70% 37%', accentForeground: '0 0% 100%',
    border: '280 16% 87%', input: '280 16% 87%', ring: '280 65% 35%',
    sidebarForeground: '280 25% 12%', sidebarAccent: '280 25% 95%',
    sidebarAccentForeground: '280 65% 30%', sidebarBorder: '280 16% 89%',
    chart: neutralChart('280 65% 40%', '330 70% 40%', '38 85% 40%', '160 65% 34%', '210 70% 45%'),
  },
  dark: {
    ...PALETTES.crimson.dark,
    background: '280 30% 6%', foreground: '280 14% 96%', card: '280 24% 10%',
    cardForeground: '280 14% 96%', popover: '280 24% 8%', popoverForeground: '280 14% 96%',
    primary: '280 75% 70%', primaryForeground: '280 30% 7%', secondary: '280 18% 16%',
    secondaryForeground: '280 14% 96%', muted: '280 18% 16%', mutedForeground: '280 10% 70%',
    accent: '330 75% 70%', accentForeground: '280 30% 7%', border: '280 18% 22%',
    input: '280 18% 22%', ring: '280 75% 70%', sidebarBackground: '280 24% 8%',
    sidebarForeground: '280 14% 96%', sidebarAccent: '280 18% 16%',
    sidebarAccentForeground: '280 75% 75%', sidebarBorder: '280 18% 20%',
    chart: neutralChart('280 75% 70%', '330 75% 70%', '38 85% 60%', '160 65% 55%', '210 80% 70%'),
  },
};

PALETTES.terracotta = {
  id: 'terracotta',
  name: 'Terracotta & Forest',
  description: 'Warm burnt orange buttons with deep forest green accents.',
  swatch: ['#963b18', '#17604d', '#faf6f1'],
  sphere: '#b94c22',
  orbHue: 18,
  light: {
    ...PALETTES.crimson.light,
    background: '32 30% 97%', foreground: '20 25% 11%', cardForeground: '20 25% 11%',
    popoverForeground: '20 25% 11%', primary: '18 72% 33%', primaryForeground: '0 0% 100%',
    secondary: '30 30% 93%', secondaryForeground: '18 72% 28%', muted: '30 20% 93%',
    mutedForeground: '20 10% 38%', accent: '160 62% 28%', accentForeground: '0 0% 100%',
    border: '30 16% 86%', input: '30 16% 86%', ring: '18 72% 33%',
    sidebarForeground: '20 25% 11%', sidebarAccent: '30 30% 94%',
    sidebarAccentForeground: '18 72% 28%', sidebarBorder: '30 16% 88%',
    chart: neutralChart('18 72% 38%', '160 62% 32%', '38 85% 40%', '280 55% 45%', '210 65% 45%'),
  },
  dark: {
    ...PALETTES.crimson.dark,
    background: '20 26% 6%', foreground: '30 18% 96%', card: '20 22% 10%',
    cardForeground: '30 18% 96%', popover: '20 22% 8%', popoverForeground: '30 18% 96%',
    primary: '18 85% 68%', primaryForeground: '20 30% 7%', secondary: '20 18% 16%',
    secondaryForeground: '30 18% 96%', muted: '20 18% 16%', mutedForeground: '30 10% 70%',
    accent: '160 55% 58%', accentForeground: '20 30% 7%', border: '20 18% 22%',
    input: '20 18% 22%', ring: '18 85% 68%', sidebarBackground: '20 22% 8%',
    sidebarForeground: '30 18% 96%', sidebarAccent: '20 18% 16%',
    sidebarAccentForeground: '18 85% 72%', sidebarBorder: '20 18% 20%',
    chart: neutralChart('18 85% 68%', '160 55% 58%', '38 85% 60%', '280 65% 70%', '210 80% 70%'),
  },
};

export type PaletteId = keyof typeof PALETTES;

/** Light first: the dashboard is a daytime office tool. */
export const DEFAULT_PALETTE: PaletteId = 'blue_ridge';
export const DEFAULT_MODE: ThemeMode = 'light';

export const PALETTE_LIST = Object.values(PALETTES);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PALETTES, value);
}

export function resolvePalette(id: unknown): Palette {
  return isPaletteId(id) ? PALETTES[id] : PALETTES[DEFAULT_PALETTE];
}

/** Type pairing for the app chrome. Landing keeps its own three pairings. */
export type AppFontId = 'grotesk' | 'inter' | 'editorial';

export const APP_FONTS: Record<AppFontId, { id: AppFontId; name: string; description: string; body: string; display: string }> = {
  grotesk: {
    id: 'grotesk',
    name: 'Space Grotesk + Inter',
    description: 'Geometric headings, neutral body. The default product voice.',
    body: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
    display: '"Space Grotesk Variable", "Space Grotesk", "Inter Variable", sans-serif',
  },
  inter: {
    id: 'inter',
    name: 'Inter throughout',
    description: 'One family everywhere. Quietest option, best for dense tables.',
    body: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
    display: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
  },
  editorial: {
    id: 'editorial',
    name: 'Instrument Serif + Inter',
    description: 'Serif headings over a neutral body. Closer to a printed prospectus.',
    body: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
    display: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  },
};

export const DEFAULT_APP_FONT: AppFontId = 'grotesk';

export function isAppFontId(value: unknown): value is AppFontId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(APP_FONTS, value);
}
