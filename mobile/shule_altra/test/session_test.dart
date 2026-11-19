/// The session is where a real bug would hurt: records surviving an account
/// change, or a failure leaving a blank screen. Both are tested here.
library;

import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';

import 'fake_gateway.dart';

class DelayedGateway extends FakeGateway {
  final requests = <Completer<LearnerPage>>[];

  @override
  Future<LearnerPage> loadLearners({int limit = 40, Object? after}) {
    final pending = Completer<LearnerPage>();
    requests.add(pending);
    return pending.future;
  }
}

void main() {
  test('signing in loads a page, and the count is the page, not the school', () async {
    final gateway = FakeGateway(pageSize: 2);
    final session = AppSession(gateway);
    await session.start();
    await Future<void>.delayed(Duration.zero);

    expect(session.signedIn, isFalse);
    await session.signIn();
    await Future<void>.delayed(Duration.zero);

    expect(session.signedIn, isTrue);
    await session.loadFirstPage();
    expect(session.state, LoadState.ready);
    expect(session.rows.length, 2);
    expect(session.canGoForward, isTrue);
    expect(session.canGoBack, isFalse);

    await session.loadNextPage();
    expect(session.rows.length, 1);
    expect(session.canGoForward, isFalse);
    expect(session.canGoBack, isTrue);
    expect(session.rows.first.name, 'Neema Peter');

    // Back to the first page. This is a fresh read, so it costs a load.
    await session.loadPreviousPage();
    expect(session.rows.first.name, 'Amina Juma');
    await gateway.close();
    session.dispose();
  });

  test('a different account discards the records already on screen', () async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    await session.loadFirstPage();
    expect(session.rows, isNotEmpty);

    // The account changes underneath the app.
    gateway.signedInAs('someone-else');
    await Future<void>.delayed(Duration.zero);

    expect(session.rows, isEmpty);
    expect(session.state, LoadState.idle);
    expect(session.canGoForward, isFalse);
    expect(session.canGoBack, isFalse);
    await gateway.close();
    session.dispose();
  });

  test('late response from old account cannot overwrite a new account read', () async {
    final gateway = DelayedGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    final oldRead = session.loadFirstPage();
    gateway.signedInAs('new-staff');
    await Future<void>.delayed(Duration.zero);
    expect(session.rows, isEmpty);
    expect(session.busy, isFalse);
    final newRead = session.loadFirstPage();
    gateway.requests[0].complete(LearnerPage(rows: [Learner.fromDocument('old', {'name': 'Old account'})]));
    await oldRead;
    expect(session.rows, isEmpty);
    expect(session.busy, isTrue, reason: 'old completion cannot unlock the current read');
    gateway.requests[1].complete(LearnerPage(rows: [Learner.fromDocument('new', {'name': 'New account'})]));
    await newRead;
    expect(session.rows.single.name, 'New account');
    expect(session.busy, isFalse);
    session.dispose();
    await gateway.close();
  });

  test('sign out is not blocked by a pending read and ignores its late failure', () async {
    final gateway = DelayedGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    final read = session.loadFirstPage();
    await session.signOut();
    await Future<void>.delayed(Duration.zero);
    expect(gateway.signOutCalls, 1);
    expect(session.signedIn, isFalse);
    gateway.requests.single.completeError(const GatewayFailure('old failure'));
    await read;
    expect(session.rows, isEmpty);
    expect(session.failure, isNull);
    expect(session.state, LoadState.idle);
    session.dispose();
    await gateway.close();
  });

  test('failed sign out clears data but reports failure for a safe retry', () async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    await session.loadFirstPage();
    final revision = session.dataRevision;
    gateway.signOutFailure = const GatewayFailure('Sign-out failed. Try again.');
    expect(await session.signOut(), isFalse);
    expect(session.rows, isEmpty);
    expect(session.dataRevision, greaterThan(revision));
    expect(session.signedIn, isTrue);
    expect(session.failure, contains('Sign-out failed'));
    gateway.signOutFailure = null;
    expect(await session.signOut(), isTrue);
    await Future<void>.delayed(Duration.zero);
    expect(session.signedIn, isFalse);
    session.dispose();
    await gateway.close();
  });

  test('a refused read is explained and leaves no rows behind', () async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);

    gateway.loadFailure = const GatewayFailure(
      'The school rules refused this read.',
      kind: GatewayFailureKind.denied,
    );
    await session.loadFirstPage();

    expect(session.state, LoadState.failed);
    expect(session.rows, isEmpty);
    expect(session.failure, contains('refused'));
    await gateway.close();
    session.dispose();
  });

  test('signing out clears everything, and signing back in starts from page one', () async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    await session.loadFirstPage();
    await session.loadNextPage();
    expect(session.canGoBack, isTrue);

    await session.signOut();
    expect(session.signedIn, isFalse);
    expect(session.rows, isEmpty);
    expect(session.canGoBack, isFalse);
    expect(gateway.signOutCalls, 1);

    await session.signIn();
    await Future<void>.delayed(Duration.zero);
    await session.loadFirstPage();
    expect(session.rows.first.name, 'Amina Juma');
    await gateway.close();
    session.dispose();
  });
}
