/// The Firebase implementation of [SchoolGateway].
///
/// Three deliberate choices, each one a place this pilot is narrower than the
/// web product:
///
///  1. **Server-only reads.** Every register page is fetched with
///     `Source.server`. Firestore's on-device cache is switched off, so a
///     signed-out or offline teacher sees an honest message instead of yesterday's
///     register.
///  2. **A fresh token per page.** The id token is force-refreshed before each
///     read, so a revoked account fails at the next page rather than continuing
///     to read until the token happens to expire.
///  3. **No writes.** There is no method here that writes. Attendance in the app
///     is practice-only sample data and never reaches Firestore.
library;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';

import 'demo_credentials.dart';
import 'learner.dart';
import 'school_config.dart';
import 'school_gateway.dart';

/// How a page of the register is read.
const int kRegisterPageSize = 40;

class FirebaseSchoolGateway implements SchoolGateway {
  FirebaseSchoolGateway({
    required FirebaseAuth auth,
    required FirebaseFirestore firestore,
    required SchoolScope scope,
    required GoogleSignIn googleSignIn,
    required bool googleReady,
  })  : _auth = auth,
        _firestore = firestore,
        _scope = scope,
        _google = googleSignIn,
        _googleReady = googleReady;

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final SchoolScope _scope;
  final GoogleSignIn _google;

  /// False when `GoogleSignIn.initialize` could not run. Sign-in then reports a
  /// configuration problem before it ever opens a Google sheet.
  final bool _googleReady;

  @override
  String get sourceLabel => 'Live · ${_scope.schoolId}';

  @override
  Stream<String?> get sessionUid =>
      _auth.authStateChanges().map((user) => user?.uid).distinct();

  @override
  Future<void> signIn() async {
    if (!_googleReady) {
      throw const GatewayFailure(
        'Google sign-in is not initialised in this build. The web OAuth client id '
        'for your Firebase project is missing, so Android cannot start the '
        'sign-in flow.',
        kind: GatewayFailureKind.notConfigured,
      );
    }
    try {
      final account = await _google.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw const GatewayFailure(
          'Google returned an account but no identity token. The Android OAuth '
          'client for this package name and signing key is probably not '
          'registered yet.',
          kind: GatewayFailureKind.notConfigured,
        );
      }
      // A credential, not a provider flow: `signInWithProvider` is a web-only
      // API and fails on Android. The id token is what Firebase verifies; an
      // access token is not needed to read a school's own register.
      final credential = GoogleAuthProvider.credential(idToken: idToken);
      await _auth.signInWithCredential(credential);
    } on GatewayFailure {
      rethrow;
    } on GoogleSignInException catch (error) {
      throw GatewayFailure(_googleMessage(error), kind: _googleKind(error));
    } on PlatformException catch (error) {
      throw GatewayFailure(
        'Google sign-in could not start (${error.code}). Check the Android OAuth '
        'configuration for this build.',
        kind: GatewayFailureKind.notConfigured,
      );
    } on FirebaseAuthException catch (error) {
      throw GatewayFailure(_authMessage(error), kind: GatewayFailureKind.denied);
    }
  }

  /// Releases the auth and Firestore handles this build created. Called only
  /// when a live gateway is thrown away before it is ever shown.
  Future<void> dispose() async {
    if (_googleReady) {
      try {
        await _google.signOut();
      } on GoogleSignInException {
        // Ignored: this gateway is being thrown away unused.
      }
    }
    await _auth.signOut();
    await _firestore.terminate();
  }

  /// The live path has no demo door, and never will: a demo credential that
  /// could read a school's register would not be a demo.
  @override
  bool get acceptsDemoCredential => false;

  @override
  DemoIdentity? get demoIdentity => null;

  @override
  Future<void> signInWithDemo(String email, String password) async {
    throw const GatewayFailure(
      'This build reads a real school, so it only accepts your school account.',
      kind: GatewayFailureKind.signedOut,
    );
  }

  @override
  Future<void> signOut() async {
    if (_googleReady) {
      try {
        await _google.signOut();
      } on GoogleSignInException {
        // A Google Sign-In failure must not leave a Firebase session behind, so
        // the Firebase sign-out below runs regardless.
      }
    }
    await _auth.signOut();
  }

  @override
  Future<LearnerPage> loadLearners({int limit = kRegisterPageSize, Object? after}) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw const GatewayFailure(
        'Your session ended. Sign in again to read the register.',
        kind: GatewayFailureKind.signedOut,
      );
    }

    try {
      await user.reload();
      if (_auth.currentUser?.uid != user.uid) {
        throw const GatewayFailure(
          'The signed-in account changed. Sign in again.',
          kind: GatewayFailureKind.signedOut,
        );
      }
      await user.getIdToken(true);

      Query<Map<String, dynamic>> query = _firestore
          .collection('schools')
          .doc(_scope.schoolId)
          .collection('students')
          .orderBy('name');

      if (after != null) {
        if (after is! DocumentSnapshot<Map<String, dynamic>>) {
          throw const GatewayFailure(
            'That page link is no longer valid. Start again from the first page.',
          );
        }
        query = query.startAfterDocument(after);
      }

      // One extra document answers "is there another page?" without a count.
      final snapshot = await query
          .limit(limit + 1)
          .get(const GetOptions(source: Source.server));

      if (_auth.currentUser?.uid != user.uid) {
        throw const GatewayFailure(
          'The signed-in account changed while the register was loading. Sign in again.',
          kind: GatewayFailureKind.signedOut,
        );
      }

      final visible = snapshot.docs.take(limit).toList();
      return LearnerPage(
        rows: [
          for (final doc in visible) Learner.fromDocument(doc.id, doc.data()),
        ],
        nextCursor: snapshot.docs.length > limit ? visible.last : null,
      );
    } on GatewayFailure {
      rethrow;
    } on FirebaseException catch (error) {
      throw GatewayFailure(_readMessage(error, _scope.schoolId));
    }
  }
}

