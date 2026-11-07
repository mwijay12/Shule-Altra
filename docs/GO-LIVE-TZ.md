# Going live in a Tanzanian school — decisions, money, and what must be fixed

> **Muhtasari kwa haraka**
> 1. Demo inabaki kama showcase (dry run). Kwa production tunatumia **Resend** kwa email na **Beem/Sakura** kwa SMS — Gmail SMTP ni ya majaribio tu, sio ya shule inayolipa.
> 2. Pesa iko kwenye **report card, fee reconciliation na mawasiliano kwa mzazi** — sio kwenye dashboards nzuri.
> 3. Mfano wa bei: **TZS 1,500–2,500 kwa mwanafunzi kwa muhula** (shule ya 500 = TZS 2.25M–3.75M kwa mwaka), au flat TZS 1.5M–3M kwa mwaka.
> 4. Cloudinary inafaa kwa picha, lakini picha za watoto ni **sensitive data** chini ya PDPA 2022 — inahitaji ridhaa ya mzazi na kibali cha PDPC cha kusafirisha data nje ya nchi.
> 5. Kabla ya shule ya kwanza inayolipa: **auth halisi, multi-tenant isolation, malipo (webhooks), SMS, PDPA registration, backups**. Orodha kamili iko §6.
> 6. Mpango wa wiki 8 uko §7 — kila hatua ina "done" inayopimika.

---

## 1. Where the product actually is

| | Demo (what you show) | Production (what a school buys) |
|---|---|---|
| Data | 150 seeded learners in `localStorage` | Real Firebase project per region, one Firestore tree, `schools/{schoolId}` |
| Login | Role cookie (`/api/session`) | Firebase Auth + custom claims; cookie is a cache, not the authority |
| Email | dry run, or SMTP to a box you own | Resend on a verified domain (`shule.<school>.co.tz`) |
| SMS | none | Beem / Sakura with a registered Sender ID |
| Payments | seeded ledger | ClickPesa/Beem webhooks reconciling control numbers |
| Photos | Firebase Storage (2 MB guard) | Cloudinary (transformations) behind a signed upload |
| Failure | toast | audit log, retry, alert to you |

The demo is genuinely close on the parts schools see (printables, roles, mail room). It is thin exactly where money and law live — auth, payments, SMS, data protection. That is the honest gap, and §6 is the list.

---

## 2. Channels: email, SMS, WhatsApp

Tanzanian parents are reachable by **SMS first**, WhatsApp second, email a distant third. A system that only emails will look broken to a bursar.

| Channel | Cost (2026) | Reach | Use it for |
|---|---|---|---|
| **Resend (email)** | Free 3,000/mo (100/day) → **$20/mo for 50,000** | Parents with smartphones, teachers always | Fee statements, report card PDFs, term circulars, staff briefing |
| **Beem / Sakura / NextSMS** | **TZS 13–25 per SMS**, cheaper at volume (Beem ≈ TZS 18–25; NextSMS TZS 16 at 1–5k) | Everyone, including a Nokia 105 | Absence today, fee due tomorrow, results out, bus delay |
| **WhatsApp (Beem/Sakura/Cloud API)** | ≈ TZS 12 per message + template approval | Parents with data | Report cards, receipts, photos — *after* SMS works |

**Sender ID is a real gate:** TCRA rules require a registered alphanumeric Sender ID for A2P SMS in Tanzania, typically 3–5 working days with a business licence and a letterhead request. Start that paperwork now — not the week you sign a school.

**Decision for now**
- **Demo / pilots:** Gmail SMTP is fine and costs nothing. Keep it. It is already wired and guarded (`SMTP_*` → Nodemailer).
- **First paying school:** move email to **Resend** on the school's own subdomain. Reasons: Gmail caps (~500/day free, ~2,000 Workspace) and, more importantly, Gmail gives you no bounce/complaint webhook — you would never learn that 40 of 97 reminders bounced.
- **SMS from day one of the pilot**, because absence alerts are the feature parents actually notice.

So: *email = Resend in production, Gmail only while showing.* SMS = Beem. Not either/or — both, different jobs.

---

## 3. Cloudinary for photos — yes, with a plan

Firebase Storage works and is already guarded (2 MB, image types, role-checked rules). Cloudinary is better at **what schools do with photos**: ID cards, report card headers, staff lists, class photo grids — all needing the same face at six sizes, cropped to the face, in print resolution.

