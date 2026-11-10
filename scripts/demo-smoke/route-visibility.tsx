import './dom';
import React, { act } from 'react';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRoot } from 'react-dom/client';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { PageTransition } from '@/components/admin/page-transition';

// Simulate a frame clock that never advances: route changes must not wait on it.
(globalThis as any).requestAnimationFrame = () => 1;
window.requestAnimationFrame = () => 1;
(globalThis as any).EventTarget = window.EventTarget;
const root = createRoot(document.getElementById('root')!);
const render = async (pathname: string, content: string) => {
  await act(async () => {
    root.render(<PathnameContext.Provider value={pathname}><PageTransition><div><section data-reveal>{content}</section></div></PageTransition></PathnameContext.Provider>);
  });
};
async function main() {
  await render('/dashboard', 'Dashboard content');
  let route = document.querySelector<HTMLElement>('.sd-route-enter');
  assert.ok(route);
  assert.ok(route.textContent?.includes('Dashboard content'));
  assert.notEqual(route.style.opacity, '0', 'whole page cannot start transparent');
  await render('/dashboard/students', 'Students content');
  route = document.querySelector<HTMLElement>('.sd-route-enter');
  assert.ok(route);
  assert.ok(route.textContent?.includes('Students content'), 'new route mounts without waiting for animation frames');
  assert.notEqual(route.style.opacity, '0');
  assert.equal(document.querySelectorAll('.sd-route-enter').length, 1);
  const css = readFileSync('src/app/globals.css', 'utf8');
  const keyframes = css.match(/@keyframes sd-route-in\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.ok(keyframes && !/opacity|visibility/.test(keyframes), 'route animation must never hide content');
  const source = readFileSync('src/components/admin/page-transition.tsx', 'utf8');
  assert.doesNotMatch(source, /opacity\s*:\s*0|<AnimatePresence/, 'reveals and route transitions cannot hide or delay the page');
  await act(async () => root.unmount());
  console.log('ROUTE VISIBILITY REGRESSIONS PASSED');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
