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

## 6. The public landing page

The front door has **a concept, not a theme**: *one school day, on the
timetable*. Scroll progress is the school clock (06:40 → 16:40); every section
is a period; the red pen rule under the header fills as the day is worked
through; and the paper itself warms as the hours pass (`--day`, driven by
scroll). One variable, fanned out everywhere — colour, labels, progress, motion.

| Piece | What it does |
|---|---|
| **Loader** | A progress counter that hands off with a two-panel curtain. Short-circuits when motion is off, hard-capped at 2 s. |
| **Header** | Segmented nav with a black pill that *slides* between periods (scroll-spy + one Framer `layoutId`), plus a **Motion on/off** switch. |
| **Clock** | Fixed pill, bottom left: live school time plus the period you are reading. |
| **Hero** | Editorial photograph that un-crops itself and drifts at a different scroll rate than the page; three masked display lines; the register tag ("Form 2 · Alpha · 38 learners"). |
| **Bell** | Two marquees, opposite directions, rAF-driven with scroll-velocity boost — marigold display row, forest mono row. |
| **07:40 Register** | Four numbers counted up on view, from the demo school's real data. |
| **09:10 Timetable** | The index *as a timetable*: times down the left, red pen mark on the hovered row, and a photograph that follows the pointer. |
| **11:20 The day** | Sticky photographic stage; three moments of one day cross-fade with the text steps, ticks on the right. |
| **14:00 The paper** | Four real exports, served through the role gate (see §8.1), tilting 5° under the pointer with a wax-seal "Generated" stamp. |
| **16:20 Interlude** | Full-bleed school facade, parallax within the section, one line of copy. |
| **16:05 The gate** | Forest closing statement with a marigold spotlight that follows the pointer; PDPA / NECTA / audit trail. |
| **Footer** | Giant outlined wordmark marquee, columns, demo credentials. |

**Motion preference is a visitor choice.** `prefers-reduced-motion` only sets the
default; the header switch overrides it and persists in `localStorage`
(`altra:motion`). When the system asks for reduced motion and nothing has been
chosen, a toast offers "Enable motion" / "Keep it still" — the page is never
silently frozen. With motion off, every reveal, marquee and counter still shows
its final state.

Photography lives in `public/landing/` (`hero-classroom`, `hands-ledger`,
`school-facade`, `teacher-portrait`, `paper-stack`), served through
`next/image` with real `sizes`, one `priority` image, everything else lazy.

### One palette, both sides of the door

The public page and the app now share a single system, held in
`src/app/globals.css` and `src/lib/pdf/kit.ts`:

| Role | Colour | Where |
|---|---|---|
| System / action | `#1F5BA6` blue | app `--primary`, links, buttons, charts, PDF headers |
| Accent | `#7C5AE0` violet | app `--accent`, the brand gradient, PDF stamps, landing highlight |
| Structure | `#1A1E45` navy | landing dark sections, boot screens, aurora wash |
| Paper | `#F6F8FC` / `#FFFFFF` | landing `--paper` / `--card`, same cool white as the app workspace |

There is no fourth hue. The landing page used to run a cream + rust + marigold
palette of its own; it now draws only from the tokens above, including the
loading curtain (navy → violet) and the marquee band (the brand gradient).

Blue and violet are one gradient, joined at both ends: `.colorful-gradient`,
`.text-gradient`, the `BrandMark` plate and the aurora haze all run `#1F5BA6`
into `#7C5AE0`, so the login card, the sidebar rail and the printed report
header read as the same brand. The landing page borrows the same mark as
`--mark: #6b4be0` over cream paper, and the ten report PDFs plus the six
printables were regenerated from the updated `COLORS` map, so printed documents
match the screen.

## 7. The command deck (GSAP + Three.js admin)

The dashboard is a full re-skin of the admin shell, not a static mock-up:

| Surface | What it does |
|---|---|
| **Aurora shell** | App-shell layout: the rail is fixed furniture at `100dvh` and only the content column scrolls (it owns the scroll and resets it per route). Static, always-visible sidebar with a sliding active pill (Framer Motion `layoutId`), a quiet GSAP opacity stagger on first paint and a spring mobile drawer. The rail never resizes and never moves — scrolling can no longer push it off-screen. |
| **Topbar** | ⌘K command palette (searches modules **and** learner records), reporting-window selector (7D / 30D / 90D / term), live notification stream derived from the ledger, light/midnight theme switch. |
| **Route transitions** | `AnimatePresence` crossfade per pathname + GSAP `[data-reveal]` stagger for each section. |
| **Command deck** | Three.js wireframe orb (pointer parallax, particle halo, WebGL-guarded fallback), animated KPI tiles with count-up + SVG progress rings + sparklines, collections chart with range filters, draggable follow-up queue. |
| **Analytics studio** | `/dashboard/analytics` — cohort averages by stream, payment-method mix, presence trend, and two vector-PDF exports. |

