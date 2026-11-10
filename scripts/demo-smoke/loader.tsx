import './dom';

import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { InstitutionalLoader } from '@/components/ui/institutional-loader';

const root = createRoot(document.getElementById('root')!);
const container = document.getElementById('root')!;
const originalSetTimeout = window.setTimeout.bind(window);
// Exercise the slow-connection state without waiting eight seconds.
window.setTimeout = ((callback: TimerHandler, ms?: number, ...args: any[]) =>
  originalSetTimeout(callback, ms === 8000 ? 100 : ms, ...args)) as typeof window.setTimeout;
const flush = async (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

async function main() {
  let completions = 0;
  const onComplete = () => { completions++; };
  await act(async () => { root.render(<InstitutionalLoader ready={false} onComplete={onComplete} />); });
  assert.match(container.textContent!, /Verifying your session/);
  assert.equal(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow'), null);
  await flush(150);
  assert.match(container.textContent!, /Taking longer than expected/);
  assert.ok(container.querySelector('button'));
  assert.equal(container.querySelector('.inst-boot')?.getAttribute('data-leaving'), 'false');
  assert.equal(completions, 0, 'unresolved auth must not dismiss the loader');
  console.log('OK   unresolved session stays visible and offers retry');

  await act(async () => { root.render(<InstitutionalLoader ready onComplete={onComplete} />); });
  assert.match(container.textContent!, /Opening the dashboard/);
  await flush(850);
  assert.equal(completions, 1);
  assert.equal(container.querySelector('.inst-boot')?.getAttribute('data-leaving'), 'true');
  console.log('OK   resolved session completes and exits');

  await act(async () => { root.render(<InstitutionalLoader ready={false} onComplete={onComplete} />); });
  await act(async () => { root.render(<InstitutionalLoader ready onComplete={onComplete} />); });
  await flush(200);
  await act(async () => { root.render(<InstitutionalLoader ready={false} onComplete={onComplete} />); });
  await flush(850);
  assert.equal(completions, 1, 'a new unresolved session cancels the exit');
  assert.equal(container.querySelector('.inst-boot')?.getAttribute('data-leaving'), 'false');
  console.log('OK   a renewed auth wait cancels the pending exit');

  const css = readFileSync('src/app/globals.css', 'utf8');
  const boot = css.slice(css.indexOf('/* Admin boot:'), css.indexOf('/* ── command-deck orb'));
  assert.match(boot, /background-color:\s*#101d35/);
  assert.doesNotMatch(boot, /var\(--forest/);
  assert.match(boot, /inst-boot-progress/);
  assert.doesNotMatch(boot, /inst-boot-vanish/);
  assert.match(boot, /prefers-reduced-motion: reduce/);
  const layout = readFileSync('src/app/dashboard/layout.tsx', 'utf8');
  assert.match(layout, /ready=\{!loading\}/);
  console.log('OK   boot background is self-contained and motion respects preferences');

  await act(async () => { root.unmount(); });
  window.setTimeout = originalSetTimeout;
  console.log('\nLOADER REGRESSIONS PASSED');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
