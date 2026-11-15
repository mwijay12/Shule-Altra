# Shule Altra — critical review, 15 Nov 2026

Scope: the web product on `main` (`c4c1151`) **and** the Flutter work that was announced but
never landed. Written from a clean checkout, with `npm ci`, `tsc --noEmit`, `demo:build`,
`NEXT_PUBLIC_DEMO_MODE=false npm run build`, `demo:reports` and `demo:smoke:*` actually run.

What I could **not** test, and therefore do not claim: Firebase live project, Firestore
emulator (no Java here), any real device, any APK.

---

## 0. The most important finding: the mobile work is not in the product

`mobile/`, `docs/mobile-apk-plan.md`, `docs/creative-web-references.md` and
`.github/workflows/mobile-preview.yml` exist **only** on branch
`arena/2269a5ce-shuledirect-pro` (`e6eab48`), which has **no pull request**, and `main` does not
contain a single `mobile/` file.

So "APK ya prototype imejengwa" is true only as a CI artifact of a branch nobody merged. Every
subsequent APK, and the read-only Firebase path added to it, is stranded outside the product.
That is the first thing to fix — before more mobile features.

---

## 1. P0 — a document that is quietly wrong (reproduced)

`students` documents store the class in **`class`** (`src/types/student.ts:5`, the enrolment form
`src/lib/validations/student.ts:10`, `firestore.rules` grade checks, the seed
`src/lib/demo/seed-data.ts:262`). But several readers ask for **`className`**, and two of them
have no `class` fallback:

| file:line | read |
| --- | --- |
| `src/lib/reports/builders.ts:70` | `className: learner.className ?? 'Unassigned'` — no fallback |
| `src/app/dashboard/analytics/page.tsx:103` | `learner.className ?? 'Unassigned'` |
| `src/app/dashboard/analytics/page.tsx:215` | same |
| `src/lib/pdf/fee-statement.ts:83` | `student.className ?? 'Unassigned'` |
| `src/components/admin/command-palette.tsx:75` | `student.className ?? 'Unassigned'` |
| `src/lib/pdf/fee-statement.ts:84` | `student.parentName ?? 'On file'` — the field is `guardianName` |

Measured, not inferred — the demo dataset pushed through the real builder:

```
learners 150   attendance rows 900
rows labelled "Unassigned": 150 / 150
```

Consequences on the demo (and identically on a live school):

* **Student Attendance Register PDF** — the `Class` column is blank for every learner.
* **Analytics** — the whole class-performance table collapses into one row called *Unassigned*.
* **Fee statement PDF** — `Class / stream: Unassigned`, `Guardian: On file` even though the
  guardian name is on the record.
* **Command palette** — every learner shows "Unassigned".
* `buildAttendanceRows` also computes `present/total` from an `attendance` **collection that no
  screen ever writes to** (`src/app/dashboard/attendance/page.tsx:75` only patches
  `students.attendanceStatus`). So the register prints 0/0 for live data while the demo prints
  6 days of seeded rows. Two different products under one button.

`npm run demo:reports` passes because it feeds the *seed* shape, not the *stored* shape. This is
the failure mode the project is otherwise good at avoiding: a signed PDF that is confidently wrong.

Fix: one `learnerClass(learner)` / `guardianName(learner)` normaliser used everywhere, plus a test
that builds the attendance register from `buildDemoDataset()` and asserts real class names — not
from a hand-written fixture.

---

## 2. P0 — the money ledger is freely rewritable (rules)

```
firestore.rules:193-195   match /transactions/{id} { allow read, write: if money(); }
firestore.rules:246-248   match /petty_cash/{id}   { allow read, write: if money(); }
firestore.rules:249-251   match /canteen_sales/{id}{ allow read, write: if money(); }
```

`money()` = ADMIN, BURSAR, ACCOUNTANT. So a bursar or accountant can **update or delete a
verified payment** with no shape check, no `recordedByUid` binding, and no audit entry — while
expenses (`expense_entries`) are append-only with a void marker, and the audit trail is
deliberately immutable. Two contradictory policies for the same money.

And the learner record is worse, because it is the other half of every payment:

```
firestore.rules:122-125
allow update: if inRole(['ADMIN'])
  || (learning() && !affects('status','statusUpdatedAt','class'))
  || (money() && hasOnly('totalPaid','balance','lastPaymentDate','paymentStatus'))
```

`learning()` = ADMIN **or TEACHER**. A teacher may therefore rewrite `totalPaid`, `balance`,
`guardianPhone`, `guardianEmail`, `conductPoints` and `photoUrl` — anything except status and
class. The earlier claim that "teachers can only record marks" does not hold at the rule level.
`allow create: if learning()` is likewise unvalidated.

