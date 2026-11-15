/// Firebase client values for the Android app, supplied at build time.
///
/// These are public client identifiers, not secrets. They are passed as
/// `--dart-define` values because this pilot must not guess a project: an
/// accidental connection to the wrong Firebase project would show another
/// school's register to a signed-in teacher.
///
/// Two values must agree. `FIREBASE_PROJECT_ID` is what the app initialises;
/// `FIREBASE_EXPECTED_PROJECT_ID` is what the person building the app expected.
/// If they differ the app refuses to connect and says so, rather than connecting
/// to whatever is written in the build.
library;

import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';

@immutable
class SchoolFirebaseConfig {
  const SchoolFirebaseConfig({
    required this.projectId,
    required this.expectedProjectId,
    required this.apiKey,
    required this.appId,
    required this.senderId,
    required this.googleServerClientId,
  });

  /// `--dart-define=FIREBASE_PROJECT_ID=...`
  final String projectId;

  /// `--dart-define=FIREBASE_EXPECTED_PROJECT_ID=...`
  final String expectedProjectId;

  /// `--dart-define=FIREBASE_API_KEY=...`
  final String apiKey;

  /// `--dart-define=FIREBASE_ANDROID_APP_ID=...`
  final String appId;

  /// `--dart-define=FIREBASE_MESSAGING_SENDER_ID=...`
  final String senderId;

  /// Optional. The OAuth *web* client id of the same project, needed by
  /// Google Sign-In on Android when the app is configured by hand instead of
  /// with a `google-services.json` file.
  final String googleServerClientId;

  static const fromEnvironment = SchoolFirebaseConfig(
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    expectedProjectId: String.fromEnvironment('FIREBASE_EXPECTED_PROJECT_ID'),
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    appId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
    senderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    googleServerClientId: String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID'),
  );

  bool get isComplete =>
      projectId.trim().isNotEmpty &&
      expectedProjectId.trim().isNotEmpty &&
      apiKey.trim().isNotEmpty &&
      appId.trim().isNotEmpty &&
      senderId.trim().isNotEmpty;

  bool get projectMatches => isComplete && projectId == expectedProjectId;

  FirebaseOptions get options => FirebaseOptions(
        apiKey: apiKey,
        appId: appId,
        messagingSenderId: senderId,
        projectId: projectId,
      );
}
