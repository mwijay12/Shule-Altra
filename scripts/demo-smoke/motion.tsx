import './dom';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { AnimatedNumber } from '@/components/ui/animated-number';
import { Progress, SegmentedProgress } from '@/components/ui/progress';

let failures = 0;
function check(label: string, run: () => void) {
  try { run(); console.log(`OK   ${label}`); }
  catch (error: any) { failures += 1; console.log(`FAIL ${label}: ${error?.message}`); }
}

// Controllable OS preference: the hook must react while a screen is open.
let reduced = false;
const listeners = new Set<() => void>();
const media = {
  get matches() { return reduced; },
  media: '(prefers-reduced-motion: reduce)',
  addEventListener: (_: string, listener: () => void) => { listeners.add(listener); },
  removeEventListener: (_: string, listener: () => void) => { listeners.delete(listener); },
};
(window as any).matchMedia = () => media;
(globalThis as any).matchMedia = () => media;
function setReduced(value: boolean) {
  reduced = value;
  listeners.forEach((listener) => listener());
}

const container = document.getElementById('root')!;
const root = createRoot(container);
const flush = async (ms: number) => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
};
const render = async (node: React.ReactNode) => {
  await act(async () => { root.render(node); });
};
const numberText = () => container.querySelector('[data-count-value]')?.textContent ?? '';
const indicator = () => container.querySelector('[data-slot="progress-indicator"]') as HTMLElement;

