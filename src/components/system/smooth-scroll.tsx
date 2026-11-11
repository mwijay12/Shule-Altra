'use client';

/**
 * @fileOverview Weighted scrolling via Lenis, advanced from GSAP's ticker.
 *
 * The dashboard scrolls a <main> column, the landing scrolls the window;
 * [data-app-scroll] tells the two apart.
 *
 * Lenis runs on gsap.ticker rather than its own rAF, because two clocks put
 * scrub-linked ScrollTrigger scenes a frame behind the scroll position.
 */

import * as React from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/** Exposed so route changes can reset the scroll without importing Lenis. */
let active: Lenis | null = null;

export function scrollToTop(immediate = true) {
  active?.scrollTo(0, { immediate, force: true });
}

export function SmoothScroll({
  children,
  /** The landing page has its own motion switch; pass it through. */
  enabled = true,
}: {
  children?: React.ReactNode;
  enabled?: boolean;
}) {
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (reducedMotion || !enabled) return;
    // Touch devices already have momentum scrolling; hijacking it feels worse
    // and costs a rAF loop on the weakest hardware.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);

      const wrapper = document.querySelector<HTMLElement>('[data-app-scroll]');
      const lenis = new Lenis(
        wrapper
          ? {
              wrapper,
              content: wrapper.firstElementChild as HTMLElement,
              duration: 1.05,
              // Exponential ease-out: fast to respond, slow to settle.
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              smoothWheel: true,
              wheelMultiplier: 1,
              touchMultiplier: 1.6,
            }
          : {
              duration: 1.1,
              easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              smoothWheel: true,
            },
      );
      active = lenis;

      // ScrollTrigger reads a transformed content box, so it needs telling
      // whenever Lenis moves, and it must measure the same scroller.
      const onScroll = () => ScrollTrigger.update();
      lenis.on('scroll', onScroll);
      if (wrapper) {
        ScrollTrigger.scrollerProxy(wrapper, {
          scrollTop(value) {
            if (arguments.length && value !== undefined) lenis.scrollTo(value, { immediate: true });
            return lenis.scroll;
          },
          getBoundingClientRect: () => wrapper.getBoundingClientRect(),
          pinType: 'transform',
        });
      }

      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const refresh = () => ScrollTrigger.refresh();
      // Fonts land after first paint and change every section height.
      document.fonts?.ready.then(refresh).catch(() => {});

      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.off('scroll', onScroll);
        if (wrapper) ScrollTrigger.clearScrollMemory();
        lenis.destroy();
        if (active === lenis) active = null;
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [reducedMotion, enabled]);

  // Keep Lenis' observed content node stable across keyed route transitions.
  // If the first child is replaced, ResizeObserver otherwise tracks a detached
  // page and retains its old scroll limit on longer pages such as attendance.
  return children ? <div data-scroll-content>{children}</div> : null;
}
