import './dom';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import assert from 'node:assert/strict';

import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

import { buildDemoDataset, DEMO_SCHEMA_VERSION } from '@/lib/demo/seed-data';
import { O_LEVEL_CLASSES, DEFAULT_CLASS, classOptions, isOLevelClass } from '@/lib/academics/config';
import { oLevelStudentSchema } from '@/lib/validations/student';
import { TIMETABLE_CLASSES, buildTimetable } from '@/lib/timetable';
import { readDocument, readCollection, resetDemoDatabase } from '@/lib/demo/store';
import StudentsPage from '@/app/dashboard/students/page';
import AcademicsPage from '@/app/dashboard/academics/page';
import SettingsPage from '@/app/dashboard/settings/page';

let failures = 0;
function check(label: string, run: () => void) {
  try {
    run();
    console.log(`OK   ${label}`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL ${label}: ${String(error?.message).slice(0, 240)}`);
  }
}

const dataset = buildDemoDataset();
const entries = Object.entries(dataset);
const students = entries.filter(([path]) => path.includes('/students/')).map(([, data]) => data);
const byId = new Map(students.map((student) => [student.id, student]));
const named = byId.get('ALT-2026-005')!;

check('demo schema retires the mixed-level and jargon-copy caches', () => assert.ok(DEMO_SCHEMA_VERSION >= 6));
check('registry has 150 O-level learners only', () => {
  assert.equal(students.length, 150);
  assert.ok(students.every((student) => isOLevelClass(student.class)));
  assert.deepEqual([...new Set(students.map((student) => student.class))].sort(), [...O_LEVEL_CLASSES].sort());
});
check('named learner is Form 1 with matching secondary fees', () => {
  assert.equal(named.name, 'AUGUSTINO CASTRO SWAI');
  assert.equal(named.class, 'Form 1');
  assert.equal(named.totalFeesExpected, 450_000);
  assert.equal(named.totalPaid + named.balance, named.totalFeesExpected);
  assert.ok(String(named.photoUrl).startsWith('data:image/svg+xml'));
});
check('identity and school node agree on O-level', () => {
  const identity = dataset['schools/school-001/config/identity'];
  const school = dataset['schools/school-001'];
  assert.deepEqual(identity.tiers, [...O_LEVEL_CLASSES]);
  assert.equal(identity.academicLevel, 'O-Level');
  assert.equal(identity.type, 'secondary');
  assert.equal(school.academicLevel, 'O-Level');
  assert.equal(school.type, 'secondary');
});
check('grades and attendance belong to the learner’s actual class', () => {
  for (const [path, row] of entries) {
    if (!path.includes('/grades/') && !path.includes('/attendance/')) continue;
    const student = byId.get(row.studentId);
    assert.ok(student, `${path} has a registered learner`);
    assert.equal(row.class, student.class, `${path} class matches registry`);
  }
});
check('route payloads equal assigned day learners', () => {
  const routes = entries.filter(([path]) => path.includes('/routes/')).map(([, data]) => data);
  const day = students.filter((student) => student.type === 'Day');
  assert.equal(routes.reduce((sum, route) => sum + route.students, 0), day.length);
  for (const route of routes) {
    assert.equal(route.students, day.filter((student) => student.route === route.name).length);
    assert.ok(route.students <= route.capacity);
  }
});
check('every boarder is assigned to an existing hostel within capacity', () => {
  const hostels = entries.filter(([path]) => path.includes('/hostels/')).map(([, data]) => data);
  const boarders = students.filter((student) => student.type === 'Boarder');
  assert.ok(boarders.every((student) => hostels.some((hostel) => hostel.name === student.hostel)));
  for (const hostel of hostels) {
    assert.ok(boarders.filter((student) => student.hostel === hostel.name).length <= hostel.capacity);
  }
});
check('class options recover from old mixed configuration', () => {
  assert.deepEqual(classOptions(['Standard 7', 'Form 2'], { oLevelOnly: true }), ['Form 2']);
  assert.deepEqual(classOptions(['Standard 7'], { oLevelOnly: true }), [...O_LEVEL_CLASSES]);
  assert.deepEqual(classOptions(['Standard 7', 'Form 2']), ['Standard 7', 'Form 2']);
});
check('demo admission validation rejects primary and A-level', () => {
  const base = { id: 'ALT-TEST-001', name: 'Test Learner', type: 'Day', gender: 'Male', dateOfBirth: '2013-01-01', guardianName: 'Guardian Name', guardianPhone: '0712345678' };
  assert.equal(oLevelStudentSchema.safeParse({ ...base, class: 'Standard 7' }).success, false);
  assert.equal(oLevelStudentSchema.safeParse({ ...base, class: 'Form 5' }).success, false);
  assert.equal(oLevelStudentSchema.safeParse({ ...base, class: DEFAULT_CLASS }).success, true);
});
check('timetable offers exactly the same Form 1–4 classes', () => {
  assert.deepEqual(TIMETABLE_CLASSES, O_LEVEL_CLASSES);
  for (const className of O_LEVEL_CLASSES) {
    const timetable = buildTimetable(className, 'A', { term: 'Term 2'});
    assert.equal(timetable.className, className);
    assert.ok(timetable.grid.flat().some((slot) => slot?.subject === 'Physics'));
  }
});
check('learner registry is deterministic across rebuilds', () => {
  const rebuilt = buildDemoDataset();
  const registry = (data: Record<string, any>) => Object.entries(data)
    .filter(([path]) => path.includes('/students/'))
    .map(([path, row]) => [path, row.name, row.class, row.gender, row.dateOfBirth, row.totalFeesExpected, row.totalPaid, row.balance]);
  assert.deepEqual(registry(rebuilt), registry(dataset));
});

// A browser holding v4 must not keep seeing Standard 7 after this release.
localStorage.setItem('shule-altra.demo.schema', '4');
localStorage.setItem('shule-altra.demo.db.v2', JSON.stringify({
  'schools/school-001/students/ALT-2026-005': { id: 'ALT-2026-005', name: 'AUGUSTINO CASTRO SWAI', class: 'Standard 7' },
}));
check('stale localStorage is reseeded as O-level', () => {
  assert.equal(readDocument('schools/school-001/students/ALT-2026-005')?.class, 'Form 1');
  assert.equal(readCollection('schools/school-001/students').length, 150);
});

const services = initializeFirebase();
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterContext.Provider value={router as any}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <PathnameContext.Provider value="/dashboard">
          <FirebaseProvider firebaseApp={services.firebaseApp} auth={services.auth} firestore={services.firestore}>
            {children}
          </FirebaseProvider>
        </PathnameContext.Provider>
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>
  );
}
const flush = async (ms = 250) => {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
};
function button(text: string) {
  const found = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim().includes(text));
  assert.ok(found, `button ${text} exists`);
  return found as HTMLButtonElement;
}
async function click(node: Element) {
  await act(async () => {
    node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await flush(350);
}
async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await flush(1200);
}

async function main() {
  resetDemoDatabase();
  await signInWithEmailAndPassword(services.auth as any, 'admin@shule.pro', 'demo2026');
  const container = document.getElementById('root')!;
  const root = createRoot(container);
  const render = async (Page: React.ComponentType) => {
    await act(async () => { root.render(<Wrapper><Page /></Wrapper>); });
    await flush(1600);
  };

  await render(StudentsPage);
  check('register shows the O-level scope and named Form 1 learner', () => {
    assert.match(container.textContent || '', /O-Level · Form 1–4/);
    assert.match(container.textContent || '', /AUGUSTINO CASTRO SWAI/);
    assert.doesNotMatch(container.textContent || '', /Standard\s*[1-7]/);
  });
  await click(button('Enroll Student'));
  check('manual enrollment defaults to Form 1 and offers no primary tier', () => {
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.match(dialog.textContent || '', /Form 1 selected by default/);
    const trigger = [...dialog.querySelectorAll('[role="combobox"]')].find((node) => node.textContent?.includes('Form 1'));
    assert.ok(trigger, 'class selector shows Form 1');
  });
  await act(async () => { root.unmount(); });

  const academicsRoot = createRoot(container);
  await act(async () => { academicsRoot.render(<Wrapper><AcademicsPage /></Wrapper>); });
  await flush(1600);
  const search = document.querySelector('input[placeholder="Find candidate..."]') as HTMLInputElement;
  check('academics search input exists', () => assert.ok(search));
  await type(search, 'ALT-2026-005');
  check('admission-ID search cannot bypass the active Form 4 filter', () => {
    assert.match(container.textContent || '', /Form 4 · 0 Candidates/);
    assert.doesNotMatch(container.textContent || '', /AUGUSTINO CASTRO SWAI/);
  });
  await type(search, '');
  check('clearing search restores the active class roster', () => {
    assert.match(container.textContent || '', /Form 4 · 38 Candidates/);
  });
  await act(async () => { academicsRoot.unmount(); });

  const settingsRoot = createRoot(container);
  await act(async () => { settingsRoot.render(<Wrapper><SettingsPage /></Wrapper>); });
  await flush(500);
  const tierTab = button('Tier Config');
  await act(async () => {
    tierTab.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    tierTab.click();
  });
  await flush(350);
  check('settings academic tab offers Form 1–4 only in demo', () => {
    const text = container.textContent || '';
    assert.match(text, /O-Level academic tiers/);
    for (const className of O_LEVEL_CLASSES) assert.ok(text.includes(className));
    assert.doesNotMatch(text, /Standard\s*[1-7]|Form\s*[56]/);
  });
  await act(async () => { settingsRoot.unmount(); });

  console.log(failures === 0 ? '\nO-LEVEL REGRESSIONS PASSED' : `\n${failures} O-LEVEL REGRESSION(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error(error); process.exit(1); });