This is the one item I would not ship a pilot on.

## 3. P0 — a Google account with no staff record becomes a "Viewer" session

`src/lib/auth/verify-session.ts:88` — missing staff document ⇒ `{ role: 'VIEWER' }` instead of a
refusal. The signed cookie is then issued (`src/app/api/session/route.ts:61`) and every server
route that only checks *"is there a role?"* lets it through. `GET /api/notifications/email`
(`src/app/api/notifications/email/route.ts:66-72`) is one of them: a stranger with a Google
account can read the school name, the template list, the guardian audience counts and a **sample
guardian e-mail address** (`:86`).

Firestore data itself is still protected (`inRole` requires `exists(staffPath())`), so this is a
server-route leak, not a register leak — but it is a leak, and it was described as fixed.

Also in this group:

* `DEMO_MODE` defaults **on** (`src/lib/demo/config.ts:7`, `env !== 'false'`). A live deployment
  that forgets one env var silently becomes the invented school, and
  `src/lib/session.ts:55` then signs cookies with a public demo secret. Default-closed is the
  correct posture for a product that will hold learner PII.
* Vercel project `shule-altra-demo` currently has `NEXT_PUBLIC_DEMO_MODE=true` and **no**
  `SESSION_SECRET` and **no** `NEXT_PUBLIC_FIREBASE_CONFIG`. Production is a demo-only build.
* `.firebaserc` points at `studio-2181801796-1fa72`, while the app falls back to
  `studio-9420247393-c051b` (`src/firebase/config.ts:28`) and `docs/FIREBASE.md` uses the latter.
  `npm run firebase:rules` therefore deploys rules to a **different project** than the one the app
  reads. This is exactly how "rules zime-deploywa" becomes false.

## 4. P1 — the permission model is a menu, not a policy

* `canAccess()` **fails open** for unknown modules (`src/hooks/use-auth.ts:246-248`).
* The route guard reads `pathname.split('/')[2]` (`src/app/dashboard/layout.tsx:40`), so
  `/dashboard/theme-studio` yields `theme-studio`, which is not the `themeStudio` key in
  `ACCESS_MATRIX` — it falls into the fail-open branch. Theme Studio has a second check in the
  page (`theme-studio/page.tsx:144`), so it holds by accident, not by design.
* Sidebar hiding is correctly documented as presentation only. Permissions that a school can edit
  (per-module grants) still do not exist anywhere: role → module is a hard-coded client matrix plus
  a role list in rules. Any custom split ("this accountant may not see hostel") requires code.

## 5. P1 — tests that pass without testing the product

* 13 smoke scripts assert on **source text** via `readFileSync`. The clearest case:
  `scripts/demo-smoke/perf.ts:83-115` asserts that `src/components/admin/three-orb.tsx` contains
  `FRAME_MS`, an `IntersectionObserver`, an antialias flag and a pixel-ratio cap. `three-orb.tsx`
  is **imported by nothing** in `src/`. A green "frame budget" step therefore proves the frame
  budget of a component that is not on any page. Same pattern for `motion`, `brand`, `loader`,
  `copy`, `trust`.
* Verified as dead (no importer anywhere): `components/admin/three-orb.tsx`,
  `components/dashboard/app-sidebar.tsx`, `components/landing/{day-narrative,index-list,ledger-panel}.tsx`,
  `components/ui/{animated-content,feature-carousel,marquee-effect,scroll-reveal,staggered-menu,calendar,carousel,collapsible,menubar,popover,radio-group,scroll-area,slider}.tsx`,
  `lib/{migration-utils,ocr-engine,placeholder-images}.ts`, `hooks/{use-student-search,use-syllabus}.ts`,
  `lib/seed/generate-demo-data.ts`. `app-sidebar.tsx` duplicates `admin/sidebar.tsx`.
  `tailwing.config.ts` is a misspelled duplicate of `tailwind.config.ts` that nothing loads.
* `npm run lint` cannot run: no ESLint dependency and no config; `next lint` asks interactively.
  `next.config.ts:55,58` sets `ignoreBuildErrors`/`ignoreDuringBuilds: true`. `tsc --noEmit` in CI
  is the only real type gate and it does pass.
* `npm run demo:reports` rewrites `private/printables/reports/*.pdf` in the working tree, so any
  smoke run leaves ten modified binaries. (I reverted them.)

## 6. P1 — unbounded reads on the two biggest collections

