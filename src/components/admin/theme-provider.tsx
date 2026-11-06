'use client';

/**
 * @fileOverview Light / midnight theme control for the admin shell.
 * Persists to localStorage and toggles the `dark` class used by Tailwind.
 */

import * as React from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'altra-admin-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('light');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      stored = null;
    }
    const preferred: Theme =
      stored === 'dark' || stored === 'light'
        ? stored
        : window.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    setThemeState(preferred);
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage can be unavailable in private mode */
    }
  }, [theme, mounted]);

  const setTheme = React.useCallback((next: Theme) => setThemeState(next), []);
  const toggleTheme = React.useCallback(
    () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
    []
  );

  const value = React.useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Safe fallback so components can render outside the provider (tests, print previews).
    return { theme: 'light' as Theme, setTheme: () => {}, toggleTheme: () => {} };
  }
  return ctx;
}