async function main() {
  setReduced(false);
  await render(<AnimatedNumber value={150} duration={0.3} />);
  check('counter starts at zero, not the final value', () => assert.equal(numberText(), '0'));
  await flush(90);
  check('counter passes through an intermediate value', () => {
    const value = Number(numberText().replaceAll(',', ''));
    assert.ok(value > 0 && value < 150, `got ${value}`);
  });
  await flush(500);
  check('counter lands exactly on the registry total', () => assert.equal(numberText(), '150'));

  await render(<AnimatedNumber value={175} duration={0.3} />);
  check('live update starts from the displayed value', () => assert.equal(numberText(), '150'));
  await flush(500);
  check('live update lands on the new value', () => assert.equal(numberText(), '175'));

  await render(<AnimatedNumber value={75.0928} duration={0.3} format={(value) => value.toFixed(1)} suffix="%" />);
  await flush(500);
  check('decimal formatting and suffix survive the animation', () => assert.equal(numberText(), '75.1%'));

  await act(async () => { setReduced(true); });
  await render(<AnimatedNumber value={999} duration={2} />);
  check('reduced motion shows the final number immediately', () => assert.equal(numberText(), '999'));
  await render(<AnimatedNumber value={Number.NaN} />);
  check('non-finite values never render NaN', () => assert.equal(numberText(), '0'));

  await act(async () => { setReduced(false); });
  await render(<Progress value={75} aria-label="Fee collection" />);
  check('progress exposes the real target to assistive technology immediately', () => {
    assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), '75');
    assert.equal(indicator().style.transform, 'translateX(-100%)');
  });
  await flush(100);
  check('progress fill animates toward its target', () => assert.equal(indicator().style.transform, 'translateX(-25%)'));
  await render(<Progress value={140} aria-label="Clamped progress" />);
  await flush(100);
  check('progress clamps above 100 without hiding the target', () => {
    assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), '100');
    assert.equal(indicator().style.transform, 'translateX(0%)');
  });
  await render(<Progress value={null} aria-label="Loading progress" />);
  check('indeterminate progress has no fake numeric value', () => {
    assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), null);
  });
  await act(async () => { setReduced(true); });
  await render(<Progress value={62} aria-label="Reduced progress" />);
  check('reduced motion lands the fill immediately', () => assert.equal(indicator().style.transform, 'translateX(-38%)'));

  await render(<SegmentedProgress label="Grade distribution" segments={[{ value: 60, label: 'A–B', className: 'bg-primary' }, { value: 40, label: 'C–F', className: 'bg-accent' }]} />);
  check('segmented progress has an accessible distribution summary', () => {
    assert.equal(container.querySelector('[role="img"]')?.getAttribute('aria-label'), 'Grade distribution: A–B 60%, C–F 40%');
  });

  await act(async () => { root.unmount(); });
  check('unmount removes preference listeners', () => assert.equal(listeners.size, 0));

  // ── the dashboard motion rework ────────────────────────────────────────────
  const read = (file: string) => readFileSync(path.resolve(file), 'utf8');

  check('every module shares one animated stat tile', () => {
    const modules = ['finance', 'attendance', 'canteen', 'assets', 'transport', 'audit'];
    for (const name of modules) {
      const source = read(`src/app/dashboard/${name}/page.tsx`);
      assert.match(source, /StatCard/, `${name} is not using the shared stat tile`);
    }
    const tile = read('src/components/admin/stat-card.tsx');
    assert.match(tile, /useCountUp/, 'the tile must count up');
    assert.match(tile, /useReducedMotion/, 'the tile must honour reduced motion');
    assert.match(tile, /data-count-value/, 'the tile must expose its target for testing');
    assert.match(tile, /useInView/, 'below-the-fold tiles must animate on arrival');
  });

  check('charts share one motion grammar and wait to be seen', () => {
    const motion = read('src/components/admin/chart-motion.tsx');
    assert.match(motion, /isAnimationActive: !reducedMotion/);
    assert.match(motion, /animationDuration: reducedMotion \? 0/);
    assert.match(motion, /useInView/, 'a chart must not play its entrance off-screen');
    const charts = read('src/components/admin/module-charts.tsx');
    assert.match(charts, /ChartFrame/);
    // Honest empty states rather than an empty axis.
    assert.match(charts, /function Empty/);
  });

  check('modules that had no chart now have one', () => {
    const expected: Record<string, string> = {
      attendance: 'AttendanceByClass',
      finance: 'FeesByClass',
      students: 'RegisterSplit',
      canteen: 'CanteenMix',
      assets: 'AssetCondition',
      hostel: 'OccupancyPanel',
      transport: 'FleetLoad',
    };
    for (const [name, component] of Object.entries(expected)) {
      assert.match(read(`src/app/dashboard/${name}/page.tsx`), new RegExp(component), `${name} lost its chart`);
    }
  });

  check('every ResponsiveContainer inside ChartFrame has a definite height', () => {
    // ChartFrame sets minHeight, not height, so height="100%" collapses to zero
    // and the chart renders as blank space. This shipped once; keep it caught.
    const charts = read('src/components/admin/module-charts.tsx');
    assert.ok(
      !/ResponsiveContainer[^>]*height="100%"/.test(charts),
      'a percentage height inside ChartFrame collapses to zero',
    );
  });

  check('the reveal catches blocks that mount after the data arrives', () => {
    const transition = read('src/components/admin/page-transition.tsx');
    assert.match(transition, /MutationObserver/, 'late-mounting charts would never reveal');
    assert.match(transition, /WeakSet/, 'a block must not re-animate on every mutation');
    assert.match(transition, /observer\?\.disconnect\(\)/, 'the observer must be cleaned up');
  });

  check('the page entrance staggers, and only composites opacity and transform', () => {
    const css = read('src/app/globals.css');
    const keyframes = css.slice(css.indexOf('@keyframes sd-page-in'), css.indexOf('.sd-page-enter'));
    assert.ok(!/filter:|height:|width:/.test(keyframes), 'a repaint-heavy property crept into the entrance');
    assert.match(keyframes, /transform:/);
    // Five blocks used to land inside 220ms, which read as one flat fade.
    assert.match(css, /nth-child\(5\) \{ animation-delay: 330ms; \}/);
    assert.match(css, /sd-stagger-rows/);
  });

  check('reduced motion stills the new row and tile animations', () => {
    const css = read('src/app/globals.css');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(/sd-stagger-rows/.test(block.slice(0, 900)), 'row stagger must be disabled under reduced motion');
  });

  console.log(failures === 0 ? '\nMOTION REGRESSIONS PASSED' : `\n${failures} MOTION REGRESSION(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
