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
import CommunicationsPage from '@/app/dashboard/communications/page';

import { EMAIL_POLICY, buildAudience, canSendTemplate } from '@/lib/email/audience';
import { providerStatus } from '@/lib/email/provider';
import { SCHOOL, TEMPLATE_TITLES } from '@/lib/email/templates';
import { ROLE_LABEL } from '@/lib/documents/registry';
import { formatTZSCompact } from '@/lib/finance-engine';
import LoginPage from '@/app/login/page';
import LandingPage from '@/app/page';

// JSDOM has no viewport; treat rendered elements as visible for this render suite.
(globalThis as any).EventTarget = window.EventTarget;
class VisibleIntersectionObserver {
  private nodes = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) {}
  observe(node: Element) {
    this.nodes.add(node);
    queueMicrotask(() => {
      if (this.nodes.has(node)) this.callback([{ target: node, isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    });
  }
  unobserve(node: Element) { this.nodes.delete(node); }
  disconnect() { this.nodes.clear(); }
}
(globalThis as any).IntersectionObserver = VisibleIntersectionObserver;
(window as any).IntersectionObserver = VisibleIntersectionObserver;

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
  ['mail room', CommunicationsPage],
];

/**
 * JSDOM has no origin, so the mail room's `fetch('/api/notifications/email')`
 * cannot resolve. Answer it with the same payload the route builds for an
 * administrator, straight from the libraries, so the screen renders its real
 * cards rather than an error toast.
 */
const mailStatus = providerStatus();
const mailRoom = {
  provider: mailStatus.provider,
  from: mailStatus.from,
  host: mailStatus.host ?? null,
  note: mailStatus.note,
  limits: mailStatus.limits,
  copyTo: null,
  replyTo: null,
  mailbox: null,
  role: 'ADMIN',
  roleLabel: ROLE_LABEL.ADMIN,
  school: SCHOOL.name,
  templates: (Object.keys(EMAIL_POLICY) as Array<keyof typeof EMAIL_POLICY>).map((id) => {
    const audience = buildAudience(EMAIL_POLICY[id].audience).length;
    return {
      id,
      title: TEMPLATE_TITLES[id],
      audience: EMAIL_POLICY[id].audience,
      audienceSize: audience,
      sendable: Math.min(audience, mailStatus.limits.maxPerSend),
      sample: null,
      allowed: canSendTemplate('ADMIN', id),
      reason: EMAIL_POLICY[id].reason,
      roles: EMAIL_POLICY[id].roles.map((role) => ROLE_LABEL[role]),
    };
  }),
};

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url ?? '';
  if (url.includes('/api/notifications/email')) {
    return new Response(JSON.stringify(mailRoom), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
  return realFetch ? realFetch(input, init) : Promise.reject(new Error('fetch unavailable'));
}) as typeof fetch;

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
  const rendered: Record<string, string> = {};

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
      rendered[name] = text;
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
    const missing = ['One school day', 'every shilling', 'Six periods', 'Documents', 'PDPA'].filter(
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

  // ---------------------------------------------------------------------
  // KPI FIT — a number the bursar cannot read is a number that does not
  // exist. Compact money in the tiles, the exact figure alongside it, and
  // never a tile whose value has to be clipped with an ellipsis.
  // ---------------------------------------------------------------------
  console.log('\nKPI FIT');
  const compactChecks: Array<[string, boolean, string]> = [];
  // No \b after the suffix: adjacent DOM nodes concatenate without a space,
  // so "TZS 6.37M" is followed directly by the exact "TZS 6,370,000".
  const compactToken = /TZS -?\d+(?:\.\d+)?[KMB]/;
  const financeText = rendered.finance || '';
  const dashboardText = rendered.dashboard || '';

  compactChecks.push([
    'finance tiles carry compact money',
    compactToken.test(financeText),
    (financeText.match(compactToken) || ['(none)'])[0],
  ]);
  compactChecks.push([
    'dashboard tiles carry compact money',
    compactToken.test(dashboardText),
    (dashboardText.match(compactToken) || ['(none)'])[0],
  ]);
  const exactInFinance = /TZS \d{1,3}(?:,\d{3}){2,}/.test(financeText);
  compactChecks.push([
    'finance still exposes the exact figure',
    exactInFinance,
    (financeText.match(/TZS \d{1,3}(?:,\d{3}){2,}/) || ['(none)'])[0],
  ]);
  const ellipsis = /TZS\s?[\d.,]*\u2026|\u2026\s*$/;
  compactChecks.push([
    'no KPI money token is ellipsised',
    !ellipsis.test(financeText) && !ellipsis.test(dashboardText),
    ellipsis.test(financeText) || ellipsis.test(dashboardText) ? 'found a clipped amount' : 'clean',
  ]);

  const scaleCases: Array<[number, string]> = [
    [6094000, 'TZS 6.09M'],
    [19743000, 'TZS 19.7M'],
    [984000000, 'TZS 984M'],
    [1250000000, 'TZS 1.25B'],
    [19500, 'TZS 19.5K'],
    [950, 'TZS 950'],
    [-4500, 'TZS -4.5K'],
  ];
  for (const [amount, expected] of scaleCases) {
    const actual = formatTZSCompact(amount);
    compactChecks.push([
      `compact ${amount.toLocaleString('en-US')}`,
      actual === expected,
      actual,
    ]);
  }

  // The register must offer the folder import, and it must be the same screen
  // that already knows the photo policy (the button is disabled, not hidden,
  // when PHOTO_POLICY=none).
  const studentsText = rendered.students || '';
  compactChecks.push([
    'register offers the bulk photo import',
    /Import photos/.test(studentsText),
    /Import photos/.test(studentsText) ? 'button present' : 'missing',
  ]);

  for (const [label, ok, note] of compactChecks) {
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label.padEnd(42)} ${note}`);
  }

  console.log(failures === 0 ? '\nALL PAGES RENDERED CLEANLY' : `\n${failures} PAGE(S) HAD ISSUES`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('HARNESS FAILURE', error);
  process.exit(1);
});
