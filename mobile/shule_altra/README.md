# Shule Altra mobile · prototype 01

A Flutter **early pilot**, not a production school app. It has an experimental online, read-only Firebase connection path (configuration required), and a separately labelled sample preview with fictional learners and attendance practice. Practice marks are never stored or sent. No payments, offline data or synchronisation are implemented. Onboarding resets when the app restarts. Do not enter real learner data into the sample preview.

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

Flutter and Android SDK were unavailable in the authoring environment, so the Dart code, widget test and build commands above have **not** been executed here. Treat this as a starting point requiring validation on a real device, including small screens, larger text, screen readers and reduced motion.

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

The pilot uses native Google Sign-In and exchanges its ID token for a Firebase Auth credential. It requires Google Play services on Android and a valid Android OAuth configuration. It requests a fresh identity token and a Firestore **server-only** read from `schools/school-001/students`, ordered by name and paginated in pages of 40. It displays learner name, class, status and guardian contact fields, and the Firestore client retrieves the whole student documents; existing rules decide access. Documents without `name` are excluded by the order query. Search is only within the current page, not the entire school. Pages are separate server reads, so concurrent edits can change results between pages. Firestore persistent cache is disabled in this pilot; authentication state may persist on the device until sign-out. The displayed record is a snapshot from its page load and can become stale while open. Account revocation and local session security require real-device verification. No writes, offline access or background sync are implemented. Do not use real learner information on shared or untrusted phones. Google sign-in and live Firebase have not yet been verified here.
