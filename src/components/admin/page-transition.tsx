'use client';

/**
 * @fileOverview Route transition wrapper. Framer Motion handles the crossfade,
 * GSAP choreographs the staggered reveal of `[data-reveal]` blocks.
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const { gsap } = await import('gsap');
      if (cancelled || !containerRef.current) return;
      ctx = gsap.context(() => {
        const targets = gsap.utils.toArray<HTMLElement>('[data-reveal]');
        if (targets.length === 0) return;
        gsap.from(targets, {
          y: 18,
          opacity: 0,
          duration: 0.55,
          ease: 'power3.out',
          stagger: 0.06,
          clearProps: 'transform,opacity',
        });
      }, containerRef);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        ref={containerRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
