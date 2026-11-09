/**
 * @fileOverview Guards the motion contract: one set of tokens, GPU-only
 * properties, and no surface that re-blurs its backdrop every frame.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

let failures = 0;
let checks = 0;

function check(name: string, fn: () => void) {
  checks += 1;
  try {
    fn();
    console.log(`OK   ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const read = (file: string) => readFileSync(path.resolve(file), 'utf8');

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const sources = walk('src', ['.ts', '.tsx']);

console.log('\nONE SOURCE OF MOTION TRUTH\n');

check('motion tokens declare the springs and curves the brief specifies', () => {
  const tokens = read('src/lib/motion/tokens.ts');
  assert.match(tokens, /stiffness: 300/, 'tactile spring stiffness');
  assert.match(tokens, /damping: 24/, 'tactile spring damping');
  assert.match(tokens, /\[0\.16, 1, 0\.3, 1\]/, 'easeOutQuart curve');
  assert.match(tokens, /bar: 0\.04/, '40ms per-bar stagger');
  assert.match(tokens, /card: 0\.06/, '60ms per-card stagger');
  assert.match(tokens, /DIMMED_OPACITY = 0\.25/, 'sibling series dim to 0.25');
});

check('no component imports framer-motion directly', () => {
  const offenders = sources.filter((f) => stripComments(read(f)).includes("from 'framer-motion'"));
  assert.deepEqual(offenders, [], 'use motion/react so one copy of the engine ships');
});

check('chart easing is not re-typed as a literal at the call site', () => {
  const offenders = sources
    .filter((f) => !f.endsWith('lib/motion/tokens.ts'))
    .filter((f) => /\[0\.22, 1, 0\.36, 1\]|\[0\.16, 1, 0\.3, 1\]/.test(stripComments(read(f))));
  assert.deepEqual(offenders, [], 'import EASE_OUT_QUART instead of duplicating the curve');
});

console.log('\nGPU-ONLY PROPERTIES\n');

check('no transition-all anywhere in src', () => {
  const offenders = sources.filter((f) => stripComments(read(f)).includes('transition-all'));
  assert.deepEqual(
    offenders,
    [],
    'transition-all animates layout properties. Name the properties: transition-[transform,opacity].',
  );
});

check('no in-flow surface blurs its backdrop', () => {
  // Scrims are allowed: one surface, only while a modal is open.
  const allowed = ['bg-black/50', 'bg-foreground/50', 'backdrop-blur-[6px]'];
  const offenders: string[] = [];
  for (const file of sources) {
    stripComments(read(file))
      .split('\n')
      .forEach((line, i) => {
        if (/backdrop-blur|backdropFilter/.test(line) && !allowed.some((a) => line.includes(a))) {
          offenders.push(`${file}:${i + 1}`);
        }
      });
  }
  assert.deepEqual(offenders, [], 'a card on an opaque page gains nothing from a per-frame backdrop blur');
});

check('entrance blur clears to none rather than blur(0px)', () => {
  const wave = stripComments(read('src/components/motion/wave-section.tsx'));
  assert.match(wave, /clearProps: 'transform,opacity,filter,willChange'/);
  // blur(0px) still promotes a compositor layer for the life of the page.
  assert.ok(!/blur\(0px\)/.test(wave), 'animate to none, not blur(0px)');
});

check('the wave timeline only blurs the heading, never a grid of cards', () => {
  const wave = stripComments(read('src/components/motion/wave-section.tsx'));
  const cardBlock = wave.slice(wave.indexOf('if (cards.length)'));
  assert.ok(!/filter/.test(cardBlock.split('timeline.eventCallback')[0]), 'cards must not carry a filter');
});

console.log('\nCHART CHOREOGRAPHY\n');

check('bars grow from the baseline on a stagger', () => {
  const chart = stripComments(read('src/components/motion/chart-interaction.tsx'));
  assert.match(chart, /scaleY: 0/, 'bars start collapsed');
  assert.match(chart, /STAGGER\.bar/, 'each bar waits its turn');
  // Motion owns transform-origin; the CSS property is overwritten.
  assert.match(chart, /originY: 1/, 'without originY the bar scales from its centre');
  assert.match(chart, /transformBox: 'fill-box'/);
});

check('the attendance chart hands its entrance to GrowingBar', () => {
  const charts = stripComments(read('src/components/admin/module-charts.tsx'));
  assert.match(charts, /shape=\{\(props: any\) => <GrowingBar/);
  // '<Bar' also matches '<BarChart', which sliced the wrong block.
  const barStart = charts.search(/<Bar[\s>]/);
  assert.ok(barStart >= 0, 'no <Bar> series found');
  const bar = charts.slice(barStart, charts.indexOf('/>', barStart));
  assert.match(bar, /isAnimationActive=\{false\}/, 'Recharts animating too makes the bar jump twice');
});

check('hovering a series dims its siblings', () => {
  const chart = stripComments(read('src/components/motion/chart-interaction.tsx'));
  assert.match(chart, /DIMMED_OPACITY/);
  const revenue = stripComments(read('src/components/admin/revenue-chart.tsx'));
  assert.match(revenue, /opacityFor\('collected'\)/);
  assert.match(revenue, /bind\(item\.series\)/, 'the footer stats double as the legend');
});

check('switching timeframe keeps the chart mounted', () => {
  const revenue = stripComments(read('src/components/admin/revenue-chart.tsx'));
  assert.match(revenue, /useStableSeries\(buckets, isLoading\)/);
  assert.ok(!/key=\{range\}/.test(revenue), 'keying the chart by range throws the SVG away');
});

check('the tooltip glides on a spring', () => {
  const chart = stripComments(read('src/components/motion/chart-interaction.tsx'));
  assert.match(chart, /SPRING_GLIDE/);
  const revenue = stripComments(read('src/components/admin/revenue-chart.tsx'));
  assert.match(revenue, /<GlidingTooltip/);
});

console.log('\nSCROLL AND SECTIONS\n');

check('Lenis and ScrollTrigger share one clock', () => {
  const scroll = stripComments(read('src/components/system/smooth-scroll.tsx'));
  assert.match(scroll, /gsap\.ticker\.add\(tick\)/, 'a separate rAF loop puts scrub scenes a frame behind');
  assert.match(scroll, /gsap\.ticker\.remove\(tick\)/, 'the ticker callback must be removed on unmount');
  assert.match(scroll, /lenis\.destroy\(\)/);
  assert.match(scroll, /pointer: coarse/, 'touch devices keep their native momentum');
});

check('the dashboard scroller is proxied for ScrollTrigger', () => {
  const scroll = stripComments(read('src/components/system/smooth-scroll.tsx'));
  assert.match(scroll, /ScrollTrigger\.scrollerProxy\(wrapper/);
  assert.match(scroll, /data-app-scroll/, 'the window does not scroll in the dashboard');
});

check('the landing honours its own motion switch', () => {
  const landing = read('src/app/page.tsx');
  assert.match(landing, /<SmoothScroll enabled=\{on\} \/>/, 'the landing motion toggle must also stop Lenis');
  const scroll = stripComments(read('src/components/system/smooth-scroll.tsx'));
  assert.match(scroll, /reducedMotion \|\| !enabled/, 'the off switch must bail before Lenis is constructed');
  assert.match(scroll, /\[reducedMotion, enabled\]/, 'toggling must re-run the effect');
});

check('wave sections are actually mounted, and do not fight the other entrances', () => {
  const pages = walk('src/app/dashboard', ['.tsx']).filter((f) => read(f).includes('<WaveSection'));
  assert.ok(pages.length >= 5, `only ${pages.length} pages use WaveSection`);
  const css = read('src/app/globals.css');
  assert.match(css, /:not\(\[data-wave-root\]\)/, 'the CSS page stagger must skip a wave root');
  const transition = stripComments(read('src/components/admin/page-transition.tsx'));
  assert.match(transition, /closest\('\[data-wave-root\]'\)/, 'GSAP must skip it too');
});

check('reduced motion is honoured by every new engine', () => {
  for (const file of [
    'src/components/motion/wave-section.tsx',
    'src/components/motion/chart-interaction.tsx',
    'src/components/system/smooth-scroll.tsx',
  ]) {
    assert.match(stripComments(read(file)), /useReducedMotion/, `${file} ignores reduced motion`);
  }
});

console.log(
  failures === 0
    ? `\nMOTION SPEC PASSED (${checks} checks)\n`
    : `\n${failures} MOTION SPEC CHECK(S) FAILED\n`,
);
if (failures > 0) process.exit(1);
