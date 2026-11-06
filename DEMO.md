# 🎬 Shule Altra — Live Demo Guide

This branch turns the repository into a **self-contained, offline-first demo** of the
Shule Altra institutional hub. No Firebase project, no Gemini key, no network —
just `npm install && npm run dev` and a full school appears.

---

## 1. Quick start (60 seconds)

```bash
npm install
npm run dev          # http://localhost:9002
```

Then open the landing page and click **Launch Live Demo**, or go straight to
`/login?demo=1` — the demo administrator session is created automatically.

### Demo roles (one click each)

| Role | Email | What it unlocks |
|------|-------|-----------------|
| Administrator | `admin@shule.pro` | Every module, settings, seeding tools |
| Teacher | `teacher@shule.pro` | Students, attendance, academics, timetable |
| Bursar | `bursar@shule.pro` | Finance, canteen, boarding, transport |

Any password is accepted by the demo auth layer (`demo2026` is pre-wired).
“Continue as Guest Admin” also works and grants administrator scope.

---

## 2. What is pre-seeded

The demo school is **Mwalimu Nyerere Secondary School** (Kinondoni, Dar es Salaam,
NECTA centre `SD-2026-0421`), generated deterministically from a fixed seed so
every stakeholder sees the same story:

| Node | Volume |
|------|--------|
| Student registry | 150 students, Standard 7 → Form 4, with generated portraits |
| Staff | 16 members (admin, teachers, bursar, accounts) |
| NECTA assessments | 2,788 grade records (Term 1 Mid-Term, Term 2 Annual, Form 4 Mock) |
| Fee ledger | 140 transactions with ClickPesa control numbers (Verified / Pending / Disputed) |
| Attendance | 900 daily register records |
| Boarding | 5 hostel wings, 108 boarders matched to wings |
| Logistics | 5 bus routes, 42 day students assigned |
| Canteen | 18 cashless sales |
| Inventory | 18 assets with QR tag values |
| Petty cash | 10 expense lines with approval states |

Everything is stored in `localStorage` under `shule-altra.demo.db.v2` and behaves
like Firestore (real-time `onSnapshot` updates, batched writes, transactions,
timestamps, increments).

---

## 3. Five-minute demo script

1. **Landing page** — “Launch Live Demo” → instant admin session.
2. **Dashboard** — population, revenue (TZS 59.6M collected), attendance 96%+,
   live fee/attendance pulse chart.
3. **Students** — search “Neema”, open a profile sheet, tap *Synthesize* to generate
   an AI progress narrative (offline fallback text), export the report card.
4. **Academics** — Form 4 / Term 2 / Annual: class rankings, Division I–IV
   classification, subject performance matrix, NECTA-compliant export.
5. **Finance** — collection rate, forensic ledger, generate a control number,
   record a manual payment and watch the student balance update in real time.
6. **Attendance** — mark all present; parent SMS dispatch is toasted (n8n mocked).
7. **Boarding / Transport / Canteen / Inventory** — occupancy, fleet dispatch,
   sales and QR-tagged assets.
8. **Settings → Developer Node** — re-seed or purge the demo dataset live.

---

## 4. How the demo layer works

```
src/lib/demo/
├── store.ts              # in-memory document store + localStorage persistence + listeners
├── seed-data.ts          # deterministic Tanzanian dataset (the school above)
├── firebase-firestore.ts # Firestore-compatible API (query/where/orderBy/onSnapshot/batch/transaction)
├── firebase-auth.ts      # demo sessions, role accounts, anonymous guest
├── firebase-app.ts       # initializeApp/getApp shim
├── firebase-storage.ts   # photo uploads → data URLs
├── timestamp.ts          # Timestamp + serverTimestamp/increment sentinels
├── ai-fallback.ts        # offline narratives for the AI flows
└── config.ts             # DEMO_MODE flag used by the UI
```

`next.config.ts` aliases `firebase/app`, `firebase/auth`, `firebase/firestore` and
`firebase/storage` to those modules when `NEXT_PUBLIC_DEMO_MODE !== 'false'`.
Application code is untouched — every page still imports the standard Firebase API.

### Switching back to real Firebase

```bash
NEXT_PUBLIC_DEMO_MODE=false npm run dev
```

…after filling `GOOGLE_GENAI_API_KEY` and `NEXT_PUBLIC_FIREBASE_CONFIG` (see
`.env.example`), enabling Email/Password + Anonymous auth, and deploying
`firestore.rules`. The alias simply stops applying.

---

## 5. Reset / troubleshooting

* **Reset the demo school:** Settings → Developer Node → *Purge Demo Data*, then
  *Seed Demo Registry*. Or clear site data for the app (localStorage key
  `shule-altra.demo.db.v2`).
* **No data after refresh?** Browsers in private mode block localStorage; the demo
  still works, it just won't persist between reloads.
* **AI actions:** in demo mode the progress narrative and form scanner return a
  deterministic offline result; wire a Gemini key (demo mode off) for live inference.

---

## 6. Verification & CI

The demo layer is covered by two JSDOM smoke suites that run without a browser
or a cloud project:

```bash
npm run demo:smoke        # renders every screen, fails on runtime errors
npm run demo:smoke:data   # auth roles, queries, snapshots, writes, transactions
npm run typecheck         # TypeScript across the whole repo
npm run build             # production build
```

`demo:smoke` boots the real page components against the demo Firestore shim and
asserts that each of the 15 dashboard screens plus `/login` renders without
console errors. `demo:smoke:data` checks the 150-student registry, fee
reconciliation totals, petty cash, integrations, student balance history, the
role access matrix (teacher cannot open finance/settings), live snapshot updates
after writes, and sign-out.

---

## 7. What is still honest-to-goodness “TODO”

* Timetable period allocation is still a static grid (presentation-ready, not editable).
* PDF/report-card export uses the `docx` path — verify on your target printer.
* ClickPesa and n8n calls are simulated; the webhook route exists but is not exercised
  by the demo dataset.
* Swahili/English UI toggle is not implemented yet (copy is already bilingual-flavoured).
