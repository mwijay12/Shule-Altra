/**
 * @fileOverview Every duration, spring and stagger in the product.
 *
 * Import from here. Call sites had drifted to nine easings and six durations.
 */

/** Tactile default for anything a pointer drives: tabs, cards, tooltips. */
export const SPRING_TACTILE = { type: 'spring', stiffness: 300, damping: 24 } as const;

/** Heavier settle for layout morphs, where overshoot reads as a glitch. */
export const SPRING_LAYOUT = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 } as const;

/** Soft spring for a tooltip that should glide, not snap. */
export const SPRING_GLIDE = { type: 'spring', stiffness: 260, damping: 26, mass: 0.6 } as const;

/** easeOutQuart. The curve for entrances and chart draws. */
export const EASE_OUT_QUART = [0.16, 1, 0.3, 1] as const;

/** GSAP spells the same curve differently. */
export const GSAP_EASE = 'power4.out';

export const DURATION = {
  /** Line traces and bar growth. */
  chart: 0.9,
  /** KPI odometer. */
  counter: 1.1,
  /** Section entrance. */
  enter: 0.62,
  /** Hover and press feedback. */
  micro: 0.22,
} as const;

export const STAGGER = {
  /** Per bar in a bar chart. */
  bar: 0.04,
  /** Per card in a grid. */
  card: 0.06,
  /** Per Recharts series. */
  series: 0.19,
} as const;

/**
 * Viewport-entry wave. Badge, then heading, then subcopy, then the cards.
 * Offsets are seconds from the moment the section scrolls into view.
 */
export const WAVE = {
  badge: 0,
  heading: 0.06,
  subcopy: 0.12,
  cards: 0.18,
} as const;

/** Sibling series fade to this when one series is hovered. */
export const DIMMED_OPACITY = 0.25;

/** Vertical travel on entrance, in pixels. */
export const ENTER_Y = 24;

/**
 * Entrance blur, in pixels. Headings only, never a grid of cards.
 *
 * A persistent blur layer cost 6 fps per surface. `blur(0px)` still promotes a
 * compositor layer, so entrances animate to the string 'none'.
 */
export const ENTER_BLUR = 6;

/** Only animate what the compositor can handle without layout. */
export const COMPOSITED = ['opacity', 'transform', 'filter'] as const;