### Why Cloudinary
- One upload, every size on demand: `.../upload/c_fill,g_face,w_300,h_360,q_auto,f_auto/schools/s1/students/ALT-2026-014.jpg`
- `g_face` crop means the ID card looks right without a human cropping 150 photos.
- `f_auto,q_auto` cuts data cost for parents on 3G.
- Free tier: **25 credits/month**, where 1 credit = 1 GB stored, 1 GB delivered, or 1,000 transformations. Roughly: 5,000 student photos (~300 KB each ≈ 1.5 GB) plus ~50k transformations a month stays inside or just above free. **Plus is $99/mo** — only when you pass ~20 schools.

### The architecture to build (not "just upload")
```
browser ──(signed request to our API)──► /api/media/sign
                                             │  api_sign_request(params, api_secret)
                                             ▼
browser ──(direct upload, no file through Vercel)──► Cloudinary
                                             │
                                             ▼
                                   schools/{schoolId}/students/{studentId}
```
Four rules that matter:
1. **Signed uploads only.** An unsigned preset is an open door: anyone can fill your account with 4 GB of video. The signature is minted per school+student on the server, valid for one upload.
2. **No file body through the Next.js function.** Vercel caps request bodies (4.5 MB); direct-to-Cloudinary at 2 MB is fine today, but a PDF or a scanned form is not.
3. **Overwrite + `public_id` per student** — so re-uploading a photo replaces the old one instead of orphaning 150 files.
4. **Not in `public/`, not a guessed URL.** Deliver with `type: private` + signed download URLs, or keep the current proxy. A child's photo must not be indexed by Google — the current `/api/documents` gate already thinks this way.

### Costs at scale
| Students | Storage | Transformations/mo | Plan |
|---|---|---|---|
| 300 | ~0.3 GB | ~5k | Free |
| 1,500 (3 schools) | ~1.5 GB | ~25k | Free (edge) |
| 10,000 | ~10 GB | ~250k | Plus $99 |

### ⚠️ The part nobody tells you
The PDPC has held that **children's images are sensitive personal data**; commercial use without parental consent is unlawful. Cloudinary is hosted outside Tanzania, and cross-border transfer needs a PDPC permit supported by contractual safeguards (§9). Two consequences:

- Add a **photo consent** field per learner (yes/no, who gave it, when) and honour it — no consent, no photo on report cards either.
- Decide deliberately whether photos leave the country. The cheaper, safer first version may be **Firebase Storage in `europe-west1`-adjacent region + the same PDPA paperwork**, with Cloudinary added when a school asks for ID-card batches. Do not let "Cloudinary is easy" decide a legal question.

---

## 4. Monetization

### Who pays, and for what
The head teacher signs; the **bursar** feels the pain daily; the **owner/proprietor** (private schools) approves money. Public schools buy through a different door (see 4.5).

### The pricing model that fits TZ
Per-student, per-term. It scales with the school's own income and is easy to explain to a board.

| Tier | Who | Price | Includes |
|---|---|---|---|
| **Msingi** (starter) | ≤300 learners | **TZS 1,500 / learner / term** | Registry, attendance, fees ledger, 3 printables, 1 staff account per 50 learners |
| **Shule** (standard) | 300–800 | **TZS 2,000 / learner / term** | + report cards, NECTA analysis, mail room, SMS bundle 500/term, parent statements |
| **Kampasi** (multi-campus) | 800+ or groups | **TZS 2,500 / learner / term** | + boarding, transport, canteen, unlimited staff, API, on-site training |

Worked example — a 520-learner private secondary school on **Shule**:
`520 × 2,000 × 3 terms = TZS 3,120,000/year (~USD 1,200)`.

Anchor it against what they already spend:
- one clerk: TZS 400–600k/month → **TZS 4.8–7.2M/year**
- end-of-term report card overtime, printing and re-prints: often **TZS 800k–1.5M/year**
- unpaid fees that never get chased: the real number, and the one that closes the deal.

### Add-ons (higher margin than the seat)
| Add-on | Price | Cost to you |
|---|---|---|
| SMS pack (1,000 msgs) | **TZS 35,000** | TZS 18–20k at Beem → ~45% margin |
| ID card batch (150 cards) | TZS 250,000 | printing + a photo pipeline |
| Report card print run | TZS 3,000/learner/term | paper + toner, or the school's own printer |
| Boarding module | TZS 600,000/year | already half-built |
| Parent portal / WhatsApp | TZS 500,000/year | after SMS |
| Data migration (Excel → system) | TZS 300,000 one-off | 1 day of your time |

