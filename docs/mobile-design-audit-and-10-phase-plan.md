# Shule Altra mobile: uchunguzi, design direction na mpango wa awamu 10

> **Hali:** maandalizi ya ukaguzi yamefanyika kwa kusoma code na vyanzo; Awamu 1 imeanza na mabadiliko yake ya code na tests yamepita CI, lakini uthibitisho wa Firebase na simu halisi bado unasubiriwa. Hii si report ya screenshots, matumizi kwenye simu halisi, au uthibitisho wa Firebase live. Branch inaanzia `27fef99` (PR #35). Tarehe ya utafiti: 9 Novemba 2026.
>
> **Maelekezo ya mmiliki:** app ya Android inayofanya kazi, iendane na data/logic ya dashboard ya web, iwe polished na ieleweke. Blue na white ndio msingi; illustrations ziwe cut-outs zenye transparency. Firebase itakamilishwa na mmiliki; usimwombe secrets. Tauri desktop baadaye. Usibadilishe ombi hili kuwa misururu ya vipande vidogo vinavyohitaji user kusema “go on” kila mara.

## Update: Awamu 1 / 10

- “Back to start” sasa inajaribu sign-out kabla ya kuacha session iliyoingia; ikishindwa hubaki kwenye screen na kuonyesha error/retry. Data ya ukurasa inaondolewa mara moja, na hatua hiyo haipatikani session ikiwa haijatatuliwa au auth ikiwa busy.
- Learner sheet imefungwa kwa revision ya session: sign-out au mabadiliko ya akaunti hubadilisha maudhui kuwa ujumbe bila private data. Regression tests hutumia fake gateway, si Firebase live.
- Home CTA ya mtu ambaye hajaingia inaenda Learners/sign-in; sample demo copy na offline wording vimesahihishwa.
- Mobile analyzer, tests na APK build: https://github.com/mwijay12/Shule-Altra/actions/runs/44437324544; Demo CI: https://github.com/mwijay12/Shule-Altra/actions/runs/44437324519.
- **Bado haijathibitishwa:** sign-out/Google token lifecycle kwenye Android halisi na Firebase live, gateway resource lifecycle, na usalama wa mazingira ya production. Kwa hiyo Awamu 1 ina code/test progress lakini live verification gate iko wazi. Ukaguzi wa chini unaeleza hali ya msingi kabla ya batch hii.

## 0. Ukweli wa sasa — usichanganye demo na product

- App inayoendelea ni `mobile/shule_altra`; `mobile/legacy_pilot` ni prototype ya kumbukumbu, si app ya sasa ya workflow. Kazi muhimu lazima ihamishwe kwa uangalifu, si ku-import app mbili pamoja.
- Kuna shell ya Flutter, onboarding, fictional sample, Google sign-in ya majaribio, learner page na saved timetable read-only. CI inatengeneza APK; workflow haiingizi Firebase build defines. **APK ya CI haihakikishi kwamba imeunganishwa na shule.** Android project/package, SHA, OAuth client, rules na project husika bado vinahitaji uthibitisho wa mazingira halisi.
- Web home inasoma students na transactions na ina formula zake. Mobile home inahesabu *page ya session* tu, baada ya register kusomwa. Hiyo si school-wide dashboard. Usiandike “total students/collections” bila chanzo na scope sahihi.
- `school_day.dart` ni attendance practice ya fictional na sample timetable; hata ukiwa live, marks si rekodi za shule. Saved timetable ni read-only, server-only live path tofauti, na bado haijajaribiwa na real Firebase/device.
- Hakuna madai ya mobile writes, payments, full web parity, offline queue, synchronisation au release signing. Maendeleo ya kificho, UI tests na build success havibadilishi ukweli huu.
- `.firebaserc` ina `studio-2181801796-1fa72`; fallback ya `src/firebase/config.ts` ina `studio-9420247393-c051b`. Web inaweza pia kuwa na config ya mazingira tofauti. Usidhani ipi ni production—hakiki deployment halisi na Android app ya project ileile kabla ya live test. Hakuna secrets za service account au keystore kwenye repo.

---

# Sehemu A — maandalizi 5 (yamefanyika kwa kiwango cha code/research)

Maandalizi haya ni **review ya desk**, si tano za kusubiri majibu au tano za kusema app imekamilika. Matokeo na mapengo yako hapa.

## A1. Product na design brief

**Mtumiaji:** wafanyakazi wa shule (mwalimu, admin na bursar) kwenye Android, mara nyingi kwenye mitandao inayobadilika; uwezo wao hutegemea rules na identity halisi. Tendo kuu si “kutazama cards”, ni kufikia data sahihi na kufanya kazi iliyoidhinishwa kwa ujasiri.

**North star:** *School workspace iliyo tulivu, ya kisasa na inayoaminika* — taarifa muhimu mbele, next action wazi, data source na freshness vinajulikana. Inakaa nyumbani kwenye Android bila kuonekana kama template ya SaaS. Blue/white school identity, imagery halisi ya kuvutia au cut-outs za fictional, na typography nzuri; si green theme, wala violet kama rangi kuu.

**Design/logic inseparable:** kila screen lazima iwe na lengo, primary action, real/sample status, loading/empty/permission/error/retry na state behavior. Hakuna angka ya kubuniwa kama real, hakuna disabled button inayojifanya inafanya kazi, na hakuna Firebase read inayovuka user session.

## A2. Rejea za design na skills

Tulipitia maandishi/repo za [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design), [Impeccable](https://github.com/pbakaus/impeccable), [Taste Skill](https://github.com/Leonxlnx/taste-skill) na [Emil's skills](https://github.com/emilkowalski/skills). Hizi ni **vyanzo vya kanuni**, si madai kwamba plugins zimeinstalliwa au scanners zao zime-run kwenye app. Zina asili kubwa ya web; usiingize CSS/DOM/GSAP kama maagizo ya Flutter bila kutafsiri.

| Chanzo | Tunachochukua | Kitu tusichonakili bila kufikiri |
|---|---|---|
| Anthropic frontend-design | Brief ya kweli, art direction, typographic hierarchy, critique, maandishi ya bidhaa badala ya stock copy; epuka generic cards, all-caps na kila kitu ku-fade-in | Web hero/HTML kama masharti ya native workflow |
| Impeccable | Tathmini kama **product UI**, si landing page: critique, audit, polish, harden, states, spacing na contrast | Kufanya command zake ziwe uthibitisho wa Flutter quality; hatujaziendesha |
| Taste | Maamuzi yenye identity, kukagua width/mobile na maudhui halisi badala ya kuiga template | Kulazimisha theatrics, motion kila mahali au web-only tooling kwenye register |
| Emil | Motion iwe na sababu, iwe responsive kwa input, isivuruge kazi au reduced motion | Kudai smoothness bila kupima profile build kwenye kifaa |

### 2026 direction: what to adopt and reject

- **Adopt:** [Material 3 Expressive](https://m3.material.io/) husaidia hierarchy, shape, adaptive layouts na motion; chagua **standard/utilitarian** motion kama msingi na expressive touch moja au mbili tu pale panaposaidia. [Motion physics guidance](https://m3.material.io/styles/motion/overview/how-it-works) inatofautisha standard na expressive. Hiyo ni design reference; si madai kwamba Compose APIs au M3 Expressive zote zinapatikana kwenye Flutter 3.29.3.
- **Adapt:** [2026 app trend survey](https://www.appschopper.com/blog/top-trending-mobile-app-design-practices-year/) inaangazia typography, adaptive themes na motion. Tumia kama mwelekeo wa design, si ushahidi kwamba kila trend huongeza engagement. Tutapima kwenye devices zetu.
- **Reject as defaults:** blur nzito/glass, animation kwa kila card, 3D/AI features zisizotatua shida, gestures zisizoonekana, dense all-caps, false personalization na skeletons zinazoendelea bila mwisho. Reference: [Flutter performance best practices](https://docs.flutter.dev/perf/best-practices).
- **Accessibility is not optional:** 48×48 dp Android tap target; maandishi ya kawaida angalau 4.5:1 na large text 3:1; text scaling, TalkBack na reduced motion. Sources: [Flutter UI accessibility](https://docs.flutter.dev/ui/accessibility/ui-design-and-styling), [Flutter accessibility testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing), [Android accessible controls](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views).

## A3. Ukaguzi wa screen zote zilizopo

**Ushahidi:** source review ya `lib/screens/*.dart`, shell, data gateways na tests; hakuna emulator screenshots/real-device walkthrough. Severity inahusu kipaumbele na ni review hypothesis pale runtime haijathibitishwa.

| Screen / source | Kilichopo sasa | Tatizo au gap ya kufanya | Target/uthibitisho |
|---|---|---|---|
| Entry `lib/main.dart` | Portrait preference, `ShuleApp` | Hakuna measured startup au realistic install/update verification | Cold/warm startup, system bars, Android back; orientation decision documented |
| Onboarding `screens/onboarding.dart` | 3 slides, cut-outs, skip, device-seen flag | Hero kubwa, repeated generic copy, hakuna previous control; 2 CTAs zinaonekana mwisho tu; “web register in pocket” ni ahadi pana kuliko pilot | 3 intentional slides, clear previous/skip, CTA visibility at 320dp/large text; no promise of unsupported actions |
| Connection boot / unavailable `app/app.dart` | Firebase init + error fallback, sample button | Connection/integration failure copy ni technical; no actual login shown until register; startup/account/session handling needs end-to-end review | One clear connection/login journey, cancellation, retry, distinct sample/live and no auto-switch |
| Demo sign-in `screens/demo_sign_in.dart` + `_SignedOut` in register | Printed fictional credential; demo gateway separate | Extra credential friction; footer says “Google above” even when sample branch renders demo form instead of Google—misleading; comments mention debug only while configuration enables it by default | Correct copy and coherent sample entry; live Google only in live; demo remains deliberately fictional and can be disabled |
| Home `screens/home.dart` | Page-derived metrics, shortcuts | Signed-in-before-load can show zero / “No open balance” despite no page; unsiged CTA sends to More not actual sign-in; generic copy and page-only stats are not web totals | Explicit unloaded/loading/empty/error; CTA takes user to sign-in; real school-wide metrics only from authorized, validated source |
| Register `screens/register.dart`, `data/learner.dart` | Server pagination, page-local text/class/stream/attendance filters, snapshot profiles | No global search; page filter scope must stay visible; page reads whole docs; stream/attendance fields not all displayed in detail; navigation rebuild may lose search/scroll | Fast readable list; global query only when rules/index/semantics validated; stable state and page-only scope; roles/privacy and error handling |
| Learner detail `screens/learner_detail.dart` | Modal, guardian and balance snapshot | No explicit last-read time; no admission/enrollment/stream details yet; open modal captures learner object—verify/close it on sign-out/account change so old data cannot persist on screen | Clear read time/source, meaningful data only, account-change modal test, no false “paid” claim for missing/unknown data |
| School day/practice `screens/school_day.dart` + `practice.dart` | Fictional in-memory marks and selectable fictional timetable | `switch(tab)` removes the stateful Day screen; draft is scoped to screen and may disappear when switching tabs without confirmation. Clear action has no confirmation. This differs from legacy pilot's safer discard flow | Preserve draft for visit or confirm discard; all marks remain fictional and unsent; day selection must not imply dated attendance |
| Saved timetable `screens/saved_timetable.dart` + `data/saved_timetable.dart` | Live only; class Form 1–4/streams A–B/day; server refresh, clear on selection/session change | Read path is experimental, not yet live verified; limited class/stream support; no loaded-at time; selection must handle in-flight reads and authorization | Match web schema and rules; distinguish unscheduled/empty/denied/offline; session race tests and controlled live verification |
| More `screens/more.dart` | Mode, sign-out, local theme toggle, back-to-start, static footer | Copy says “nothing works without a connection” even though sample works offline; theme switch does not explicitly offer system mode; restart calls `_session.dispose()` without calling gateway signOut—do not assume underlying Firebase session ends | Correct mode-specific copy; system/light/dark; explicit restart-vs-sign-out contract and tests; lightweight branded footer |
| Bottom nav `app/app.dart` | 4 Material navigation destinations | `switch` recreates tab subtrees, affecting scroll/filter/draft; active state/native inset behavior has not been verified on a device | Persistent labelled 4-item navigation, visible selection, Android insets/back/keyboard, preserve state deliberately |
| Data/session `app/session.dart`, `data/firebase_gateway.dart` | Request generation guards stale register results; token refresh, Firebase server reads | No real-project verification; `SchoolScope.fallback` fixed to `school-001`; restart does not explicitly sign out; subscriptions/gateway disposal and account switching need lifecycle tests. Do not infer access from visible UI | Auth boundary and lifecycle tested for logout, account change, permission loss, offline, late responses; Firestore rules remain authoritative |
| Theme/motion `design/{tokens,theme,motion,widgets}.dart` | Token system, light/dark, reduced-motion support, reusable components | Current brand ramp puts violet at gradient end, which conflicts with user's blue/white preference even if web parity tests demand it; generic cards/eyebrows and repeated entrance animations need critique | Blue/white visual language with accessible dark counterpart; change parity assertions intentionally, not tests to hide failures; targeted motion only |
| APK/build `.github/workflows/mobile-preview.yml` | Analyze, tests, debug and split builds; publishes prerelease on main | CI has no school Firebase defines; release-mode preview uses throwaway debug signing, not a production release/update strategy | Reproducible documented debug/test build and separate authorized live-configured build; stable, privately held signing key strategy before rollout |

### Immediate logic risks to validate before polish

1. **Account boundary / P0:** `_restart()` disposes `AppSession` but does not itself call `gateway.signOut()`; the underlying Firebase auth state may survive a “back to start.” Verify behavior on device with same and changed account. Fix or explicitly rename/define the action, and regression-test; don't assume disposal signs out.
2. **Screen privacy / P0:** `showLearnerDetail` is a modal with a captured learner, separate from `AppSession` updates. Test account change/sign-out while sheet open; dismiss/clear it if stale. Existing async register/timetable generation guards are valuable but do not alone prove modal behavior.
3. **False zero / P0:** `_Metrics` gets empty `session.rows` before first load and sums nullable balances as zero. An unloaded or wholly unknown dataset must not be presented as “No open balance.” Build explicit unknown/unloaded/loading/error/read-success states.
4. **Lost work / P1:** switching away from SchoolDay disposes `PracticeDraft`; clearing resets immediately. Either preserve across tab changes or ask before discard; never call practice a saved attendance record.
5. **Incorrect navigation / P1:** Home “Check the connection” goes to More, while sign-in is inside Learners. Fix pathway and distinguish live and sample, including the demo “Google above” copy.
6. **Failure conditions / P1:** timetable reader refreshes token and uses Firestore server reads; in real deployment network errors, user disabled, missing OAuth and permissions must be validated without displaying raw exceptions. Do not fix by widening rules.

## A4. Data, authorization and web-parity map

| Domain | Web source/logic | Current mobile | Proposed contract before declaring parity |
|---|---|---|---|
| Identity | Firebase Auth plus staff/rules; real deployment env may override fallback | Android native Google sign-in; config guarded, not live verified | Match verified project, Android package/SHA/OAuth, staff UID and role; check token expiry, deny, account switch and sign out |
| Learners | `schools/school-001/students`, web query ordered by name (`src/app/dashboard/students/page.tsx`) | Same collection shape, 40-page server read; page-only filters | Compare mapped fields and malformed data; permissions and index, case-sensitive search semantics explicitly tested |
| Home metrics | `src/app/dashboard/page.tsx` reads students + transactions; derives enrollment, balances, latest stored attendance and payment values | Session page rows, not school totals | Specify each metric's exact formula, role, date and source; unknown/denied stays unknown. Do not fetch whole school/financial docs indiscriminately: choose approved server aggregation or other authorized query and test cost/rules. Present separate restricted/unavailable states |
| Timetable | `src/lib/timetable-store.ts`: `schools/school-001/timetable/schedule-form-*-*` | Server-only read for Form 1–4/A–B, same schema; no edits | Validate schema, permissions, data freshness and real-device behavior; no invented schedule |
| Attendance | Web has statuses and attendance data; dashboard latest status is not necessarily today | Only fictional practice; latest learner status appears in local filters | Plan dated record/write workflow separately, identity/rules/conflict/history; no production write until approved and tested |
| Finance / roles / exports | Web has transactions, balances, finance modules and role-based routes | Read-only learner balance where present; no payments or finance workflows | Role/authorization matrix, shared canonical validation; never turn a UI visibility check into security or describe `REC-` as a payable control number |

[Firestore rules are not filters](https://firebase.google.com/docs/firestore/security/rules-query): queries must be compatible with rules, including aggregations. Sensitive student docs may contain fields the UI does not show; minimal display is not minimal fetch. No rules deploy, real data write, or project switching without explicit review.

## A5. Verification and delivery protocol

- **Completed now:** source walkthrough of all active screen files and their data/session/design dependencies; review of the sources above; Python Android/config helpers: `python3 -m unittest discover -s mobile/shule_altra/tool -p 'test_*.py'` → **13 passed**. Last merged mobile CI for current base: [Mobile pilot](https://github.com/mwijay12/Shule-Altra/actions/runs/44295111530), tests/build passed on that earlier commit; not a test of any future changes.
- **Not performed now:** Flutter SDK/device/emulator rendering, screenshot capture, golden review, TalkBack testing, frame profile, Firebase live sign-in/read, deployed rules verification or production deployment. No claim of a current visual audit by screenshot.
- **Evidence per implementation batch:** files/features changed, test command and output/CI link, working example path, screen-size/accessibility coverage, state of sample vs live, known limitations. Add before/after screenshots/goldens only when actually rendered and label environment. Avoid “done” for a disconnected mock.
- Work in **10 substantial implementation milestones**, grouping related screens, logic and tests together; a milestone is a meaningful deliverable, not a single button. Target at most ten implementation batches/updates rather than repeatedly asking “go on.” A real-device/Firebase/signing dependency may block a verification gate; report the blocker honestly rather than silently marking it complete or promising a fixed number of messages regardless of external failures.

---

# Sehemu B — design specification ya utekelezaji

## Visual system: “Shule workspace”

1. **Color:** dashboard blue around `#1F5BA6` with white, cool near-white/blue-grey surfaces; darker accessible text and semantic success/warning/danger. Use blue gradients only if they aid hierarchy; avoid the current purple-dominant ramp. A dark theme must be intentionally designed and contrast-tested, not just inverted.
2. **Type:** predictable scale with strong page titles, readable body and compact but not tiny data labels. Default to platform font until an intentionally selected, properly licensed, bundled font proves benefit. No all-caps labels everywhere; use numerals with tabular alignment for fees and dates.
3. **Layout:** 4/8dp rhythm as practical guide, not decoration. Cards only when grouping content; use a mixed list/header layout rather than identical rounded cards. Prioritize useful content at first viewport; no inflated hero pushing login or data below fold on a small phone.
4. **Illustration:** reuse existing fictional alpha PNG cut-outs where they reinforce onboarding/empty states. They must look natural on both themes; provide semantic exclusion for decorative images and an offline asset fallback. Generate new visuals only where they fill a real visual need, not every screen.
5. **Components:** consistent primary/secondary/destructive buttons, fields, search, status chips, notices, list rows, sections, retry and empty states; 48dp targets. Busy actions disable appropriately and expose progress. Text contrast and non-color status cues are mandatory.
6. **Motion:** one composed onboarding reveal; short state transitions for navigation, filter and feedback; use existing reduced-motion support, avoid repeated entrance animations every tab visit and expensive blur/clips. Profile a representative low-end phone in profile mode before declaring smooth.
7. **Copy:** concise, task-oriented, truthful English now; design for English/Kiswahili localization and long labels, but don't imply translation is already delivered. Always distinguish sample vs real, loaded vs school-wide, last sync/read vs current time.

## Bottom navigation / footer specification

The user's “footer” means the persistent mobile navigation, plus restrained informational footers inside screens—not a web footer pasted into an app.

- Proposed 4 labelled destinations: **Home · Learners · Day · More**, unless real usage shows a better grouping. Clear filled icon + blue indicator + label (not color alone). One selected state at all times.
- Prefer an edge-anchored white/dark surface with a fine divider or soft elevation and a subtle blue selected capsule; optional floating treatment only if it does not obscure content, system gestures or reduce hit areas. No default glass blur.
- Place it inside a `Scaffold` and handle Android system insets and keyboard; maintain accessible labels, at least 48dp targets, stable order, Back behavior, screen reader focus and sufficient bottom content padding. Test gesture and 3-button navigation and large text. [Android edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge), [Flutter SafeArea](https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery), and [mobile bottom bar options](https://www.layoutscene.com/mobile-navigation-beyond-hamburger-2026/index.html) inform this; Android Views guidance is a principle, not a drop-in Flutter API.
- Preserve tab state intentionally where appropriate. Account change/sign-out must clear all sensitive data and any open detail overlay; preservation never overrides security. Child screens (saved timetable/details) use normal Back; avoid stacked bottom bars.
- At page end: useful version/source/status or help as appropriate; avoid repeating marketing lines and fake company/legal links.

## Screen-state acceptance grid

Every live surface must have **signed-out, starting, loading, success, empty, offline, permission-denied, expired session, malformed response and retry** where applicable. Every sample surface must explicitly say **fictional**, work without Firebase, and never be silently substituted for a failed real read. For writable features later: add saving, confirmed, failed, retry/conflict and destructive confirmation. State messages must not reveal credentials or private raw server errors.

---

# Sehemu C — awamu 10 za implementation

| # | Batch yenye uzito / files za msingi | Deliverables na gate ya kukubali | Dependencies / mipaka |
|---|---|---|---|
| **1** | **Foundation + identity safety** — `app/app.dart`, `app/session.dart`, gateways, detail sheet | Define restart vs logout; fix session/gateway lifecycle; prevent stale screens/modals and delayed results across sign-out/account change; deterministic tests for both. Correct sample/live and demo misleading copy. | No change to Firebase rules; do not assert live until verified. |
| **2** | **Design system + bottom navigation** — tokens/theme/widgets/motion/shell | Blue/white and intentional dark palette; meaningful type, controls, spacing, 4 labelled nav, insets/back, preserve non-sensitive tab state, reduce repeated animation; contrast + accessibility + narrow/large text tests. | Update web-parity tests deliberately to reflect user-specified blue/white, not blindly copy web purple. |
| **3** | **Onboarding, connection and login end-to-end** — onboarding, live unavailable, register signed-out | Cohesive cut-out visuals and language, previous/skip/direct choices, keyboard & large text, errors/retry, honest source, Google and demo cannot cross; test lifecycle, loading and return paths. | Firebase Android configuration controlled by owner. No fake successful login. |
| **4** | **Home/dashboard — truth first** — home + data service | Redesign for fast tasks; distinguish no read from zero. Agree and implement role-appropriate read-only real metrics using audited web formulas and an authorized, cost-aware data source; loading/error/permission/scope/source/freshness, sample data separate. | No claim of school-wide data from a 40-record page; aggregation/security approach must be proven before exposing finance. |
| **5** | **Learners and detail** — register, learner model, detail | Clear search/filter scope, pagination/read time, responsive readable rows, fields matched to web, dismiss stale detail, preserve appropriate state; test duplicates, empty/malformed/denied/account changes. Add school-wide search only with correct rules/index/normalization. | Remains read-only unless write design is separately approved. |
| **6** | **School day + timetable** — day/practice/saved timetable | Distinct sample practice and real saved schedule; preserve/confirm practice draft; selector/empty/offline/error and read-time states; validated schema/rules; no dated-attendance claim. | Real attendance writes not bundled as visual polish. |
| **7** | **Settings, account, safety and localization readiness** — More, connection flows | System/light/dark, sign-out and restart behavior, accessibility/legible status, concise help/version, honest offline/source text; translation-ready structure and English/Kiswahili content only if validated. | No insecure account switching or new unapproved tracking. |
| **8** | **Web parity & permissions integration** — dashboard/learners/timetable adapters | Map real project/school/role contracts to web, emulator allow/deny tests and controlled live-read protocol; documented consistency, pagination, cost and stale data. | Owner supplies/finishes Android Firebase project config and test accounts; no secrets or service accounts in chat/repo. Live test requires consent and proper permissions. |
| **9** | **Motion, performance, accessibility and visual QA** — all screens | Real rendering/goldens on representative viewport sizes, TalkBack, 1.3–1.5× text, reduced motion, dark/light, low-end profiling, loading/error/empty and offline; fix observed defects as a batch. | Automated widget/contrast checks do not replace real device testing. |
| **10** | **APK hardening + integrated acceptance** — CI, setup, docs, release procedure | Reproducible installable build; clear demo vs configured variant, package/signing/update policy; complete end-to-end journey checklist, CI/emulator results, device verification, residual risk and staged rollout. | No production-release claim without stable signing, real device and owner approval; no offline-sync claim without a separate implementation and conflict tests. |

### Frontend batch status (2026-11-09)

Phases 2–4 are **in progress**, not complete: the mobile palette and labelled bottom navigation now use the requested blue direction, onboarding has a light cut-out hero and Previous control, and Home distinguishes unread pages and missing balances from zero. A small-screen attendance overflow was also fixed. The updated widget suite includes 320dp and 1.5× text, onboarding navigation, and Home data-state tests. [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44441079085) passed analysis, tests and prototype APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44441079128) passed. Real-device visuals, TalkBack, live Firebase and school-wide dashboard metrics remain unverified or unfinished. The login flow, navigation state, motion and the rest of each phase still need the planned work.

### Follow-up frontend and usability batch (2026-11-09)

Phases 2, 3, 6 and 7 remain **in progress**. The signed-out register now reuses a bundled decorative cut-out with a fallback. Appearance offers system, light and dark (choice is in-memory only). Fictional practice marks now survive bottom-tab changes during the session, and clearing asks for confirmation; returning to the start or closing the app discards them. Register state is still intentionally not preserved across tab changes; these changes do not save attendance or enable live writes. Widget tests cover system-dark/explicit theme choices, preserving marks, and cancel/confirm clear. [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44443019031) passed analyzer, tests and debug/split APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44443019021) passed. No real phone, TalkBack or live Firebase verification was performed.

The audit observations above record the original review; this update supersedes the old findings about the theme toggle and discarded Day-tab drafts.

### Implementation prompt 4/10 — learner register and data clarity (2026-11-09)

This is the fourth implementation batch in the conversation, **not** a declaration that four of the ten phases have been completed. Phase 5 remains in progress. The register adds a clearer search-scope panel, source-specific sample/live labels and loading text, and clearer balance indicators that fit narrow screens. Learner detail displays stored stream and attendance with a date caveat. Home identifies the fictional sample and sums only positive recorded balances on the current page (not a school-wide metric or the web dashboard's net formula); unknown balances remain explicit. Malformed non-finite balances are treated as unavailable, and Unicode initials are handled by grapheme cluster. Automated regression tests were added. [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44447960090) passed analysis, tests and debug/split APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44447960033) passed. Real-device appearance and real-school integration remain unverified; searching and filtering still cover the loaded page only.

### Implementation prompt 5/10 — navigation state and timetable safety (2026-11-09)

This counts the fifth implementation batch, **not** five completed implementation phases. Phases 2, 5 and 6 remain in progress. The Learners tab retains its search/filter and scroll state when switching tabs, but clears filters when its session data is invalidated or a new page is read; hidden tabs do not initiate register reads. The saved timetable now shows its local server-read time and clears both displayed and pending results on session-data invalidation, including an unsuccessful sign-out. Fake-gateway widget tests cover tab state, account changes, absence of hidden reads, and timetable invalidation. [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44451172486) passed analyzer, tests and both APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44451172513) passed. The timetable is still read-only, not verified against deployed Firebase rules or a phone; user/device QA remains required.

### Implementation prompt 6/10 — Home visual and data-state redesign (2026-11-09)

Sixth implementation batch, **not** six completed roadmap phases. Phase 4 remains in progress: Home now has a blue/white illustrated welcome panel with the existing transparent cut-out, a focused register action, quick actions and a responsive width cap for tablets. The page overview clearly states its source and page-only scope; empty pages and absent class/balance values no longer imply zero school-wide data. The page read timestamp uses device-local time and is cleared when session data is invalidated; it is not a server update time. Positive balances remain page-only and do not claim parity with the web net formula. Automated state, invalidation and responsive tests run in [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44453797540), which passed analysis, tests and both debug APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44453797501) passed. School-wide metrics, visual review on a real device, and Firebase verification remain open.

### Implementation prompt 7/10 — onboarding and sign-in recovery (2026-11-09)

Seventh implementation batch, **not** seven completed roadmap phases. Phase 3 remains in progress. Onboarding now explains the school account and fictional sample in separate choice cards, avoids implying the register includes every learner, provides accessible page progress and uses a readable tablet width. The unconfigured live path offers retry without pretending to connect, plus a clearly separate sample route. Demo form errors clear on editing; buttons can grow for larger text instead of clipping their labels. Widget tests exercise both choices at 320dp/1.5× in light and dark, unconfigured live retry/sample, and demo failure-to-retry. [Mobile CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44455294614) passed analysis, tests and debug/split APK builds; [Demo CI](https://github.com/mwijay12/Shule-Altra/actions/runs/44455294430) passed. Live Google authentication, real-device visual/keyboard and TalkBack checks still require verification; APK artifacts use no school Firebase configuration.

### Phase completion rules

Each phase closes only when its acceptance criteria and relevant tests pass, data source and remaining limitations are recorded, and any required external verification is explicitly passed or marked **blocked**. Related improvements are grouped into these batches; no artificial “phase complete” for a tiny change. Prioritize P0 trust and task completion over decorative motion.

### Real device validation matrix (to be run, not claimed)

- Android lower-end and recent device, actual API levels recorded; narrow phone 320–360dp, standard 390dp, larger display; 1.0/1.3/1.5 text scale; TalkBack, reduced motion, portrait/system navigation and keyboard.
- Sample: fresh install → introduction → sample → register/page/filter/detail → day/practice → tab changes → clear/exit → restart; verify no network or real records.
- Controlled live: registered Android package and matching signing fingerprint + same Firebase project as verified web deployment → sign in authorized staff → load permitted register and timetable → compare selected records to web → deny a non-authorized identity → offline/retry → sign out/account switch with requests and sheet open. Use consented non-sensitive accounts. Capture results without exposing learner/guardian data.
- Profile app in Flutter profile mode on actual hardware; record representative screen/frame behavior, not invented fps. Validate APK install/update/signing on intended Android devices.

## Reference links (consulted; not copied verbatim)

1. [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) — deliberate brief, typography, anti-template critique.
2. [Impeccable](https://github.com/pbakaus/impeccable) — design review/audit vocabulary, translated to Flutter product context.
3. [Taste Skill](https://github.com/Leonxlnx/taste-skill) — art direction and finish checks; web tools are not Flutter tests.
4. [Emil's Skills](https://github.com/emilkowalski/skills) — motion/design engineering reference.
5. [Material 3](https://m3.material.io/) and [motion physics](https://m3.material.io/styles/motion/overview/how-it-works) — expressive vs functional motion principles.
6. [Flutter accessibility](https://docs.flutter.dev/ui/accessibility/ui-design-and-styling) and [testing](https://docs.flutter.dev/ui/accessibility/accessibility-testing) — contrast, tap targets, labels and scaling.
7. [Flutter performance](https://docs.flutter.dev/perf/best-practices) — build cost, lazy lists and animation profiling.
8. [Android edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge) and [Flutter SafeArea](https://docs.flutter.dev/ui/adaptive-responsive/safearea-mediaquery) — system insets principles.
9. [2026 app design practices](https://www.appschopper.com/blog/top-trending-mobile-app-design-practices-year/) and [mobile navigation patterns](https://www.layoutscene.com/mobile-navigation-beyond-hamburger-2026/index.html) — trend context, not empirical proof that trends improve this app.
10. [Firestore query security](https://firebase.google.com/docs/firestore/security/rules-query) — rules are not filters; authorizations apply to queries and aggregations.
