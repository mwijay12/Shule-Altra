import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/data/learner.dart';

import 'fake_gateway.dart';

class _SlowGateway extends FakeGateway {
  final pending = Completer<LearnerPage>();
  @override
  Future<LearnerPage> loadLearners({int limit = 40, Object? after}) => pending.future;
}

void main() {
  testWidgets('sign out is available during a pending read and ignores the old result', (tester) async {
    final gateway = _SlowGateway();
    gateway.signedInAs('staff');
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.live));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Learners')));
    await tester.pump(); await tester.pump(const Duration(milliseconds: 300));
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('More')));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Sign out')); await tester.pumpAndSettle();
    await tester.tap(find.text('Sign out')); await tester.pumpAndSettle();
    expect(gateway.signOutCalls, 1);
    gateway.pending.complete(LearnerPage(rows: [Learner.fromDocument('old', {'name': 'Old private learner'})]));
    await tester.pumpAndSettle();
    expect(find.text('Old private learner'), findsNothing);
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Learners')));
    await tester.pumpAndSettle();
    expect(find.text('Continue with Google'), findsOneWidget);
    expect(find.text('Old private learner'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.close();
  });
}
