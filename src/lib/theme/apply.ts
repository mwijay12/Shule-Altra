/**
 * @fileOverview Apply a palette to the document.
 *
 * Tokens are written as CSS variables on <html>, so Tailwind utilities, the
 * WebGL orb, the brand mark and the PDF preview all read the same source of
 * truth. A tiny inline script (see ThemeScript) runs the same mapping before
 * first paint to avoid a flash of the wrong palette.
 */

import {
  APP_FONTS,
  PALETTES,
  DEFAULT_APP_FONT,
  DEFAULT_MODE,
  DEFAULT_PALETTE,
  isAppFontId,
  isPaletteId,
  resolvePalette,
  type AppFontId,
  type Palette,
  type PaletteId,
  type ThemeMode,
  type ThemeTokens,
} from './palettes';

export const THEME_STORAGE_KEY = 'altra.theme.v1';

export type ThemePreference = {
  paletteId: PaletteId;
  mode: ThemeMode;
  fontId: AppFontId;
};

export const DEFAULT_PREFERENCE: ThemePreference = {
  paletteId: DEFAULT_PALETTE,
  mode: DEFAULT_MODE,
  fontId: DEFAULT_APP_FONT,
};

const VAR_MAP: Record<keyof Omit<ThemeTokens, 'chart'>, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  sidebarBackground: '--sidebar-background',
  sidebarForeground: '--sidebar-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
};

export function sanitizePreference(raw: unknown): ThemePreference {
  const value = (raw ?? {}) as Partial<ThemePreference>;
  return {
    paletteId: isPaletteId(value.paletteId) ? value.paletteId : DEFAULT_PALETTE,
    mode: value.mode === 'dark' ? 'dark' : 'light',
    fontId: isAppFontId(value.fontId) ? value.fontId : DEFAULT_APP_FONT,
  };
}

export function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCE;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) return sanitizePreference(JSON.parse(raw));
    // Migrate the old light/dark-only key, but never inherit a system dark mode:
    // the dashboard opens in light unless the school chose otherwise.
    const legacy = window.localStorage.getItem('altra-admin-theme');
    return sanitizePreference({ mode: legacy === 'dark' ? 'dark' : 'light' });
  } catch {
    return DEFAULT_PREFERENCE;
  }
}

export function storePreference(preference: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    /* private mode — the session still renders correctly */
  }
}

/** Write every token for the active palette + mode onto <html>. */
export function applyPreference(preference: ThemePreference): Palette {
  const palette = resolvePalette(preference.paletteId);
  const font = APP_FONTS[preference.fontId] ?? APP_FONTS[DEFAULT_APP_FONT];
  const tokens = preference.mode === 'dark' ? palette.dark : palette.light;

  if (typeof document === 'undefined') return palette;
  const root = document.documentElement;

  for (const [key, cssVar] of Object.entries(VAR_MAP)) {
    root.style.setProperty(cssVar, tokens[key as keyof typeof VAR_MAP]);
  }
  tokens.chart.forEach((value, index) => root.style.setProperty(`--chart-${index + 1}`, value));

  root.style.setProperty('--sidebar-primary', tokens.primary);
  root.style.setProperty('--sidebar-primary-foreground', tokens.primaryForeground);
  root.style.setProperty('--sidebar-ring', tokens.ring);
  root.style.setProperty('--font-body', font.body);
  root.style.setProperty('--font-display', font.display);
  // Consumed by the orb and the brand mark without another React render.
  root.style.setProperty('--brand-hue', String(palette.orbHue));
  root.style.setProperty('--brand-primary', tokens.primary);
  root.style.setProperty('--brand-accent', tokens.accent);

  root.classList.toggle('dark', preference.mode === 'dark');
  root.dataset.theme = palette.id;
  root.dataset.mode = preference.mode;
  root.style.colorScheme = preference.mode;

  return palette;
}

/**
 * Pre-paint script. Runs before React hydrates so the chosen palette and mode
 * are on <html> for the very first frame — no flash of the default theme.
 */
export function themeBootstrapScript(): string {
  const payload = JSON.stringify({
    key: THEME_STORAGE_KEY,
    fallback: DEFAULT_PREFERENCE,
    varMap: VAR_MAP,
    palettes: Object.fromEntries(
      Object.values(PALETTES).map((palette) => [
        palette.id,
        { light: palette.light, dark: palette.dark, orbHue: palette.orbHue },
      ])
    ),
    fonts: Object.fromEntries(Object.entries(APP_FONTS).map(([id, font]) => [id, { body: font.body, display: font.display }])),
  });

  return `(function(){try{
var c=${payload};
var s=null;try{s=JSON.parse(localStorage.getItem(c.key)||'null')}catch(e){}
if(!s){var l=null;try{l=localStorage.getItem('altra-admin-theme')}catch(e){}s={mode:l==='dark'?'dark':'light'}}
var pid=c.palettes[s.paletteId]?s.paletteId:c.fallback.paletteId;
var mode=s.mode==='dark'?'dark':'light';
var fid=c.fonts[s.fontId]?s.fontId:c.fallback.fontId;
var p=c.palettes[pid],t=p[mode],r=document.documentElement;
for(var k in c.varMap){if(t[k])r.style.setProperty(c.varMap[k],t[k])}
if(t.chart)for(var i=0;i<t.chart.length;i++){r.style.setProperty('--chart-'+(i+1),t.chart[i])}
r.style.setProperty('--sidebar-primary',t.primary);
r.style.setProperty('--sidebar-primary-foreground',t.primaryForeground);
r.style.setProperty('--sidebar-ring',t.ring);
r.style.setProperty('--font-body',c.fonts[fid].body);
r.style.setProperty('--font-display',c.fonts[fid].display);
r.style.setProperty('--brand-hue',String(p.orbHue));
r.style.setProperty('--brand-primary',t.primary);
r.style.setProperty('--brand-accent',t.accent);
if(mode==='dark'){r.classList.add('dark')}else{r.classList.remove('dark')}
r.setAttribute('data-theme',pid);r.setAttribute('data-mode',mode);r.style.colorScheme=mode;
}catch(e){}})();`;
}
