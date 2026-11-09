'use client';

/**
 * @fileOverview Brand theme control.
 *
 * Two layers, deliberately separate:
 *   • Palette + type pairing belong to the SCHOOL. They load from
 *     `schools/<id>/config/branding` and are published from the Theme Studio.
 *   • Light / dark belongs to the PERSON reading the screen, and defaults to
 *     light — the dashboard is a daytime office tool, not a media player.
 *
 * A pre-paint script (ThemeScript) puts the cached values on <html> before React
 * hydrates, so there is no flash and no dependency on the network to look right.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import {
  DEFAULT_PREFERENCE,
  applyPreference,
  readStoredPreference,
  sanitizePreference,
  storePreference,
  type ThemePreference,
} from '@/lib/theme/apply';
import {
  APP_FONTS,
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
} from '@/lib/theme/palettes';

export const BRANDING_DOC_PATH = 'schools/school-001/config/branding';

type Theme = ThemeMode;

interface ThemeContextValue {
  /** Back-compatible surface for the topbar toggle. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  paletteId: PaletteId;
  palette: Palette;
  fontId: AppFontId;
  /** School-published values, before any local preview. */
  published: { paletteId: PaletteId; fontId: AppFontId };
  /** True when the local preview differs from what the school published. */
  isPreviewing: boolean;
  setPaletteId: (id: PaletteId) => void;
  setFontId: (id: AppFontId) => void;
  /** Adopt the school's published palette/font, discarding a local preview. */
  resetToPublished: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const db = useFirestore();
  const brandingRef = useMemoFirebase(() => doc(db, BRANDING_DOC_PATH), [db]);
  const { data: branding } = useDoc(brandingRef);

  const [preference, setPreference] = React.useState<ThemePreference>(DEFAULT_PREFERENCE);
  const [hydrated, setHydrated] = React.useState(false);
  // A local preview is explicit: it only exists once the user touches a control.
  const [localChoice, setLocalChoice] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredPreference();
    setPreference(stored);
    setHydrated(true);
  }, []);

  const published = React.useMemo(
    () => ({
      paletteId: isPaletteId(branding?.paletteId) ? (branding!.paletteId as PaletteId) : DEFAULT_PALETTE,
      fontId: isAppFontId(branding?.fontId) ? (branding!.fontId as AppFontId) : DEFAULT_APP_FONT,
    }),
    [branding?.paletteId, branding?.fontId]
  );

  // School branding wins until this browser makes its own explicit choice.
  const effective = React.useMemo<ThemePreference>(() => {
    if (localChoice) return preference;
    return { ...preference, paletteId: published.paletteId, fontId: published.fontId };
  }, [localChoice, preference, published]);

  React.useEffect(() => {
    if (!hydrated) return;
    applyPreference(effective);
    storePreference(effective);
  }, [effective, hydrated]);

  const setTheme = React.useCallback((next: Theme) => {
    setPreference((current) => ({ ...current, mode: next === 'dark' ? 'dark' : 'light' }));
  }, []);

  const toggleTheme = React.useCallback(() => {
    setPreference((current) => ({ ...current, mode: current.mode === 'dark' ? 'light' : 'dark' }));
  }, []);

  const setPaletteId = React.useCallback((id: PaletteId) => {
    if (!isPaletteId(id)) return;
    setLocalChoice(true);
    setPreference((current) => ({ ...current, paletteId: id }));
  }, []);

  const setFontId = React.useCallback((id: AppFontId) => {
    if (!isAppFontId(id)) return;
    setLocalChoice(true);
    setPreference((current) => ({ ...current, fontId: id }));
  }, []);

  const resetToPublished = React.useCallback(() => {
    setLocalChoice(false);
    setPreference((current) => ({ ...current, ...published }));
  }, [published]);

  // Publishing updates the doc; drop the preview flag so the school value sticks.
  const previousPublished = React.useRef(published);
  React.useEffect(() => {
    if (
      previousPublished.current.paletteId !== published.paletteId ||
      previousPublished.current.fontId !== published.fontId
    ) {
      previousPublished.current = published;
      setLocalChoice(false);
    }
  }, [published]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme: effective.mode,
      setTheme,
      toggleTheme,
      paletteId: effective.paletteId,
      palette: resolvePalette(effective.paletteId),
      fontId: effective.fontId,
      published,
      isPreviewing:
        effective.paletteId !== published.paletteId || effective.fontId !== published.fontId,
      setPaletteId,
      setFontId,
      resetToPublished,
    }),
    [effective, published, setTheme, toggleTheme, setPaletteId, setFontId, resetToPublished]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback for tests, print previews and the public landing page.
    return {
      theme: DEFAULT_MODE as Theme,
      setTheme: () => {},
      toggleTheme: () => {},
      paletteId: DEFAULT_PALETTE,
      palette: resolvePalette(DEFAULT_PALETTE),
      fontId: DEFAULT_APP_FONT,
      published: { paletteId: DEFAULT_PALETTE, fontId: DEFAULT_APP_FONT },
      isPreviewing: false,
      setPaletteId: () => {},
      setFontId: () => {},
      resetToPublished: () => {},
    } satisfies ThemeContextValue;
  }
  return ctx;
}

export { APP_FONTS };
