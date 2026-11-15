/// The sample preview, as a [SchoolGateway].
///
/// This exists so the app is not a set of pictures: the whole flow — onboarding,
/// sign-in, register, pages, search, learner detail, sign-out — runs on this
/// gateway in a classroom with no account and no connection. The rows are
/// fictional and every screen that shows them carries the label in words.
///
/// Two rules it keeps so the preview never teaches a lie:
///  * it never falls back to the live gateway, and the live gateway never falls
///    back to it;
///  * its ids are prefixed `sample-`, so no record here can be mistaken for, or
///    written to, a real one.
library;

import 'dart:async';
import 'dart:math' as math;

import 'learner.dart';
import 'school_gateway.dart';

class SampleGateway implements SchoolGateway {
  SampleGateway({List<Learner>? rows}) : _all = rows ?? sampleLearners;

  /// Fictional learners. Fictional names, fictional guardians, and a school that
  /// does not exist. Nothing here is a claim about any real school.
  static const List<Learner> sampleLearners = [
    Learner(
      id: 'sample-1',
      name: 'Amina Juma',
      className: 'Form 1 A',
      status: 'Active',
      guardianName: 'Fatuma Juma',
      guardianPhone: '+255 700 000 001',
      guardianEmail: 'guardian.one@example.test',
      balance: 0,
      type: 'Day',
    ),
    Learner(
      id: 'sample-2',
      name: 'Baraka John',
      className: 'Form 2 B',
      status: 'Active',
      guardianName: 'John Mwenda',
      guardianPhone: '+255 700 000 002',
      guardianEmail: 'guardian.two@example.test',
      balance: 45000,
      type: 'Day',
    ),
    Learner(
      id: 'sample-3',
      name: 'Neema Peter',
      className: 'Form 3 A',
      status: 'Active',
      guardianName: 'Peter Massawe',
      guardianPhone: '+255 700 000 003',
      guardianEmail: 'guardian.three@example.test',
      balance: 120000,
      type: 'Boarding',
    ),
    Learner(
      id: 'sample-4',
      name: 'Hamisi Ally',
      className: 'Form 2 B',
      status: 'Active',
      guardianName: 'Ally Hamisi',
      guardianPhone: '+255 700 000 004',
      guardianEmail: 'guardian.four@example.test',
      balance: 0,
      type: 'Day',
    ),
    Learner(
      id: 'sample-5',
      name: 'Zuwena Said',
      className: 'Form 4 C',
      status: 'Active',
      guardianName: 'Said Zuwena',
      guardianPhone: '+255 700 000 005',
      guardianEmail: 'guardian.five@example.test',
      balance: 18000,
      type: 'Boarding',
    ),
    Learner(
      id: 'sample-6',
      name: 'Joseph Mwakyusa',
      className: 'Form 1 A',
      status: 'Active',
      guardianName: 'Maria Mwakyusa',
      guardianPhone: '+255 700 000 006',
      guardianEmail: 'guardian.six@example.test',
      balance: 0,
      type: 'Day',
    ),
  ];

  final List<Learner> _all;

  /// True once the preview has "signed in". Explicit, and only in this session.
  String? _uid;

  /// Replays the current session to the first listener, then follows changes.
  /// Without the replay a screen would sit on "checking your session" forever.
  late final StreamController<String?> _session = StreamController<String?>.broadcast(
    onListen: () => _session.add(_uid),
  );

  /// The preview pretends to be slow for exactly one page, so the loading state
  /// is real and visible rather than something that only exists in theory.
  static const Duration latency = Duration(milliseconds: 420);

  @override
  String get sourceLabel => 'Sample · fictional learners';

  @override
  Stream<String?> get sessionUid => _session.stream;

  @override
  Future<void> signIn() async {
    await Future<void>.delayed(latency);
    _uid = 'sample-staff';
    _session.add(_uid);
  }

  @override
  Future<void> signOut() async {
    _uid = null;
    _session.add(null);
  }

  @override
  Future<LearnerPage> loadLearners({int limit = kSamplePageSize, Object? after}) async {
    await Future<void>.delayed(latency);
    if (_uid == null) {
      throw const GatewayFailure(
        'Sign in to the sample preview first.',
        kind: GatewayFailureKind.signedOut,
      );
    }

    final start = after is int ? after : 0;
    if (after != null && after is! int) {
      throw const GatewayFailure('That page link is not valid. Start from the first page.');
    }
    if (start >= _all.length) {
      return const LearnerPage(rows: []);
    }

    final end = math.min(start + limit, _all.length);
    return LearnerPage(
      rows: _all.sublist(start, end),
      nextCursor: end < _all.length ? end : null,
    );
  }

  Future<void> dispose() => _session.close();
}

/// The preview's page size. Deliberately smaller than the live 40 so paging can
/// be seen and tested without scrolling a long list.
const int kSamplePageSize = 4;
