'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { DURATION, ENTER_Y, GSAP_EASE, STAGGER, EASE_OUT_QUART } from '@/lib/motion/tokens';

/** Each route owns its observers, including when AnimatePresence delays its mount. */
function RouteContent({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const root = containerRef.current;
    if (!root || reducedMotion) return;

    let cancelled = false;
    let mutationObserver: MutationObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;
    let context: { revert: () => void } | undefined;
    const animations: Array<{ progress: (value: number) => unknown }> = [];

    (async () => {
      const { gsap } = await import('gsap');
      if (cancelled) return;
      const seen = new WeakSet<HTMLElement>();
      const scrollRoot = root.closest<HTMLElement>('[data-app-scroll]');

      context = gsap.context(() => {
        const reveal = (nodes: HTMLElement[]) => {
          if (!nodes.length) return;
          animations.push(gsap.from(nodes, {
            y: ENTER_Y,
            opacity: 0,
            duration: DURATION.enter,
            ease: GSAP_EASE,
            stagger: STAGGER.card,
            clearProps: 'transform,opacity',
          }));
        };

        if (typeof IntersectionObserver !== 'undefined') {
          intersectionObserver = new IntersectionObserver((entries) => {
            const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target as HTMLElement);
            visible.forEach((node) => intersectionObserver?.unobserve(node));
            reveal(visible);
          }, { root: scrollRoot, threshold: 0.05 });
        }

        const discover = () => {
          const fresh = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
            .filter((node) => !seen.has(node) && !node.closest('[data-wave-root]'));
          fresh.forEach((node) => {
            seen.add(node);
            intersectionObserver?.observe(node);
          });
          if (!intersectionObserver) reveal(fresh);
        };
        discover();
        mutationObserver = new MutationObserver(discover);
        mutationObserver.observe(root, { childList: true, subtree: true });
      }, root);
    })();

    return () => {
      cancelled = true;
      mutationObserver?.disconnect();
      intersectionObserver?.disconnect();
      animations.forEach((animation) => animation.progress(1));
      context?.revert();
    };
  }, [reducedMotion]);

  return (
    <motion.div
      ref={containerRef}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_OUT_QUART }}
      className="mx-auto w-full max-w-[1500px] px-4 pb-16 pt-6 sm:px-6 lg:px-8"
    >
      {children}
    </motion.div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <RouteContent key={pathname}>{children}</RouteContent>
    </AnimatePresence>
  );
}