`src/app/dashboard/page.tsx:64,70` subscribe to **all** students and **all** transactions with no
`limit()`. `reports/page.tsx:95` does the same for students. Fine at 150 learners and 140
transactions; on a school with eight years of ledger it is a per-page-load cost and latency
problem, and it is the first thing a real customer will feel.

## 7. The Flutter app: the honest state

Verified on branch `arena/2269a5ce-shuledirect-pro`:

* Single commit, no PR. `flutter analyze`, `flutter test` and the debug APK build did pass in CI —
  that part is real.
* **The APK cannot sign anyone in.** CI generates Android from the stock template and only patches
  minSdk 23, NDK 27, INTERNET and `allowBackup=false` (`tool/configure_android.py`). There is no
  `google-services.json`, no `firebase_options.dart`, and no `--dart-define` in
  `.github/workflows/mobile-preview.yml`. Every artifact therefore boots into the
  "Configuration required" screen by construction.
* **The sign-in call itself is the wrong API for Flutter native.** `lib/live_school.dart:55` uses
  `auth.signInWithProvider(GoogleAuthProvider())`. Firebase's own Flutter federated-auth guide says
  that on native platforms Google needs the `google_sign_in` plugin to obtain an ID token and then
  `GoogleAuthProvider.credential(idToken:)` + `signInWithCredential`; `google_sign_in` is not in
  `pubspec.yaml`. Treat the live path as unproven and rewrite it rather than debug it on device.
* Contradiction inside the app: the More tab still says *"No Firebase project or school account is
  connected to this prototype"* (`lib/main.dart:193`) while the app now ships a connect flow.
* No offline store, queue, conflict handling or idempotency — correctly stated, and correctly out
  of scope until the read-only pilot is trustworthy.
* Missing for a real delivery: `pubspec.lock` not committed, no `analysis_options.yaml`, no
  Kiswahili localisation (the web product is bilingual; the app is English only), onboarding state
  resets on restart, no accessibility pass (large text, TalkBack, reduced motion is honoured on one
  widget only).

## 8. What is genuinely solid (so it does not get "fixed" away)

* The signed session cookie: HMAC over role/uid/iat/exp/abs, timing-safe compare, 30-minute idle
  window with an 8-hour absolute cap, fail-closed on a misconfigured secret
  (`src/lib/session.ts`).
* Server-side role revalidation on every gated request (`src/lib/auth/server-session.ts`,
  `revalidate-session.ts`) with mocked-Firebase tests that do exercise the real resolver.
* Rules shape: composite grade IDs, teacher-assignment existence checks, append-only
  `audit`/`gradeCorrections`/`expense_voids`/`staffRoleChanges`, supplier revision CAS.
* Expense voids: marked, not deleted; excluded from totals and CSV.
* `public/printables` moved behind a registry with role checks and a path-traversal guard.
* ClickPesa webhook: HMAC over the raw body, replay-safe transaction re-read.

---

## 9. Recommended order of work

**Track A — web, before anything else is called "complete"**

1. `class`/`className` + `guardianName`/`parentName` normaliser, five call sites, and a data-flow
   test built on `buildDemoDataset()`. *(small, high value)*
2. Rules: `transactions`/`petty_cash`/`canteen_sales` append-only, no delete, no free update;
   `students` update split into explicit per-role field whitelists so a teacher cannot touch money.
   Emulator tests for each. *(medium; the one that matters)*
3. Session: no staff record ⇒ no session; every server route names the roles it accepts;
   `DEMO_MODE` explicit opt-in. Align `.firebaserc` with the app's project. *(small)*
4. Permission model v1: a `config/permissions` document read by one shared resolver used by the
   layout guard, the sidebar and a rules helper — replacing the hard-coded matrix and the
   fail-open default.

**Track B — mobile, in this order**

5. Land what exists (PR from the mobile branch), then decide package id + `google-services.json`
   path + debug SHA-1, and pass the Firebase values to CI as `--dart-define`. Until that is done
   there is no clickable demo.
6. Rewrite Google sign-in with `google_sign_in`; verify on one real phone against a non-sensitive
   account, and record what was observed.
7. Only then: offline capture for one low-risk flow (attendance), with local IDs and a visible
   queued/sent/rejected state. Not before login and read are proven.

**Track C — polish/parity, when A and B are trustworthy**

8. Bounded queries + pagination on dashboard/reports; attendance history as a dated collection;
   expense receipts; SMS; NECTA export; then Tauri.

I would do 1 and 3 first: they are hours of work and they remove a wrong PDF and an open door.
Item 2 is the one to be careful with — it needs emulator runs, which this environment cannot do
(no Java), so it has to be done where the emulator can actually start.
