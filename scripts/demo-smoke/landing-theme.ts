/**
 * @fileOverview The landing page must wear the school's published palette.
 *
 * This regressed once: `.landing` declared its own hex palette (#1f5ba6,
 * #7c5ae0, #111a24 …) while ThemeProvider wrote --primary/--accent onto <html>.
 * Publishing a palette in Theme Studio restyled the whole dashboard and left the
 * public front page blue. These checks read the CSS as text so the guard runs in
 * CI without a browser; .preview/landing-theme-qa.mjs proves it in a real one.
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

const css = readFileSync(path.resolve('src/app/globals.css'), 'utf8');

/** Strip comments: the CSS documents the old hex codes, and matching prose
 *  would fail the guard for the wrong reason. */
const code = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** The landing region begins at the photography band. */
const landingStart = code.indexOf('.sd-life {');
const landing = landingStart >= 0 ? code.slice(landingStart) : code;

/** Body of a single rule, for the token block. */
function ruleBody(selector: string): string {
  // Anchor to the start of a line (allowing indentation, since :root sits
  // inside @layer base): a plain indexOf('.sd-bell {') also matches
  // '.landing .sd-bell {', which is a different rule.
  const name = selector.replace(/\s*\{$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^[\\t ]*${name}\\s*\\{`, 'm').exec(code);
  assert.ok(match, `selector not found at line start: ${selector}`);
  const start = match.index;
  return code.slice(start, code.indexOf('}', start));
}

console.log('\nLANDING TOKENS\n');

check('the landing token block resolves from the theme, not its own hexes', () => {
  const body = ruleBody('.landing {');
  const expected: Record<string, string> = {
    '--ink': 'var(--foreground)',
    '--paper': 'var(--background)',
    '--mark': 'var(--accent)',
    '--glow': 'var(--accent)',
    '--system': 'var(--primary)',
    '--mist': 'var(--border)',
  };
  for (const [token, source] of Object.entries(expected)) {
    const line = body.split('\n').find((l) => l.trim().startsWith(`${token}:`));
    assert.ok(line, `${token} is not declared on .landing`);
    assert.ok(line.includes(source), `${token} must derive from ${source}, got: ${line.trim()}`);
  }
});

check('the brand gradient is built from primary and accent', () => {
  const body = ruleBody('.landing {');
  const line = body.split('\n').find((l) => l.includes('--brand-gradient:'));
  assert.ok(line, '--brand-gradient missing');
  assert.match(line, /var\(--primary\)/);
  assert.match(line, /var\(--accent\)/);
});

check('no landing token references itself', () => {
  const body = ruleBody('.landing {');
  for (const match of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    assert.ok(
      !value.includes(`var(${name})`) && !value.includes(`var(${name},`),
      `${name} is defined from itself, which computes to nothing`,
    );
  }
});

check('.landing no longer shadows the global --card token', () => {
  const body = ruleBody('.landing {');
  assert.ok(!/^\s*--card:/m.test(body), '.landing redefines --card; readers should use hsl(var(--card))');
});

check('the deep editorial sections follow the brand hue', () => {
  const body = ruleBody('.landing {');
  for (const token of ['--forest', '--forest-deep', '--glow-on-dark']) {
    const line = body.split('\n').find((l) => l.trim().startsWith(`${token}:`));
    assert.ok(line, `${token} missing`);
    assert.match(line, /var\(--brand-hue\)/, `${token} must tint from the brand hue`);
  }
});

check('--brand-hue has a CSS fallback for a no-JS first paint', () => {
  // apply.ts and the pre-paint script set it at runtime. Without a declared
  // default every hue-derived surface would be an invalid colour until JS ran.
  const root = ruleBody(':root {');
  assert.match(root, /--brand-hue:\s*\d+/, '--brand-hue needs a numeric fallback in :root');
});

console.log('\nNO PRIVATE PALETTE\n');

check('the landing region carries no hardcoded brand hex', () => {
  const banned = [/#1f5ba6/i, /#7c5ae0/i, /#6b4be0/i, /#5232c4/i, /#111a24/i, /#f6f8fc/i, /#1a1e45/i, /#0e1130/i, /#3b2a92/i, /#2a2470/i];
  for (const pattern of banned) {
    assert.ok(!pattern.test(landing), `a fixed brand colour survived in the landing CSS: ${pattern}`);
  }
});

check('the old brand rgb() triples are gone from the landing region', () => {
  // 31,91,166 was the blue; 124,90,224 and 107,75,224 the violets.
  for (const triple of ['31, 91, 166', '124, 90, 224', '107, 75, 224']) {
    assert.ok(!landing.includes(triple), `fixed brand rgb(${triple}) survived`);
  }
});

check('ink and rules use the foreground token so dark mode stays legible', () => {
  assert.ok(!/rgba\(15,\s*23,\s*42/.test(landing), 'the old fixed ink rgb() survived');
  assert.match(landing, /hsl\(var\(--foreground\)\s*\/\s*0?\.\d+\)/);
});

console.log('\nDARK MODE\n');

check('surfaces that sit on paper use --card, never literal white', () => {
  // The clock chip and the bell band carry --ink text. A fixed white surface
  // made them white-on-white once --ink went light in dark mode.
  const clock = ruleBody('.sd-clock {');
  assert.match(clock, /background:\s*hsl\(var\(--card\)/, 'the clock chip must use the card token');
  const bell = ruleBody('.sd-bell {');
  assert.match(bell, /background:\s*hsl\(var\(--card\)/, 'the bell band must use the card token');
});

check('the dashboard dark gradient follows the palette too', () => {
  const dark = ruleBody('.dark .colorful-gradient {');
  assert.match(dark, /var\(--primary\)/);
  assert.match(dark, /var\(--accent\)/);
  assert.ok(!/#[0-9a-f]{6}/i.test(dark), 'the dark gradient still hardcodes a colour');
});

console.log(
  failures === 0
    ? `\nLANDING THEME REGRESSIONS PASSED (${checks} checks)\n`
    : `\n${failures} LANDING THEME REGRESSION(S) FAILED\n`,
);
if (failures > 0) process.exit(1);
