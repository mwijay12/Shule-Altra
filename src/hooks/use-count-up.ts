'use client';

import * as React from 'react';
import { useReducedMotion } from './use-reduced-motion';
import { DURATION } from '@/lib/motion/tokens';

/**
 * Count from zero on arrival, then from the last displayed value on live updates.
 * A wall-clock finalizer also lands the exact value in throttled/background tabs.
 */
export function useCountUp(value: number, duration: number = DURATION.counter, enabled = true) {
  const reducedMotion = useReducedMotion();
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = React.useState(0);
  const current = React.useRef(0);

  React.useEffect(() => {
    if (!enabled && !reducedMotion) return;
    const from = current.current;
    const total = Math.max(120, duration * 1000);
    const land = () => {
      current.current = target;
      setDisplay(target);
    };

    if (reducedMotion || from === target) {
      land();
      return;
    }

    const started = Date.now();
    let frame: number | undefined;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      const progress = Math.min(1, Math.max(0, (Date.now() - started) / total));
      const eased = 1 - Math.pow(1 - progress, 2);
      current.current = from + (target - from) * eased;
      setDisplay(progress === 1 ? target : current.current);
      if (progress < 1) frame = window.setTimeout(tick, 16);
    };

    frame = window.setTimeout(tick, 16);
    const finalizer = window.setTimeout(land, total + 200);
    return () => {
      cancelled = true;
      if (frame !== undefined) window.clearTimeout(frame);
      window.clearTimeout(finalizer);
    };
  }, [target, duration, reducedMotion, enabled]);

  return reducedMotion ? target : display;
}
