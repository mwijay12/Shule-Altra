# Shule Altra · Android app delivery plan

## Goal and current boundary

A polished, reliable Flutter Android app for school staff in variable connectivity, sharing the existing Firebase-backed school data and role model. The initial `mobile/shule_altra/` includes an in-memory fictional attendance practice that never saves or syncs, and an experimental read-only Firebase connection path that still needs real-device integration verification. No offline store or synchronisation is delivered yet. CI has built debug prototype APKs with the connection code, but without Firebase configuration; they are not production releases. The ten web phases are not all complete; mobile must not imply those gaps are solved. Tauri desktop remains a separate later decision.

## Delivery stages and release gates

1. **Product & design (started):** validate onboarding, home, learner concepts and Kiswahili/English copy with staff. Define primary roles, the first offline task, device range and review the SVGs. Finish navigation, accessibility, motion and responsive specs before feature expansion. Exit: agreed screens and real-device design review.
2. **Android foundation (started):** a CI workflow is defined to generate a temporary Android scaffold and build a debug artifact; it must pass before claiming an APK exists. Install/pin Flutter and Android toolchain, generate Android project, establish package ID, CI (`flutter analyze`, `flutter test`, debug build), flavor separation, crash reporting and release signing. Test low-end phones, text scaling, screen readers and Android versions. Exit: reproducible debug APK and passing tests; no secrets in source.
3. **Identity & authorization:** integrate Firebase Auth, verified staff UID mapping and current school/role rules. Confirm deployed Firebase web/mobile config and project match (repository defaults differ); never create or modify real accounts without approval. Handle token expiry, sign-out, disabled users and permission changes. Exit: role matrix and emulator + controlled live test with non-sensitive accounts.
4. **Read-only pilot:** learners and staff-specific dashboard backed by real permitted data, with loading, denied, empty and error states. Decide cache retention and access rules with school. Show data age and source. Exit: access isolation, offline cache behavior and real-device tests.
5. **Offline write pilot:** select one low-risk workflow only after approval; design persistent encrypted storage, local IDs/idempotency, queued/sending/confirmed/failed/conflict states, retry and manual resolution, duplicate prevention, schema migration and explicit sync acknowledgement. Firebase local caching alone is not a conflict strategy. Define what happens when credentials expire, permissions change or a device is lost, and avoid claiming server confirmation while offline. Exit: automated two-device conflict, interrupted sync, auth expiry, rejection and restart tests plus school review.
6. **Expand school workflows:** timetable, learner updates and other approved roles incrementally; reuse existing validation and server rules, do not rely on hidden buttons as authorization. Keep payments, financial changes and guardian communications online/confirmation-only until separately designed and verified; never send sample data to guardians.
7. **Pilot and release:** staged school pilot, monitoring, support, privacy/consent, backup and recovery, rollout/rollback, signing key custody and Play Store or managed APK distribution. Test offline/slow 2G, poor storage, clock issues, sync interruptions and accessibility on actual Tanzanian devices. Exit: documented operational sign-off, signed release and versioned update plan.

## Principles

- Clear language: **saved on device** is not **confirmed by school**. Show when data is stale and never silently discard conflicting edits.
- Minimise student data on device; design encryption, screen lock and remote access revocation realistically. Offline access cannot guarantee immediate server-side revocation.
- Respect OS reduced-motion settings. Avoid heavy GPU effects, autoplay audio, unnecessary background services and large downloads; prioritise battery, data cost and readability.
- WebGL, GLSL and JS animation libraries below inspire the *web*. Flutter uses its own animation/rendering APIs; no WebView dependency is required for this prototype.
- Before any Firebase rules deployment, verify the actual project, review migrations and run emulator and controlled live tests. Merging code alone does not deploy rules.

## Current web dependencies that remain open

Grade correction history can be bypassed through other allowed writes; staff duties are labels rather than fine-grained permissions; school sidebar visibility is not security; some exports/imports remain disabled; expense report reads and void markers are separate. Live token lifecycle/security, delivery and rules need integration verification. The mobile app must not present these as complete.
