import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/live_school.dart';

class FakeSchoolGateway implements SchoolGateway {
  final controller = StreamController<String?>.broadcast();
  bool fail = false;
  @override Stream<String?> get sessionUid => controller.stream;
  @override Future<void> signInWithGoogle() async { controller.add('staff-1'); }
  @override Future<void> signOut() async { controller.add(null); }
  @override Future<LearnerPage> loadLearners({Object? after}) async {
    if (fail) throw StateError('offline');
    return after == null ? const LearnerPage([LiveLearner('Example Learner', 'Form 1', guardianName: 'Example Guardian', guardianEmail: 'guardian@example.test')], 'next') : const LearnerPage([LiveLearner('Second Learner', 'Form 2')], null);
  }
}

void main() {
  test('configuration requires matching explicitly supplied projects', () {
    const good = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'p', apiKey: 'key', appId: 'app', senderId: 'sender');
    const mismatch = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'other', apiKey: 'key', appId: 'app', senderId: 'sender');
    const missing = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'p', apiKey: '', appId: 'app', senderId: 'sender');
    expect(good.isValid, isTrue);
    expect(mismatch.isValid, isFalse);
    expect(missing.isValid, isFalse);
  });
  test('learner parser safely handles missing or malformed details', () {
    final row = LiveLearner.fromFirestore({'name': ' Amina ', 'class': null, 'guardianPhone': 123, 'guardianEmail': ' x@example.test '});
    expect(row.name, 'Amina');
    expect(row.className, 'Class not set');
    expect(row.guardianPhone, '');
    expect(row.guardianEmail, 'x@example.test');
  });
  testWidgets('sign in, load, error and account switch discard displayed records', (tester) async {
    final fake = FakeSchoolGateway();
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add(null); await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load learners')); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    expect(find.text('guardian@example.test'), findsOneWidget);
    await tester.ensureVisible(find.text('Next page')); await tester.tap(find.text('Next page')); await tester.pumpAndSettle();
    expect(find.text('Second Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Previous page')); await tester.tap(find.text('Previous page')); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    expect(find.text('guardian@example.test'), findsOneWidget);
    fake.controller.add('staff-2'); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsNothing);
    expect(find.text('guardian@example.test'), findsNothing);
    fake.fail = true;
    await tester.ensureVisible(find.text('Load learners')); await tester.tap(find.text('Load learners')); await tester.pumpAndSettle();
    expect(find.text('Could not load learners'), findsOneWidget);
    await tester.tap(find.text('Sign out')); await tester.pumpAndSettle();
    expect(find.text('Continue with Google'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });
}
