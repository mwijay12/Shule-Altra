import './dom';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';

import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

import DashboardPage from '@/app/dashboard/page';
import StudentsPage from '@/app/dashboard/students/page';
import AcademicsPage from '@/app/dashboard/academics/page';
import FinancePage from '@/app/dashboard/finance/page';
import AttendancePage from '@/app/dashboard/attendance/page';
import AssetsPage from '@/app/dashboard/assets/page';
import CanteenPage from '@/app/dashboard/canteen/page';
import HostelPage from '@/app/dashboard/hostel/page';
import ReportsPage from '@/app/dashboard/reports/page';
import SettingsPage from '@/app/dashboard/settings/page';
import StaffPage from '@/app/dashboard/staff/page';
import TimetablePage from '@/app/dashboard/timetable/page';
import TransportPage from '@/app/dashboard/transport/page';
import HelpPage from '@/app/dashboard/help/page';
import AnalyticsPage from '@/app/dashboard/analytics/page';
import LoginPage from '@/app/login/page';
import LandingPage from '@/app/page';

const services = initializeFirebase();

// Minimal Next.js app-router context so next/navigation hooks resolve in JSDOM
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

const router = {
  push: () => undefined,
  replace: () => undefined,
  refresh: () => undefined,
  back: () => undefined,
  forward: () => undefined,
  prefetch: () => undefined,
  bfcacheId: 'demo',
};

const PAGES: Array<[string, React.ComponentType]> = [
  ['dashboard', DashboardPage],
  ['students', StudentsPage],
  ['academics', AcademicsPage],
  ['finance', FinancePage],
  ['attendance', AttendancePage],
  ['assets', AssetsPage],
  ['canteen', CanteenPage],
  ['hostel', HostelPage],
  ['reports', ReportsPage],
  ['settings', SettingsPage],
  ['staff', StaffPage],
  ['timetable', TimetablePage],
  ['transport', TransportPage],
  ['help', HelpPage],
  ['analytics', AnalyticsPage],
];

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterContext.Provider value={router as any}>
      <SearchParamsContext.Provider value={new URLSearchParams()}>
        <PathnameContext.Provider value="/dashboard">
        <FirebaseProvider
          firebaseApp={services.firebaseApp}
          auth={services.auth}
          firestore={services.firestore}
        >
          {children}
        </FirebaseProvider>
      </PathnameContext.Provider>
      </SearchParamsContext.Provider>
    </AppRouterContext.Provider>
  );
}

async function main() {
  await signInWithEmailAndPassword(services.auth as any, 'admin@shule.pro', 'demo2026');

  const container = document.getElementById('root')!;
  const root = createRoot(container);

  let failures = 0;

  for (const [name, Page] of PAGES) {
    const errors: string[] = [];
    const originalError = console.error;
    const originalWarn = console.warn;
    console.error = (...args: any[]) => {
      errors.push(args.map(String).join(' '));
    };
    console.warn = (...args: any[]) => {
      const message = args.map(String).join(' ');
      if (!/act\(/.test(message)) errors.push('WARN: ' + message);
    };

    try {
      await act(async () => {
        root.render(
          <Wrapper>
            <Page />
          </Wrapper>
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      });
      // Second settle window so GSAP/RAF-driven reveals and KPI count-ups land.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1400));
      });
      const text = container.textContent || '';
      const significant = errors.filter(
        (e) =>
          !/not wrapped in act|Invalid DOM property|Each child in a list|validateDOMNesting|Received `true` for a non-boolean|Cannot update a component|findDOMNode|of chart should be greater than 0/i.test(e)
      );
      const status = significant.length === 0 ? 'OK  ' : 'FAIL';
      if (significant.length > 0) failures += 1;
      console.log(`${status} ${name.padEnd(11)} html:${String(text.length).padStart(6)} chars  ${significant.slice(0, 2).join(' | ').slice(0, 240)}`);
      console.log('   text>', text.replace(/\s+/g, ' ').slice(0, 320));
    } catch (error: any) {
      failures += 1;
      console.log(`FAIL ${name.padEnd(11)} THREW: ${error?.message}`);
      const inner = Array.isArray(error?.errors) ? error.errors : [];
      if (inner.length > 0) {
        inner.slice(0, 3).forEach((e: any, i: number) => {
          console.log(`  [inner ${i}]`, e?.message);
          console.log(String(e?.stack || '').split('\n').slice(0, 8).join('\n'));
        });
      } else {
        console.log(String(error?.stack || error).split('\n').slice(0, 12).join('\n'));
      }
    } finally {
      console.error = originalError;
      console.warn = originalWarn;
    }
  }

  // login page (no session assertions, just render)
  try {
    await act(async () => {
      root.render(
        <Wrapper>
          <LoginPage />
        </Wrapper>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    console.log(`OK   login       html:${String((container.textContent || '').length).padStart(6)} chars`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL login THREW: ${error?.message}`);
  }

  await act(async () => {
    root.unmount();
  });
  // public landing page (public route, no session, fresh root)
  const landingRoot = createRoot(container);
  try {
    await act(async () => {
      landingRoot.render(
        <Wrapper>
          <LandingPage />
        </Wrapper>
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1700));
    });
    const text = String(container.textContent || '');
    const missing = ['Every register', 'on record', 'The index', 'Documents'].filter(
      (needle) => !text.toLowerCase().includes(needle.toLowerCase())
    );
    if (missing.length > 0) throw new Error(`landing missing copy: ${missing.join(', ')}`);
    console.log(`OK   landing     html:${String(text.length).padStart(6)} chars`);
  } catch (error: any) {
    failures += 1;
    console.log(`FAIL landing THREW: ${error?.message}`);
  } finally {
    await act(async () => {
      landingRoot.unmount();
    });
  }

  console.log(failures === 0 ? '\nALL PAGES RENDERED CLEANLY' : `\n${failures} PAGE(S) HAD ISSUES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('HARNESS FAILURE', error);
  process.exit(1);
});
