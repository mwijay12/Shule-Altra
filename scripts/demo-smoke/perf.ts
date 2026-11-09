/**
 * @fileOverview Guard the frame budget.
 *
 * The motion suite reported PASSED while the dashboard ran at 2-3 fps against a
 * 60 fps baseline. Counters, rings and charts animated in three frames, which
 * reads as a jump. Adding more animation could not fix it.
 *
 * Causes, isolated one at a time in Chromium:
 *   baseline                          2 fps
 *   - backdrop-filter on every panel   9 fps
 *   - blur() on the orb fallback      15 fps
 *   - the WebGL orb canvas            59 fps
 *
 * These checks read source so CI needs no browser. .preview/fps-probe.mjs
 * measures the real frame rate.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function ruleBody(css: string, selector: string): string {
  const name = selector.replace(/\s*\{$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^[\\t ]*${name}\\s*\\{`, 'm').exec(css);
  assert.ok(match, `selector not found: ${selector}`);
  return css.slice(match.index, css.indexOf('}', match.index));
}

console.log('\nCOMPOSITOR COST\n');

check('the shared card surface does not blur its backdrop', () => {
  const css = stripComments(read('src/app/globals.css'));
  for (const selector of ['.glass-panel {', '.glass-panel-strong {']) {
    const body = ruleBody(css, selector);
    assert.ok(
      !/backdrop-filter\s*:/.test(body),
      `${selector} blurs its backdrop. A dozen of these on screen took the page from 60 fps to 2. Use the gradient.`,
    );
  }
});

check('the sidebar is opaque rather than blurring a full-height layer', () => {
  const sidebar = read('src/components/admin/sidebar.tsx');
  const aside = sidebar.match(/<aside className="hidden[^"]*"/)?.[0] ?? '';
  assert.ok(aside, 'desktop aside not found');
  assert.ok(!/backdrop-blur/.test(aside), 'nothing scrolls behind a flex sibling; the blur is pure cost');
});

check('the sticky topbar keeps its glass cheap', () => {
  const topbar = read('src/components/admin/topbar.tsx');
  const header = topbar.match(/<header className="sticky[^"]*"/)?.[0] ?? '';
  assert.ok(header, 'sticky header not found');
  assert.ok(!/backdrop-blur-xl|backdrop-blur-2xl|backdrop-blur-3xl/.test(header), 'a 24px+ blur across the full width is too expensive');
});

check('chart hover animates transform and shadow, never a filter', () => {
  const charts = read('src/components/admin/module-charts.tsx');
  const panel = charts.slice(charts.indexOf('export function ChartPanel'), charts.indexOf('export function AttendanceByClass'));
  assert.ok(!/backdrop-blur|blur-\[|filter:/.test(panel), 'a hover filter re-taxes every frame the pointer rests on the panel');
  assert.match(panel, /hover:-translate-y/, 'the panel should still respond to the pointer');
});

console.log('\nTHE ORB\n');

check('the orb caps its frame rate instead of drawing every frame', () => {
  const orb = read('src/components/admin/three-orb.tsx');
  assert.match(orb, /FRAME_MS/, 'the render loop needs a frame-rate cap');
  assert.match(orb, /1000 \/ 30/, 'a 0.28 rad/s rotation does not need 60 fps');
});

check('the orb pauses when off screen or the tab is hidden', () => {
  const orb = read('src/components/admin/three-orb.tsx');
  assert.match(orb, /IntersectionObserver/, 'it used to spin forever, wherever the reader was');
  assert.match(orb, /document\.hidden/, 'a background tab must not render');
  assert.match(orb, /visibility\?\.disconnect\(\)/, 'the observer must be cleaned up');
});

check('the orb declines to run on a software rasteriser', () => {
  const orb = read('src/components/admin/three-orb.tsx');
  assert.match(orb, /WEBGL_debug_renderer_info/);
  assert.match(orb, /swiftshader|llvmpipe/i, 'software GL must fall back to the CSS orb');
});

check('the orb does not render at 2x with MSAA', () => {
  const orb = stripComments(read('src/components/admin/three-orb.tsx'));
  assert.match(orb, /antialias:\s*false/, 'MSAA on a decorative wireframe is not worth 4x the pixels');
  const dpr = orb.match(/setPixelRatio\(Math\.min\(window\.devicePixelRatio \|\| 1,\s*([\d.]+)\)\)/);
  assert.ok(dpr, 'pixel ratio must be capped');
  assert.ok(Number(dpr[1]) <= 1.5, `pixel ratio cap ${dpr[1]} is too high for a decorative sphere`);
});

check('the CSS fallback orb is compositor-only and actually moves', () => {
  const orb = read('src/components/admin/three-orb.tsx');
  assert.match(orb, /sd-orb-spin/, 'the fallback must not be a static disc');
  // It used to linger at opacity 0 with a blur filter, still composited.
  assert.match(orb, /\{!ready && \(/, 'the fallback must leave the tree once WebGL is ready');
  assert.ok(!/filter: 'blur/.test(orb), 'a persistent blur layer is composited every frame');

  const css = read('src/app/globals.css');
  const spin = ruleBody(css, '.sd-orb-spin {');
  assert.match(spin, /animation:/);
  const keyframes = css.slice(css.indexOf('@keyframes sd-orb-spin'), css.indexOf('.sd-orb-spin {'));
  assert.match(keyframes, /transform:/);
  assert.ok(!/filter:|width:|height:/.test(keyframes), 'the fallback must animate transform only');
});

check('reduced motion stills the fallback orb', () => {
  const css = read('src/app/globals.css');
  const block = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(block, /sd-orb-spin/, 'the spinning orb must stop under reduced motion');
});

console.log(
  failures === 0
    ? `\nFRAME BUDGET REGRESSIONS PASSED (${checks} checks)\n`
    : `\n${failures} FRAME BUDGET REGRESSION(S) FAILED\n`,
);
if (failures > 0) process.exit(1);
