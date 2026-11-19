/// A gateway for tests: the same interface the live app uses, without Firebase.
///
/// It can be told to fail in each of the ways the real one can, so the screens'
/// failure states are tested instead of assumed.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:shule_altra_mobile/data/demo_credentials.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';

class FakeGateway implements SchoolGateway {
  FakeGateway({List<Learner>? rows, this.pageSize = 2})
      : _all = rows ??
            const [
              Learner(
                id: 'fake-1',
                name: 'Amina Juma',
                className: 'Form 1 A',
                status: 'Active',
                guardianName: 'Fatuma Juma',
                guardianPhone: '+255 700 000 001',
                guardianEmail: 'one@example.test',
                balance: 0,
                type: 'Day',
              ),
              Learner(
                id: 'fake-2',
                name: 'Baraka John',
                className: 'Form 2 B',
                status: 'Active',
                guardianName: 'John Mwenda',
                guardianPhone: '+255 700 000 002',
                guardianEmail: 'two@example.test',
                balance: 45000,
                type: 'Day',
              ),
              Learner(
                id: 'fake-3',
                name: 'Neema Peter',
                className: 'Form 3 A',
                status: 'Active',
                guardianName: 'Peter Massawe',
                guardianPhone: '+255 700 000 003',
                guardianEmail: 'three@example.test',
                balance: 0,
                type: 'Boarding',
              ),
            ];

  final List<Learner> _all;
  final int pageSize;

  late final StreamController<String?> _controller = StreamController<String?>.broadcast(
    onListen: () => _controller.add(_uid),
  );

  String? _uid;

  /// Make the next [loadLearners] throw this.
  GatewayFailure? loadFailure;

  /// Make the next [signIn] throw this.
  GatewayFailure? signInFailure;
  GatewayFailure? signOutFailure;

  int loadCalls = 0;
  int signInCalls = 0;
  int signOutCalls = 0;

  @override
  String get sourceLabel => 'Fake';

  @override
  Stream<String?> get sessionUid => _controller.stream;

  /// Pretend a session already exists, as after a restart with a live token.
  void signedInAs(String uid) {
    _uid = uid;
    _controller.add(uid);
  }

  @override
  Future<void> signIn() async {
    signInCalls++;
    final failure = signInFailure;
    if (failure != null) throw failure;
    _uid = 'fake-staff';
    _controller.add(_uid);
  }

  /// A test can opt the fake into the demo door; by default it behaves like the
  /// live gateway and refuses.
  bool demoDoor = false;

  @override
  bool get acceptsDemoCredential => demoDoor;

  @override
  DemoIdentity? get demoIdentity => demoDoor && _uid == 'fake-demo'
      // The account the app actually reports, so a test never has to know the
      // address by heart.
      ? DemoCredentials.identity
      : null;

  @override
  Future<void> signInWithDemo(String email, String password) async {
    if (!demoDoor) {
      throw const GatewayFailure(
        'This data source does not take the demo sign-in.',
        kind: GatewayFailureKind.signedOut,
      );
    }
    _uid = 'fake-demo';
    _controller.add(_uid);
  }

  @override
  Future<void> signOut() async {
    signOutCalls++;
    final failure = signOutFailure;
    if (failure != null) throw failure;
    _uid = null;
    _controller.add(null);
  }

  @override
  Future<LearnerPage> loadLearners({int limit = 40, Object? after}) async {
    loadCalls++;
    final failure = loadFailure;
    if (failure != null) throw failure;
    if (_uid == null) {
      throw const GatewayFailure('Not signed in.', kind: GatewayFailureKind.signedOut);
    }
    final start = after is int ? after : 0;
    final end = math.min(start + pageSize, _all.length);
    return LearnerPage(
      rows: _all.sublist(start, end),
      nextCursor: end < _all.length ? end : null,
    );
  }

  Future<void> close() => _controller.close();
}
