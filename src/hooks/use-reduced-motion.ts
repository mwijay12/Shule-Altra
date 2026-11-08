'use client';

import * as React from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function matches() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(QUERY).matches
    : false;
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(QUERY);
  // Safari < 14 uses the legacy listener API.
  if (media.addEventListener) {
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }
  media.addListener(onChange);
  return () => media.removeListener(onChange);
}

/** Live OS preference, including changes made while the dashboard is open. */
export function useReducedMotion() {
  return React.useSyncExternalStore(subscribe, matches, () => false);
}
