import './dom';
import React, { act } from 'react';
import assert from 'node:assert/strict';
import { createRoot } from 'react-dom/client';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import StudentsPage from '@/app/dashboard/students/page';
import { doc, setDoc } from 'firebase/firestore';

(globalThis as any).EventTarget = window.EventTarget;
const services = initializeFirebase();
const root = createRoot(document.getElementById('root')!);
const flush = async (ms = 100) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const click = async (element: Element) => { await act(async () => { (element as HTMLElement).click(); }); await flush(); };
const button = (text: string) => Array.from(document.querySelectorAll('button')).find(el => el.textContent?.trim() === text);
const openDialog = () => document.querySelector('[role="dialog"][data-state="open"]');

async function main() {
  await act(async () => root.render(<FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}><StudentsPage /></FirebaseProvider>));
  await flush(400);
  await act(async () => {
    const base = { class: 'Form 1', type: 'Day', gender: 'Female', status: 'Active', guardianPhone: '' };
    await setDoc(doc(services.firestore, 'schools', 'school-001', 'students', 'TEST-ZERO'), { ...base, id: 'TEST-ZERO', name: 'TEST ZERO', conductPoints: 0 });
    await setDoc(doc(services.firestore, 'schools', 'school-001', 'students', 'TEST-MISSING'), { ...base, id: 'TEST-MISSING', name: 'TEST MISSING' });
  });
  await flush();
  for (const [id, expected] of [['TEST-ZERO', '0'], ['TEST-MISSING', 'No conduct score recorded']]) {
    const row = Array.from(document.querySelectorAll('tr[role="button"]')).find(el => el.textContent?.includes(id));
    assert.ok(row, `${id} is listed`);
    await click(row);
    const tab = button('Merit');
    assert.ok(tab);
    await act(async () => { tab.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 })); });
    await flush();
    assert.ok(openDialog()?.textContent?.includes(expected), `${id} shows ${expected}`);
    const close = button('Close');
    assert.ok(close);
    await click(close);
    assert.equal(openDialog(), null);
  }
  const rows = Array.from(document.querySelectorAll('tr[role="button"]')) as HTMLElement[];
  assert.ok(rows.length >= 2, 'demo register has students');
  await click(rows[0]);
  assert.ok(openDialog(), 'click opens profile');
  const score = rows[0].querySelectorAll('td')[3].textContent?.trim();
  const merit = button('Merit');
  assert.ok(merit, 'Merit tab exists');
  // Radix tabs select on pointer down.
  await act(async () => { merit.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 })); });
  await flush();
  assert.equal(merit.getAttribute('data-state'), 'active');
  assert.ok(openDialog()?.textContent?.includes('Conduct points'));
  assert.ok(openDialog()?.textContent?.includes(score === 'Not recorded' ? 'No conduct score recorded' : score!.replace(' PTS', '')), 'profile reflects recorded score');
  const close = button('Close');
  assert.ok(close, 'top close button exists');
  await click(close);
  assert.equal(openDialog(), null, 'top close does not reopen the row');
  await act(async () => { rows[1].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  await flush();
  assert.ok(openDialog(), 'keyboard opens another student');
  assert.ok(openDialog()?.textContent?.includes(rows[1].querySelector('td')?.textContent?.trim().split(/\s+/)[0] || ''));
  const footerClose = button('Close student details');
  assert.ok(footerClose);
  await click(footerClose);
  assert.equal(openDialog(), null, 'footer close works');
  await click(rows[0]);
  await act(async () => { document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
  await flush();
  assert.equal(openDialog(), null, 'Escape closes profile');
  await act(async () => root.unmount());
  console.log('STUDENT DETAILS REGRESSIONS PASSED');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
