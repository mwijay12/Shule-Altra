'use client';

/**
 * @fileOverview Route transition wrapper. Framer Motion handles the crossfade,
 * GSAP choreographs the staggered reveal of `[data-reveal]` blocks.
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { EASE_OUT_QUART } from '@/lib/motion/tokens';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (reducedMotion) return;

    let ctx: { revert: () => void } | undefined;
    let observer: MutationObserver | undefined;
    let cancelled = false;

    (async () => {
      const { gsap } = await import('gsap');
      if (cancelled || !containerRef.current) return;
      // Blocks marked [data-reveal] often mount *after* the route changes,
      // because they wait on Firestore. A single query on navigation missed
      // every one of them. Watch for arrivals and reveal each block once.
      const seen = new WeakSet<HTMLElement>();
      const reveal = () => {
        const fresh = gsap
          .utils.toArray<HTMLElement>('[data-reveal]')
          .filter((node) => !seen.has(node))
          // A WaveSection runs its own timeline; revealing it here too would
          // fight it over the same transform.
          .filter((node) => !node.closest('[data-wave-root]'));
        if (fresh.length === 0) return;
        fresh.forEach((node) => seen.add(node));
        gsap.from(fresh, {
          y: 18,
          opacity: 0,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.045,
          clearProps: 'transform,opacity',
        });
      };

      ctx = gsap.context(() => {
        reveal();
        observer = new MutationObserver(reveal);
        observer.observe(root, { childList: true, subtree: true });
      }, containerRef);
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      ctx?.revert();
    };
  }, [pathname, reducedMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        ref={containerRef}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_OUT_QUART }}
        className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-6 lg:px-8"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
