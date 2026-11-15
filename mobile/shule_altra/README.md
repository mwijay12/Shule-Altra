# Shule Altra mobile · prototype 01

A Flutter **design prototype**, not a production school app or APK. It contains a three-step onboarding flow, a sample home screen, searchable fictional learner list, sample detail, in-memory sample attendance practice and a transparent status screen. Practice marks are never stored or sent and disappear when the session ends. It does not authenticate, connect to Firebase, persist data, collect payments or synchronise offline. Onboarding resets when the app restarts. Do not enter real learner information.

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
flutter pub get
flutter analyze
flutter test
flutter run
# Prototype only, not a production or signed release:
flutter build apk --debug
```

`flutter create` generates Android scaffolding in the temporary folder; only copy it into this project if `android/` does not already exist. check that it has not replaced prototype files, and set a deliberate, unique application ID and signing strategy before any release. Do not commit keystores, service-account credentials or release secrets. A release APK needs a separately reviewed configuration and signing process.

A GitHub Actions workflow at `.github/workflows/mobile-preview.yml` can generate a temporary Android scaffold, analyze and test the app, and upload a **debug-only prototype** APK if it succeeds. It runs after the branch is pushed; a workflow file alone is not evidence of a successful build.

Flutter and Android SDK were unavailable in the authoring environment, so the Dart code, widget test and build commands above have **not** been executed here. Treat this as a starting point requiring validation on a real device, including small screens, larger text, screen readers and reduced motion.

See [mobile delivery plan](../../docs/mobile-apk-plan.md) and [creative web reference library](../../docs/creative-web-references.md).
