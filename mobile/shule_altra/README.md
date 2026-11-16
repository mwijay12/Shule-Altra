# Shule Altra mobile · pilot 02

A Flutter app with **two separate data paths** and no third one:

| Path | Data | Network | Writes |
| --- | --- | --- | --- |
| **Sample preview** | Fictional learners, in the app | none | none |
| **Live school** | `schools/{schoolId}/students` in your Firebase project | Firebase, server reads only | none |

The app opens on onboarding and asks which one you want. It never drifts from one
into the other, and every register screen prints which one you are looking at.

This replaces the three static SVGs in `design/`. The SVGs are the intent; this is
the working thing.

---

## What is verified, and what is not

Being precise about this is the point of the pilot, so it comes before the
instructions.

**Verified by CI on every push to `mobile/shule_altra/**`**
(`.github/workflows/mobile-preview.yml`, job `android-preview`). The run on the
merge commit of pull request #30 passed every step, in this order:

1. `flutter create` generates the Android scaffold into a temp directory and
   `tool/configure_android.py` applies the minimum API level, NDK, internet
   permission and backup policy, with its own unit tests run first.
2. `flutter pub get`
3. `flutter analyze` — **any** warning fails the job.
4. `flutter test` — the whole suite: contrast (every text pair the app draws,
   in both themes), reduced motion, learner mapping, configuration guards,
   session behaviour, practice sheets and end-to-end widget flows at 390x844.
5. `flutter build apk --debug` — an unsigned debug APK, uploaded as the artifact
   `shule-altra-prototype-debug-apk` (7-day retention).

That proves the app compiles, that its tests pass, and that a debug APK can be
produced. If the job is red, none of that is true, whatever this file says.

**Not verified, and it must be checked on a device before anyone relies on it:**

- Google sign-in end to end. It needs a real Firebase project with an Android app
  registered for the package name and signing key — see below. No test here can
  stand in for that.
- Reading a real register, including Firestore rules for a real staff account.
- Session revocation while the app is open.
- Small screens, very large text, a screen reader, and the phone's "remove
  animations" setting on real hardware. The reduced-motion path is unit-tested,
  not seen.
- Anything to do with money or attendance *writing*: it does not exist.

The authoring environment had no Flutter or Android SDK, so **this code was
written without being compiled locally**. Every fix in the pull request's history
came from a CI run reading back its own failure — including a real layout bug
(the register's page buttons overflowed a 390 px screen by up to 91 px) and a
real state bug (clearing the practice sheet did nothing, because the draft was a
`final` field). A green run is the start of verification, not the end of it.

---

## Run it

Requires Flutter 3.29.x (Dart 3.3+), the Android SDK and a device or emulator.

The Android platform project is **generated, not committed** (it is in
`.gitignore`). Generate it, then configure it:

```bash
TMP="$(mktemp -d)"
flutter create --platforms=android --project-name shule_altra_mobile --org com.shulealtra "$TMP/shule_mobile"
test ! -e android && cp -R "$TMP/shule_mobile/android" ./android
python3 tool/configure_android.py
flutter pub get
flutter analyze
flutter test
flutter run
```

Sample preview only: `flutter run` and choose **Explore the sample preview**.
Nothing else is needed — no account, no Firebase, no network.

### The live path

Build with the public client identifiers of **your** Firebase project:

```bash
flutter run \
  --dart-define=FIREBASE_PROJECT_ID=YOUR_PROJECT_ID \
  --dart-define=FIREBASE_EXPECTED_PROJECT_ID=YOUR_PROJECT_ID \
  --dart-define=FIREBASE_API_KEY=YOUR_ANDROID_API_KEY \
  --dart-define=FIREBASE_ANDROID_APP_ID=YOUR_ANDROID_APP_ID \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID \
  --dart-define=GOOGLE_SERVER_CLIENT_ID=YOUR_WEB_OAUTH_CLIENT_ID
```

These are client identifiers, not service-account credentials. Never put a secret
in a `--dart-define`.

Three more things must be true before sign-in works, and the app cannot check any
of them for you:

1. An **Android app** is registered in the Firebase project for the package name
   `com.shulealtra.shule_altra_mobile` **and** for the SHA-1/SHA-256 of the key
   that signed the APK. A hosted-CI debug key is ephemeral, so use your own debug
   keystore for integration testing and never commit it.
2. The **Google sign-in** provider is enabled in Firebase Auth.
3. `GOOGLE_SERVER_CLIENT_ID` is the project's **web** OAuth client id — Android
   Google Sign-In needs it when it is configured by hand rather than with a
   `google-services.json`.

Why `--dart-define` and not `google-services.json`: the values then live in the
build command rather than in a file that a casual clone would inherit, and the
two project-id values (`FIREBASE_PROJECT_ID` and `FIREBASE_EXPECTED_PROJECT_ID`)
must agree or the app refuses to connect. That catches the dangerous mistake —
building with another school's project.

If any of this is missing the app says so in words on screen and offers the
sample preview. It never falls back silently.

---

## How it is built

```
lib/
  main.dart                 entry point, portrait, no assumptions
  app/app.dart              theme, gateway choice, four screens
  app/session.dart          who is signed in; discards rows on account change
  data/school_gateway.dart  the interface both paths implement
  data/firebase_gateway.dart  live reads; the only file that imports Firebase
  data/sample_gateway.dart    fictional learners, same interface
  data/school_config.dart     build-time config, with the project-id guard
  data/learner.dart           one mapping from a Firestore document to a row
  design/tokens.dart          every colour, space, radius and duration
  design/theme.dart           both themes, from those tokens
  design/motion.dart          reduced-motion handling and the two reveal widgets
  design/doodles.dart         point-drawn marks, no raster assets
  design/widgets.dart         brand bar, cards, notices, metrics, chips
  screens/                    onboarding, home, register, detail, day, more
```

Three decisions worth knowing:

**One `class` key.** The web product stores `class`, not `className`. Reading the
wrong key is how a register prints "Unassigned" for every learner;
`test/learner_mapping_test.dart` feeds a real-shaped document through the mapping
and fails if that regresses.

**Honest states.** A register screen has four: signed out, loading, failed, and a
page of learners. Every one is written in words. A failure never leaves a blank
list and never leaves the previous page's rows on screen.

**Motion that can be turned off.** Every reveal is `transform` + `opacity` and
reads `MediaQuery.disableAnimationsOf`. With animations off the controller is
never created: content is simply there, at rest. `test/contrast_test.dart` checks
that, and checks every text pair at 4.5:1 (3:1 for large text) in **both** themes.

## What a human still has to decide

- The final application ID and signing strategy. `com.shulealtra.shule_altra_mobile`
  is a placeholder.
- Whether the live path ships at all before offline attendance exists. Read-only
  is honest; a register that cannot record attendance is also, by design, not the
  tool a teacher needs at roll call.
- Which school id the app talks to. `SchoolScope.fallback` is `school-001`, the
  web product's school — a build for a different school needs a different value.
- Whether to bundle a typeface. The app currently uses the platform's own font,
  which keeps the APK small and honest, and makes type rendering device-specific.

## Licence and data

No real learner data was used to build or test this. Every sample name, guardian
and phone number is fictional, and every sample email is on `example.test`.