The reporting window selected in the topbar is shared through `RangeProvider`, so
the KPI tiles, the chart and the analytics filters stay in sync.

**Reduced motion** and **no-WebGL** environments are handled: `prefers-reduced-motion`
disables the GSAP sweeps, and the Three.js scene falls back to a CSS aurora when
`WebGLRenderingContext` is missing (which is also what keeps the JSDOM suites quiet).

## 8. Vector printables (no screenshots)

Every printable is a genuine PDF built with `pdf-lib` — real text runs, selectable
and searchable, vector rules and shapes at any DPI. Nothing is rendered from a DOM
screenshot (no `html2canvas`, no print-to-image).

| Document | Builder | Where it is used |
|---|---|---|
| Fee statement | `src/lib/pdf/fee-statement.ts` | Command deck follow-up queue, Reports |
| Termly report card | `src/lib/pdf/report-card.ts` | Student sheet → *Report card · vector PDF* |
| Class merit ranking | `src/lib/pdf/class-report.ts` | Analytics, Reports |
| Attendance register | `src/lib/pdf/class-report.ts` | Analytics, Reports |
| Learner ID cards (A4 2-up) | `src/lib/pdf/id-card.ts` | Student sheet, Reports |
| Master timetable (A4 landscape) | `src/lib/pdf/timetable.ts` | Timetable → *Download PDF* |
| 10 Reports-centre documents | `src/lib/pdf/tabular-report.ts` + `src/lib/reports/builders.ts` | Reports centre |

Every document keeps one page geometry for its whole run: the master sheet is
A4 landscape on all seven pages, and `npm run demo:reports` now fails if a
report mixes sizes (it used to — page one landscape, the rest portrait, because
the table continuation hard-coded A4).

```bash
npm run demo:pdf       # builds private/printables/*.pdf and verifies each one
npm run demo:reports   # builds all 10 Reports-centre PDFs from the demo dataset
npm run demo:docs      # checks the document access policy (see §8.1)
```

Every document carries the school crest (shield, open book, torch) drawn with
vector paths — no bitmap logo, no HTML rendering. The timetable replaced the old
`window.print()` call, so the printed grid is a real landscape PDF with break
rows, rooms and the subject-allocation legend. The Reports centre no longer
simulates generation: each card maps live Firestore rows through a pure builder
in `src/lib/reports/builders.ts` and downloads a genuine PDF.

Sample output is committed to `private/printables/` — deliberately *not* under
`public/` — and served through the role gate described below.
The ID sheet embeds a QR matrix (raster image XObject) for verification; everything
else — including tables, rules, crest and crop marks — is drawn as vector content.

## 8.1 Who is allowed to open a document

The printables used to sit in `public/`, which made the fee ledger, the
defaulters register and the staff establishment world-readable: one guessed URL
and the file downloaded, with no session and no role. That is the failure mode
PDPA alignment is supposed to rule out, so the files moved to
`private/printables/` and every request now goes through
`/api/documents/[...slug]`.

One register decides everything — `src/lib/documents/registry.ts`:

| Sensitivity | Rule | Documents |
|---|---|---|
| `public` | anyone, signed in or not | timetable, subject performance matrix (aggregates only, nobody named) |
| `internal` | a session whose role is on the list | report card, class ranking, attendance registers, asset register |
| `restricted` | named roles only | fee ledger, fee statements, defaulters, expenditure, canteen log, master grade sheet, learner ID sheet, staff establishment |

The role travels as an httpOnly cookie (`altra.role`), written by
`POST /api/session` when the hub resolves who is signed in and cleared on sign
out. `src/app/dashboard/layout.tsx` posts it; the route reads it; nothing in the
browser can make a refused document appear.

```
guest       → timetable, subject analysis          (2 of 16)
teacher     → academic set + timetable             (9 of 16)
accountant  → finance set + timetable              (8 of 16)
bursar      → finance set + timetable              (8 of 16)
admin       → everything                           (16 of 16)
```

Old `/printables/...` links are rewritten in `next.config.ts` to the gated
route, so nothing 404s and nothing bypasses the check. A refusal renders a
branded page that names the role you have, the role the document needs and why —
not a JSON error. `npm run demo:docs` asserts the whole matrix, that every
registered file exists, that no unregistered PDF is reachable, and that no
restricted document lists `VIEWER`.

Inside the hub the same registry drives the UI: the Reports centre hides the
builders a role may not run and greys the sample chips it may not open.

## 9. Verification & CI

The demo layer is covered by two JSDOM smoke suites that run without a browser
or a cloud project:

```bash
npm run demo:smoke        # renders every screen, fails on runtime errors
npm run demo:smoke:data   # auth roles, queries, snapshots, writes, transactions
npm run demo:pdf          # builds + verifies the vector printable suite
npm run typecheck         # TypeScript across the whole repo
npm run build             # production build
```

