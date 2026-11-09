'use client';

/**
 * @fileOverview Viewport entry: badge, heading, subcopy, then cards 60ms apart.
 *
 * Mark children data-wave="badge|heading|subcopy|card".
 *
 * Only the heading carries a blur, and clearProps strips it on completion so no
 * compositor layer outlives the reveal. useGSAP kills the timeline on unmount.
 */

import * as React from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ENTER_Y, ENTER_BLUR, GSAP_EASE, DURATION, STAGGER, WAVE } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function WaveSection({
  children,
  className,
  as: Tag = 'section',
  /** Skip the scroll trigger when the section is already on screen at load. */
  immediate = false,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'header';
  immediate?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement | null>(null);
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      const root = ref.current;
      if (!root || reducedMotion) return;

      const pick = (name: string) => gsap.utils.toArray<HTMLElement>(`[data-wave="${name}"]`, root);
      const badge = pick('badge');
      const heading = pick('heading');
      const subcopy = pick('subcopy');
      const cards = pick('card');
      if (badge.length + heading.length + subcopy.length + cards.length === 0) return;

      const scroller = document.querySelector<HTMLElement>('[data-app-scroll]') ?? window;
      const timeline = gsap.timeline({
        defaults: { ease: GSAP_EASE, duration: DURATION.enter },
        scrollTrigger: immediate
          ? undefined
          : { trigger: root, scroller, start: 'top 88%', once: true },
      });

      const rise = { y: ENTER_Y, opacity: 0 };
      if (badge.length) timeline.from(badge, { ...rise, y: 12 }, WAVE.badge);
      if (heading.length) {
        timeline.from(
          heading,
          { ...rise, filter: `blur(${ENTER_BLUR}px)` },
          WAVE.heading,
        );
      }
      if (subcopy.length) timeline.from(subcopy, rise, WAVE.subcopy);
      if (cards.length) {
        // Cards never carry a filter: a grid of blurred layers is what took the
        // dashboard to 2 fps. Transform and opacity only.
        timeline.from(cards, { ...rise, stagger: STAGGER.card }, WAVE.cards);
      }

      // Leave no inline transform, opacity or filter behind. A leftover filter
      // keeps a compositor layer alive for the life of the page.
      timeline.eventCallback('onComplete', () => {
        gsap.set([...badge, ...heading, ...subcopy, ...cards], {
          clearProps: 'transform,opacity,filter,willChange',
        });
      });
    },
    { scope: ref, dependencies: [reducedMotion, immediate] },
  );

  return (
    <Tag ref={ref as never} data-wave-root="" className={cn(className)} {...rest}>
      {children}
    </Tag>
  );
}
