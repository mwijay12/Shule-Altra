import './dom';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import assert from 'node:assert/strict';

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
  console.log(failures === 0 ? '\nMOTION REGRESSIONS PASSED' : `\n${failures} MOTION REGRESSION(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
