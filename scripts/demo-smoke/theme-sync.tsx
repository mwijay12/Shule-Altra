import './dom';
import React, { act } from 'react';
import assert from 'node:assert/strict';
import { createRoot } from 'react-dom/client';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { ThemeProvider, useTheme } from '@/components/admin/theme-provider';
import { SchoolBrandProvider } from '@/components/admin/brand-provider';
import ThemeStudioPage from '@/app/dashboard/theme-studio/page';

(globalThis as any).EventTarget = window.EventTarget;
const services = initializeFirebase();
const root = createRoot(document.getElementById('root')!);
const branding = doc(services.firestore, 'schools', 'school-001', 'config', 'branding');
let a: ReturnType<typeof useTheme>;
let b: ReturnType<typeof useTheme>;
function Probe({ id }: { id: 'a' | 'b' }) { const theme = useTheme(); if (id === 'a') a = theme; else b = theme; return null; }
const flush = async (ms = 200) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
async function main() {
  await act(async () => { await setDoc(branding, { paletteId: 'emerald', fontId: 'inter' }); });
  await act(async () => root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}>
    <ThemeProvider><Probe id="a" /></ThemeProvider><ThemeProvider><Probe id="b" /></ThemeProvider>
  </FirebaseProvider>));
  await flush();
  assert.ok(a.brandingReady && b.brandingReady);
  assert.equal(a.paletteId, 'emerald'); assert.equal(b.paletteId, 'emerald');
  await act(async () => a.setPaletteId('crimson'));
  await flush();
  assert.equal(a.fontId, 'inter', 'palette preview must not reset published font');
  assert.equal(b.paletteId, 'emerald', 'unpublished choice is not shared');
  await act(async () => { await setDoc(branding, { paletteId: 'crimson' }, { merge: true }); });
  await flush();
  assert.equal(a.paletteId, 'crimson'); assert.equal(b.paletteId, 'crimson');
  assert.equal(a.fontId, 'inter'); assert.equal(b.fontId, 'inter');
  await act(async () => b.setTheme('dark'));
  await act(async () => { await setDoc(branding, { paletteId: 'plum', fontId: 'editorial' }, { merge: true }); });
  await flush();
  assert.equal(a.paletteId, 'plum'); assert.equal(b.paletteId, 'plum');
  assert.equal(b.theme, 'dark', 'personal light/dark preference remains local');
  await act(async () => { await signInWithEmailAndPassword(services.auth as any, 'admin@shule.pro', 'demo2026'); });
  await act(async () => root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}><ThemeProvider><SchoolBrandProvider><ThemeStudioPage /></SchoolBrandProvider></ThemeProvider></FirebaseProvider>));
  await flush(400);
  const palette = document.querySelector<HTMLButtonElement>('button[aria-label="Use the Green & Gold palette"]');
  assert.ok(palette && !palette.disabled, 'administrator can choose a palette');
  assert.ok(document.body.textContent?.includes('Demo mode stores changes on this browser only'), 'demo must not promise cross-device sync');
  await act(async () => palette.click()); await flush(400);
  assert.equal((await getDoc(branding)).data()?.paletteId, 'emerald', 'choosing palette saves without separate publish click');
  assert.equal((await getDoc(branding)).data()?.fontId, 'editorial', 'palette change preserves font');
  await act(async () => root.unmount());
  console.log('THEME SYNCHRONISATION REGRESSIONS PASSED');
  process.exit(0);
}
main().catch(error => { console.error(error); process.exit(1); });
