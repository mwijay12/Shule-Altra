/// The one door to school data.
///
/// A gateway is an interface on purpose: the Firebase implementation lives in
/// `firebase_gateway.dart` and the sample preview in `sample_gateway.dart`, and
/// the screens cannot tell the difference. Widget tests use a fake, so the UI is
/// tested without a network, a project or an account.
///
/// What a gateway may and may not promise, stated once: this pilot is **online
/// and read-only**. Nothing here writes, queues, retries in the background or
/// shows cached learner data as if it were current.
library;

import 'learner.dart';

/// Why a read or a sign-in did not work, in words a person can act on.
class GatewayFailure implements Exception {
  const GatewayFailure(this.message, {this.kind = GatewayFailureKind.other});

  /// A sentence for the screen. Never a stack trace, never an error code alone.
  final String message;
  final GatewayFailureKind kind;

  @override
  String toString() => message;
}

enum GatewayFailureKind {
  /// Not signed in, or the session ended.
  signedOut,

  /// Signed in, but the school's rules refused this read.
  denied,

  /// The phone could not reach Firebase.
  offline,

  /// The build has no Firebase configuration for this school.
  notConfigured,

  /// Anything else, including a malformed record.
  other,
}

/// Which school this build talks to. Deliberately not a guess.
class SchoolScope {
  const SchoolScope({required this.schoolId});

  final String schoolId;

  /// The web product's school. A different school is a different deployment.
  static const fallback = SchoolScope(schoolId: 'school-001');
}

abstract class SchoolGateway {
  /// Reads the data source: 'live' or 'sample'. Shown in the UI, never assumed.
  String get sourceLabel;

  /// The signed-in uid, or null. Emits on sign-in, sign-out and account change.
  Stream<String?> get sessionUid;

  /// Sign in with the Google account the school already uses.
  Future<void> signIn();

  Future<void> signOut();

  /// One page of learners, ordered by name. Throws [GatewayFailure] rather than
  /// returning a partial or stale list.
  Future<LearnerPage> loadLearners({int limit = 40, Object? after});
}