### Getting paid
- **Mobile money** is how schools pay you: M-Pesa, Tigo Pesa, Airtel Money via **ClickPesa / Beem / Selcom** collection APIs. One integration, all networks.
- Invoice **per term, in advance**, with 10% off for annual prepay. Termly cashflow fits a school's own fee cycle.
- Never chase a school for TZS 40k of SMS overage — bundle it, reconcile monthly.

### The sales motion that works here
1. **Free 30-day pilot on one department** (usually the bursar's office or Form 4). Seeded with their real data by you, in one afternoon.
2. **The demo that closes**: walk in with *their* report cards printed from the system, and a defaulters list with phone numbers. Nothing else convinces a head teacher.
3. **Cluster selling**: one school in a district talks to five others. Head teachers' associations, church/mosque school networks, and diocesan education secretariats each run 10–40 schools — one relationship, many tenants.
4. **Agents**: 10–15% of first-year revenue to a local agent who trains and supports. Cheaper than flying you to Mbeya.
5. **Land-and-expand**: start with fees + report cards; the boarding/transport modules sell themselves in year two.

### Unit economics sanity check
- Revenue per school (520 learners, Shule tier): **TZS 3.1M/year** + add-ons ≈ **TZS 4M**.
- Direct cost per school: SMS (bundled), Resend ($20 shared), Cloudinary (shared), Vercel/Firebase (shared), support ~2 hrs/month.
- **Gross margin > 85%** once you are past ~5 schools; the constraint is your support hours, not infrastructure.

---

## 5. Where the real pain is (ranked by pain × willingness to pay × our readiness)

| # | Pain | Why it hurts | Our readiness |
|---|---|---|---|
| 1 | **Report cards at end of term** | 40–60 learners × 9 subjects, hand-written, NECTA divisions, remarks, signatures — teachers lose a week | 🟢 PDF engine exists, needs per-school templates + marks import |
| 2 | **Fee collection & arrears** | Control numbers, partial payments, M-Pesa references, parents disputing balances | 🟡 Ledger exists, **no payment reconciliation yet** |
| 3 | **"Who do I call today?"** | The head wants a defaulters list with phone numbers and amounts, by 8am | 🟢 Built (defaulters register) |
| 4 | **Absence → parent** | Paper registers, no notification; parents blame the school | 🟡 Audience exists, **SMS channel missing** |
| 5 | **NECTA/CSEE results analysis** | Parents' meeting needs divisions, subject means, comparison | 🟢 Analytics + subject analysis |
| 6 | **Teacher professional documents** | Scheme of work, lesson plans, daily attendance, "vitabu vya kazi" — inspectors check them | 🔴 Not built; **high differentiation** |
| 7 | **Timetable with teacher shortages / double shifts** | Morning + afternoon sessions in the same rooms | 🟡 Static grid, not editable |
| 8 | **Boarding: beds, meals, kitchen stock** | Theft and shrinkage are routine | 🟡 Modules exist, demo-grade |
| 9 | **Student lifecycle** | Transfers, repeaters, dropouts still billed; duplicate learners | 🔴 Not built |
| 10 | **Ministry/TAMISEMI returns** | Annual census, enrolment returns, hand-copied | 🔴 Not built; one export wins loyalty |
| 11 | **Cash handling & receipts** | Receipt books vanish; no audit trail | 🟢 Audit + ledger |
| 12 | **Connectivity** | Attendance must work offline in a classroom with no signal | 🔴 Not built (PWA queue) |
| 13 | **Swahili** | Bursar and teachers are comfortable in Swahili, not English UI | 🔴 Not built |
| 14 | **Printing reality** | A4, black & white, cheap laser, double-sided | 🟢 All printables are vector, orientation-safe |

Read that table twice. Items **1, 2, 3, 4** are the sale; **6, 9, 10, 12** are how you beat the two competitors already selling in Dar.

---

## 6. What must be fixed before a paying school (the honest list)

### P0 — blockers. Do not sign until these are done.
| # | Fix | Why | Effort |
|---|---|---|---|
| 1 | **Firebase Auth + custom claims** (`role`, `schoolId`) replacing the role cookie as authority | Today a cookie decides who you are — fine for a demo, indefensible with a child's data | 3–4 days |
| 2 | **Tenant isolation**: every query scoped by `schoolId`, rules tested per role | One leaked cross-school query ends the company | 3 days |
| 3 | **School onboarding**: create tenant, seed classes/terms/fee structure, invite staff, migrate Excel | Without it, every school costs you a week of manual setup | 4 days |
| 4 | **Payment reconciliation** (ClickPesa/Beem webhook → match control number → ledger) | The single biggest promise you make to a bursar | 5 days |
| 5 | **SMS channel** (Beem/Sakura) with Sender ID, per-school quota, opt-out, cost guard | Absence alerts are why parents notice the system | 3 days + 1 week of TCRA paperwork |
| 6 | **PDPA compliance**: PDPC registration, DPO named, privacy notice, photo consent, retention, cross-border transfer permit | Enforced since April 2026; children's images are sensitive data | 2 days of work + 4–8 weeks of processing |
| 7 | **Backups & restore drill** (Firestore scheduled exports, tested restore) | A school losing a term of marks is a lawsuit, not a bug | 2 days |
| 8 | **Audit log persistence** (who sent what, who edited a mark, who deleted a learner) | Disputes are settled by logs | 2 days |
| 9 | **Error monitoring + staging** (Sentry, a `staging` Firebase project, seeded test school) | You cannot debug a parent's report card from WhatsApp screenshots | 1 day |
| 10 | **Offline attendance** (PWA + IndexedDB queue, sync on reconnect) | Classrooms have no signal; a register that needs internet will not be used | 4 days |

### P1 — first 90 days after the first paying school
Editable timetable (incl. double shifts) · exam workflow (invigilation, marks entry, moderation) · teacher professional documents (scheme of work, lesson plans) · student lifecycle (transfer/repeat/dropout) · Swahili UI · parent portal (statement + report card + receipts) · WhatsApp channel · TAMISEMI export · per-school branding on printables · canteen/kitchen stock as a real inventory · bulk marks import from Excel.

### P2 — when a school asks and pays
Bus tracking · library · payroll/loans · USSD for feature phones · AI marking (already prototyped) · multi-campus reporting · partner API.

---

## 7. Step-by-step plan (8 weeks to first paying school)

### Week 0 — paperwork starts today (it is the long pole)
- [ ] Register with **PDPC** as a data controller/processor; appoint a DPO (can be you, named in writing)
- [ ] Apply for a **TCRA Sender ID** through Beem/Sakura (3–5 working days)
- [ ] Buy/verify a sending domain for Resend (`mail.altraware.co.tz` + SPF, DKIM, DMARC)
- [ ] Open a ClickPesa or Beem collection account (needs business licence, TIN, bank details)

### Weeks 1–2 — identity and isolation (P0 #1, #2, #3)
- [ ] Firebase Auth wiring; custom claims written by an admin callable
- [ ] Rules test suite: for each role × each collection, assert allow/deny (extend `demo:docs` thinking to Firestore)
- [ ] Tenant onboarding script: seed a school from a JSON/Excel
- [ ] **Exit test:** two schools in one project cannot see each other, proven by an automated test.

### Weeks 3–4 — money (P0 #4) + messaging (P0 #5)
- [ ] ClickPesa/Beem webhook → verify signature → match control number → post to ledger → receipt email/SMS
- [ ] Beem SMS sender behind the same policy layer as the mail room (`canSendTemplate` for SMS)
- [ ] SMS cost guard: per-school monthly cap, refuse with the numbers, exactly like `SMTP_MAX_PER_SEND`
- [ ] **Exit test:** pay TZS 50,000 from a test M-Pesa line; the learner's balance drops and the parent gets an SMS.

### Weeks 5–6 — the demo that closes (P1 first three)
- [ ] Per-school printable branding (crest, colours, head teacher signature block)
- [ ] Report card template exactly matching what the school hands parents today
- [ ] Excel marks import (teachers will not type 2,700 marks by hand)
- [ ] Editable timetable with double-shift support

### Weeks 7–8 — pilot hardening (P0 #7, #8, #9, #10)
- [ ] Firestore export schedule + one full restore rehearsal
- [ ] Audit collection + an "audit trail" screen for the head
- [ ] Sentry + staging project + seeded school
- [ ] Offline attendance on one Android phone, tested in a real classroom

### Then: pilot → paid
- Pilot: one school, one term, free, **your time capped at 3 days**
- Success criteria to convert: ≥80% teachers take attendance weekly, report cards generated for the whole school, ≥1 defaulters round sent by SMS
- Convert at Shule tier; invoice termly; leave the add-ons on the table

---

## 8. Running costs (USD ≈ TZS 2,600)

| Item | 300 learners | 1,500 (3 schools) | 10,000 (~20 schools) |
|---|---|---|---|
| Vercel Pro | $20 | $20 | $20–60 |
| Firebase (Firestore + Auth + Storage) | ~$0–10 | ~$15–30 | ~$80–150 |
| Resend | $0 (free) | $20 | $20–35 |
| Cloudinary | $0 (free) | $0–99 | $99 |
| SMS (bundled/charged through) | pass-through | pass-through | pass-through |
| Sentry | $0 | $26 | $26 |
| Domain + DNS | $2 | $2 | $2 |
| **Total infra** | **≈ $25–35** | **≈ $85–100** | **≈ $250–370** |

At 3 schools you are already profitable on infrastructure. The real cost is **your support hours** — price accordingly, and never sell a tier you cannot support alone.

---

## 9. Legal & compliance (PDPA 2022) — a school will ask

| Obligation | What it means for us |
|---|---|
| Register with **PDPC** before processing | Do it before the pilot. Enforcement is active; registration lasts 5 years. |
| Appoint a **DPO**; quarterly reports | Name one person; write it into the contract. |
| **Children's images = sensitive data** | Written parental consent for photos; a consent flag per learner; honour "no" everywhere including report cards. |
| **Cross-border transfer permit** | Firebase (US/EU), Vercel, Cloudinary, Resend all move data out of Tanzania. Needs a PDPC permit + contractual safeguards (their DPAs). Start early — this is paperwork, not code. |
| Breach notification | A one-page runbook: who checks, who notifies PDPC, who tells the school, within 24h. |
| Data subject rights (access, erase) | An export + delete path per learner, and a per-school contract that says who owns the data (the school does). |
| Retention | Marks: keep. Photos after a learner leaves: delete on a schedule. |
| Contract with the school | A DPA + service agreement: the school is the **controller**, Altraware is the **processor**. One template, signed every time. |

---

## 10. Risks, and what to do about them

| Risk | Mitigation |
|---|---|
| Teachers refuse the system | Offline attendance, 3 taps, Swahili, and one champion teacher trained first |
| Bursar distrusts digital ledger | Run paper and system in parallel one term; show the reconciliation daily |
| Poor connectivity | PWA + queue; never block a save on network |
| Cash-strapped school delays payment | Termly invoicing, annual prepay discount, small starter tier |
| You become the support desk | In-app help, 3 training videos in Swahili, a WhatsApp group with a 4-hour SLA |
| A competitor undercuts | They sell dashboards; you sell report cards, SMS and reconciliation — the boring things that save a week |
| Data incident | Backups, audit trail, DPO, breach runbook, least-privilege rules |

---

## 11. If I only had this week

1. Start the **PDPC registration** and the **Sender ID** paperwork today (both take weeks, neither is code).
2. Buy a domain and put **Resend** behind it; keep Gmail SMTP only for the demo.
3. Build **Firebase Auth + tenant isolation** — nothing else matters until a school's data cannot leak.
4. Prototype **Cloudinary signed upload** for learner photos with a consent flag.
5. Rewrite the pricing page and pitch deck around **three promises**: report cards printed, arrears chased, parents told the same day.

---

### Sources for the numbers above
- Resend pricing (free 3,000/mo & 100/day; Pro $20/50k; Scale $90) — [resend.com/pricing](https://resend.com/pricing), 2026 reviews.
- Tanzania SMS rates (TZS 13–25/SMS, Sender ID 3–5 days, TCRA compliance) — [nextsms.co.tz/pricing](https://nextsms.co.tz/pricing), [sakurasms.com](https://sakurasms.com/blog/best-bulk-sms-providers-tanzania), Beem tiering.
- Cloudinary (free 25 credits/mo; Plus $99; 1 credit = 1 GB storage, 1 GB bandwidth, or 1,000 transformations) — [cloudinary.com/pricing](https://cloudinary.com/pricing).
- PDPA 2022 obligations (PDPC registration, DPO, cross-border permit, children's images sensitive) — PDPC guidance, DLA Piper data protection guide for Tanzania, 2026 enforcement notices.