GatewayFailureKind _googleKind(GoogleSignInException error) {
  return switch (error.code) {
    GoogleSignInExceptionCode.canceled => GatewayFailureKind.signedOut,
    GoogleSignInExceptionCode.clientConfigurationError ||
    GoogleSignInExceptionCode.providerConfigurationError ||
    GoogleSignInExceptionCode.uiUnavailable =>
      GatewayFailureKind.notConfigured,
    _ => GatewayFailureKind.other,
  };
}

String _googleMessage(GoogleSignInException error) {
  return switch (error.code) {
    GoogleSignInExceptionCode.canceled => 'Sign-in was cancelled before an account was chosen.',
    GoogleSignInExceptionCode.clientConfigurationError =>
      'This build is not registered as an Android app for the school\'s Firebase '
          'project. The package name and the signing key both have to be added in '
          'the Firebase console.',
    GoogleSignInExceptionCode.providerConfigurationError =>
      'Google sign-in is not enabled for the school\'s Firebase project, or the '
          'web OAuth client id is missing from this build.',
    GoogleSignInExceptionCode.uiUnavailable =>
      'Google needs a browser or Play Services to show the account picker, and '
          'neither is available on this phone.',
    _ => 'Google sign-in failed (${error.code.name}). Nothing was loaded.',
  };
}

String _authMessage(FirebaseAuthException error) {
  return switch (error.code) {
    'network-request-failed' => 'Firebase could not be reached. Check the connection.',
    'user-disabled' => 'This account has been disabled for the school project.',
    'invalid-credential' || 'account-exists-with-different-credential' =>
      'Google accepted the account but Firebase refused the credential. Check the '
          'OAuth client configuration.',
    _ => 'Sign-in failed (${error.code}). Nothing was loaded.',
  };
}

String _readMessage(FirebaseException error, String schoolId) {
  return switch (error.code) {
    'permission-denied' =>
      'The school rules refused this read. Your account may not be on the staff '
          'list, or the session expired.',
    'unavailable' || 'deadline-exceeded' =>
      'The register could not be reached. Check the connection and try again. No '
          'cached results are shown.',
    'unauthenticated' =>
      'Firebase no longer accepts this session. Sign in again.',
    'failed-precondition' =>
      'The register query needs an index that this project does not have yet '
          '(collection schools/$schoolId/students, ordered by name).',
    'not-found' =>
      'No school document with this id exists in the project this build connects '
          'to. Check FIREBASE_PROJECT_ID.',
    _ => 'The register could not be read (${error.code}). Nothing was loaded.',
  };
}

/// Builds the live gateway, or explains why this build cannot.
class LiveSchool {
  LiveSchool._(this.gateway);

  final FirebaseSchoolGateway gateway;

  /// Throws [GatewayFailure] with `notConfigured` when the build has no usable
  /// Firebase values. Any other failure is a real initialisation error and is
  /// reported as such.
  static Future<LiveSchool> boot({
    SchoolFirebaseConfig config = SchoolFirebaseConfig.fromEnvironment,
    SchoolScope scope = SchoolScope.fallback,
  }) async {
    if (!config.isComplete) {
      throw const GatewayFailure(
        'This build has no Firebase values. Rebuild with the FIREBASE_* '
        '--dart-define values for your school, or use the sample preview.',
        kind: GatewayFailureKind.notConfigured,
      );
    }
    if (!config.projectMatches) {
      throw const GatewayFailure(
        'FIREBASE_PROJECT_ID and FIREBASE_EXPECTED_PROJECT_ID disagree, so this '
        'build would connect to a project nobody intended. Refusing to connect.',
        kind: GatewayFailureKind.notConfigured,
      );
    }

    FirebaseApp app;
    try {
      final existing = Firebase.apps.where((candidate) => candidate.name == 'shule-school').toList();
      app = existing.isEmpty
          ? await Firebase.initializeApp(name: 'shule-school', options: config.options)
          : existing.single;
    } on FirebaseException catch (error) {
      throw GatewayFailure(
        'Firebase could not start (${error.code}). Check the FIREBASE_* values.',
        kind: GatewayFailureKind.notConfigured,
      );
    }

    if (app.options.projectId != config.projectId || app.options.appId != config.appId) {
      throw const GatewayFailure(
        'The running Firebase app does not match the configured project. Restart the app.',
        kind: GatewayFailureKind.notConfigured,
      );
    }

    final firestore = FirebaseFirestore.instanceFor(app: app);
    // No on-device cache: every page is a real read or an honest failure.
    firestore.settings = const Settings(persistenceEnabled: false);

    // Google Sign-In v7 is a singleton and has to be initialised once before it
    // can be used. Without a google-services.json in the build, Android needs the
    // project's *web* OAuth client id here, so a missing one is reported as a
    // configuration problem rather than as a mysterious failure at sign-in time.
    var googleReady = false;
    try {
      await GoogleSignIn.instance.initialize(
        serverClientId:
            config.googleServerClientId.isEmpty ? null : config.googleServerClientId,
      );
      googleReady = true;
    } on GoogleSignInException {
      googleReady = false;
    }

    return LiveSchool._(
      FirebaseSchoolGateway(
        auth: FirebaseAuth.instanceFor(app: app),
        firestore: firestore,
        scope: scope,
        googleSignIn: GoogleSignIn.instance,
        googleReady: googleReady,
      ),
    );
  }
}
