# Shule Altra mobile · prototype 01

A Flutter **early pilot**, not a production school app. It has an experimental online, read-only Firebase connection path (configuration required), and a separately labelled sample preview with fictional learners and attendance practice. Clearing all practice marks or resetting a marked preview asks for confirmation. Practice marks are never stored or sent, and are not tied to the day selected in the sample timetable. Practice includes per-status totals and a fill-unmarked action that preserves existing choices. The sample home summarizes attendance practice held in memory, and More provides a route to the separate school connection. The sample register offers name/class search, class filtering and read-only fictional profiles showing session-only practice attendance. The sample day also includes a fictional, day-selectable three-period timetable so its layout can be explored without Firebase; it is not a real school schedule. No payments, offline data or synchronisation are implemented. Onboarding resets when the app restarts. Do not enter real learner data into the sample preview.

## Review the direction

Open the independent SVG concepts in `design/`:

- [Onboarding](design/01-onboarding.svg)
- [Home](design/02-home.svg)
- [Learners](design/03-learners.svg)

These are static visual concepts; Flutter layouts use native Material widgets and will not be pixel-identical. They are not screenshots or proof of an APK build.

## Run locally with Flutter

Requires a recent stable Flutter SDK with Dart 3.3 or newer, Android SDK / Android Studio and a device or emulator. This repository currently contains the Dart prototype, pubspec and tests, but **no generated Android platform project**. After reviewing the changes, from this directory run:

```bash
# Generate separately so your authored prototype files are not overwritten.
# Run from a shell that provides mktemp and cp.
TMP_PROJECT="$(mktemp -d)"
flutter create --platforms=android --project-name shule_altra_mobile --org com.shulealtra "$TMP_PROJECT/shule_mobile"
test ! -e android && cp -R "$TMP_PROJECT/shule_mobile/android" ./android
python3 tool/configure_android.py
flutter pub get
flutter analyze
flutter test
flutter run
# Prototype only, not a production or signed release:
flutter build apk --debug
```

`flutter create` generates Android scaffolding in the temporary folder; only copy it into this project if `android/` does not already exist. The configuration script sets minimum Android API 23, NDK 27, internet access and disables Android application backup for the generated scaffold; review its changes. Set a deliberate, unique application ID and signing strategy before any release. Do not commit keystores, service-account credentials or release secrets. A release APK needs a separately reviewed configuration and signing process.

A GitHub Actions workflow at `.github/workflows/mobile-preview.yml` can generate a temporary Android scaffold, analyze and test the app, and upload a **debug-only prototype** APK if it succeeds. It runs after the branch is pushed; a workflow file alone is not evidence of a successful build.

Flutter and Android SDK were unavailable in the authoring environment. GitHub Actions has run the analyzer, widget tests and debug APK build, but this does not replace validation on a real device, including small screens, larger text, screen readers and reduced motion.

See [mobile delivery plan](../../docs/mobile-apk-plan.md) and [creative web reference library](../../docs/creative-web-references.md).

## Early Firebase read-only pilot

The app now includes an **experimental online connection path**, in addition to the explicitly labelled sample preview. It does not assume the web Firebase config applies to Android. Register/confirm the Android app with the intended existing Firebase project and package name, configure Google sign-in and the signing key SHA fingerprints, confirm the **Web OAuth client ID** belongs to that Firebase project, then build with public Firebase Android client values as Dart defines:

```bash
flutter run \
  --dart-define=FIREBASE_PROJECT_ID=YOUR_PROJECT_ID \
  --dart-define=FIREBASE_EXPECTED_PROJECT_ID=YOUR_PROJECT_ID \
  --dart-define=FIREBASE_ANDROID_APP_ID=YOUR_ANDROID_APP_ID \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID \
  --dart-define=FIREBASE_API_KEY=YOUR_ANDROID_API_KEY \
  --dart-define=FIREBASE_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_OAUTH_CLIENT_ID
```

These are client identifiers, not service-account credentials. Never put secrets or passwords in Dart defines. The two project ID values must match; this catches accidental inconsistent configuration, but does not prove that the selected project is the right school. Verify the project and registered Android app independently before using real data. This repository's `.firebaserc` project and web fallback differ. The temporary CI scaffold uses `com.shulealtra.shule_altra_mobile`; decide the final package ID and register it before relying on Google sign-in. Debug signing keys on hosted CI runners are ephemeral and will not automatically match your Android OAuth fingerprint; use a controlled debug signing key locally for integration testing and never commit it. A debug build without defines deliberately displays configuration required.

After sign-in, the workspace offers clear entry points to the learner register and timetable, with no invented dashboard statistics. The pilot uses native Google Sign-In and exchanges its ID token for a Firebase Auth credential. It requires Google Play services on Android and a valid Android OAuth configuration. It requests a fresh identity token and a Firestore **server-only** read from `schools/school-001/students`, ordered by name and paginated in pages of 40. It displays learner name, class, status and guardian contact fields, and the Firestore client retrieves the whole student documents; existing rules decide access. Documents without `name` are excluded by the order query. The school search is a case-sensitive prefix of the `name` field, not a substring or case-insensitive search; a separate filter searches only the current page. Pages are separate server reads, so concurrent edits can change results between pages. Firestore persistent cache is disabled in this pilot; authentication state may persist on the device until sign-out. The displayed record is a snapshot from its page load and can become stale while open. Account revocation and local session security require real-device verification. The timetable view also reads the web app’s saved class/stream schedule from the server, using the same fixed periods; it does not edit or generate a schedule. Class and stream changes clear the previous schedule until it is loaded again; day selection filters the loaded schedule without another server read. No writes, offline access or background sync are implemented. Do not use real learner information on shared or untrusted phones. Google sign-in and live Firebase have not yet been verified here.

## Build a configured debug APK on your own computer

This is a controlled **online read-only test**, not a release. First follow the scaffold setup above. Independently verify the school Firebase project: the repository's defaults differ. Register Android package `com.shulealtra.shule_altra_mobile` in that project and download its `google-services.json`. Obtain that project's **Web OAuth client ID** from its Firebase/Google OAuth configuration; the helper cannot prove it is a Web client or belongs to the project. Configure Google sign-in and register the SHA fingerprints of the actual debug signing key in Firebase before testing. The default local debug key is commonly at `~/.android/debug.keystore`; Android Studio/Gradle `signingReport` can show the signing SHA. If the key is regenerated, register the new fingerprint. Do not upload the keystore or its password.

From `mobile/shule_altra/`, using your own values and a shell with Flutter installed:

```bash
python3 tool/firebase_defines.py /path/to/google-services.json \
  --expected-project YOUR_VERIFIED_PROJECT_ID \
  --web-client-id YOUR_WEB_OAUTH_CLIENT_ID
flutter build apk --debug --dart-define-from-file=.local/firebase-defines.json
```

The helper checks the project ID and package against the downloaded Android config, and refuses to overwrite `.local/firebase-defines.json`. To change configuration, remove that local file deliberately and rerun. This is a consistency check, **not** proof that the project, OAuth client, permissions, or signing fingerprint are correct. The generated file and downloaded config are ignored by Git; never use a service-account JSON. Client values are embedded in the APK and are not secrets; Firebase rules remain the security boundary.

Transfer `build/app/outputs/flutter-apk/app-debug.apk` to a trusted Android device, install it, and use a permitted test account. Confirm the displayed school and test access isolation before using sensitive records. This procedure has not yet been verified on a real phone or live project. CI artifacts do not include these defines and hosted CI uses ephemeral debug signing, so they cannot be assumed to support live Google login.