`demo:smoke` boots the real page components against the demo Firestore shim and
asserts that each of the 16 dashboard screens (including the new
`/dashboard/analytics` studio) plus `/login` renders without console errors. `demo:smoke:data` checks the 150-student registry, fee
reconciliation totals, petty cash, integrations, student balance history, the
role access matrix (teacher cannot open finance/settings), live snapshot updates
after writes, and sign-out.

---

## 9.1 Backend: Firebase rules and the mail room

The demo runs entirely offline, but the repo now carries the production
backend, not just the shim:

| File | What it decides |
|---|---|
| `firestore.rules` | Role-scoped reads and writes inside `schools/{schoolId}` — money (ADMIN/BURSAR/ACCOUNTANT), learning (ADMIN/TEACHER), identity (ADMIN). Everything outside a school is denied. |
| `storage.rules` | Learner photographs under 2 MB, image types only, readable by staff, writable by the office, deletable by an administrator. |
| `firestore.indexes.json` | The composite indexes the dashboards query (ledger by status + control number, attendance by date + class, grades by class + subject, …). |
| `firebase.json` / `.firebaserc` | `firebase deploy --only firestore:rules,firestore:indexes,storage`, plus emulator ports for local work. |
| `src/firebase/config.ts` | `NEXT_PUBLIC_FIREBASE_CONFIG` (one line of JSON) with the demo project as a safe fallback and `storageBucket` derived when it is missing. |

```bash
cp .env.example .env.local      # fill NEXT_PUBLIC_FIREBASE_CONFIG
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### Email to guardians and staff

`/dashboard/communications` is the mail room, and `/api/notifications/email` is
the only thing that can send. Six branded templates — fee reminder, payment
receipt, absence alert, report-card ready, staff briefing, timetable change —
share one table-based layout in `src/lib/email/templates.ts` (blue → violet rule,
crest, PDPA footer, plain-text twin) so they survive Gmail, Outlook and phones.

* **Recipients are resolved on the server** from the school's own register: the
  browser asks for "the fee reminder to the defaulters", never for an address
  list. `src/lib/email/audience.ts` owns the five audiences.
* **The policy mirrors the document registry** — teachers cannot mail the
  defaulters, finance cannot mail the staff briefing — and refusals come back as
  a sentence naming the roles that can.
* **Preview then send**: preview renders the exact HTML for the first recipient
  in a sandboxed iframe; send returns an audit id, the counts and the provider.
* **Three providers, chosen by environment**: Nodemailer over SMTP (Gmail,
  Zoho, cPanel, SES SMTP) → Resend → dry run. Nothing else changes: same
  button, same templates, same audit line.

```
SMTP_HOST + SMTP_USER + SMTP_PASS   Nodemailer · any relay
RESEND_API_KEY                      Resend batch API · better for volume
neither                             dry run · rendered and counted, not sent
```

* **Gmail-friendly by construction**: `SMTP_PASS` may be pasted with the spaces
  Google shows (`abcd efgh ijkl mnop`); port chooses TLS (465 implicit, 587
  STARTTLS); the transport is pooled at concurrency 5 with a pause between
  waves; `SMTP_MAX_PER_SEND` (200) caps one click and `SMTP_DAILY_LIMIT` (400,
  reset at Dar midnight) caps the day. Exceeding either is **refused with the
  reason and the numbers**, never silently truncated.
* **Login is proven before addressing anyone**: a wrong app password costs one
  round trip (`EAUTH`), not ninety-seven failed messages. `?probe=1` runs the
  same check from the mail room's "Test mailbox" button without sending.
* **The office gets a copy**: `ADMIN_NOTIFICATION_EMAIL` is BCC'd on every
  outgoing message, so no parent can claim a reminder never arrived. Parents
  never see the address.
* **The demo cannot bounce**: every parent address in the seeded register is
  invented, so live delivery refuses them (`EMAIL_ALLOW_DEMO_DELIVERY=true`
  overrides) and returns the reason instead of sending. Preview and dry run are
  unaffected. This is what lets a real Gmail mailbox stay connected to the demo
  without burning its reputation.
* `npm run demo:email` renders all six to `private/email-previews/*.html`,
  asserts no leaked `undefined`, checks the brand colours, the plain-text twin,
  the role matrix and the provider precedence.
* `npm run demo:smtp` aims Nodemailer at a closed port on loopback and proves
  the failure path: no delivery, every recipient accounted for, a sentence that
  names the host and the fix, and a dry run once credentials are removed.

The demo school is deterministic: `buildDemoDataset()` rewinds its seeded
generator and clears the name register on every call, so the 97 defaulters the
mail room promises are the 97 it mails.

## 10. What is still honest-to-goodness “TODO”

* Timetable period allocation is still a static grid (presentation-ready, not editable).
* DOCX export still exists next to the new vector PDF path; the PDF is the print-authoritative copy.
* ClickPesa and n8n calls are simulated; the webhook route exists but is not exercised
  by the demo dataset.
* Swahili/English UI toggle is not implemented yet (copy is already bilingual-flavoured).
