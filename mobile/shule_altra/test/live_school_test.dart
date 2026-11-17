import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/live_school.dart';
import 'package:shule_altra_mobile/live_timetable.dart';

class FakeSchoolGateway implements SchoolGateway {
  final controller = StreamController<String?>.broadcast();
  bool fail = false;
  String lastPrefix = '';
  @override Stream<String?> get sessionUid => controller.stream;
  @override Future<void> signInWithGoogle() async { controller.add('staff-1'); }
  @override Future<LiveTimetable?> loadTimetable(String className, String stream) async => const LiveTimetable({'monday_p1': TimetableSlot('Mathematics', 'Mwalimu A', 'Room 1')});
  @override Future<void> signOut() async { controller.add(null); }
  @override Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''}) async {
    lastPrefix = namePrefix;
    if (fail) throw StateError('offline');
    return after == null ? const LearnerPage([LiveLearner('Example Learner', 'Form 1', guardianName: 'Example Guardian', guardianEmail: 'guardian@example.test')], 'next') : const LearnerPage([LiveLearner('Second Learner', 'Form 2')], null);
  }
}

void main() {
  test('timetable schema, free periods and schedule ID match the web format', () {
    expect(timetableId('Form 1', 'A'), 'schedule-form-1-a');
    final timetable = LiveTimetable.parse({'schemaVersion': 1, 'className': 'Form 1', 'stream': 'A', 'slots': {'monday_p1': {'subject': 'Math', 'teacher': 'Mwalimu', 'room': ''}}}, 'Form 1', 'A');
    expect(timetable.slot('Monday', 'p1')?.subject, 'Math');
    expect(timetable.slot('Monday', 'p2'), isNull);
    expect(timetablePeriods.where((p) => p.isBreak).map((p) => p.id), ['b1', 'b2']);
    expect(() => LiveTimetable.parse({'schemaVersion': 1, 'className': 'Form 2', 'stream': 'A', 'slots': {}}, 'Form 1', 'A'), throwsFormatException);
    expect(() => LiveTimetable.parse({'schemaVersion': 1, 'className': 'Form 1', 'stream': 'A', 'slots': {'monday_p1': {'subject': 1}}}, 'Form 1', 'A'), throwsFormatException);
  });
  test('configuration requires matching explicitly supplied projects', () {
    const good = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'p', apiKey: 'key', appId: 'app', senderId: 'sender', googleWebClientId: 'web-client');
    const mismatch = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'other', apiKey: 'key', appId: 'app', senderId: 'sender', googleWebClientId: 'web-client');
    const missing = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'p', apiKey: '', appId: 'app', senderId: 'sender', googleWebClientId: 'web-client');
    expect(good.isValid, isTrue);
    expect(mismatch.isValid, isFalse);
    expect(missing.isValid, isFalse);
    const noGoogle = SchoolFirebaseConfig(projectId: 'p', expectedProjectId: 'p', apiKey: 'key', appId: 'app', senderId: 'sender', googleWebClientId: '');
    expect(noGoogle.isValid, isFalse);
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
    await tester.tap(find.text('Timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    expect(find.text('Mathematics'), findsOneWidget);
    expect(find.text('Short break'), findsOneWidget);
    await tester.ensureVisible(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'School name prefix'), 'Example');
    await tester.ensureVisible(find.text('Search school')); await tester.pumpAndSettle();
    await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    expect(fake.lastPrefix, 'Example');
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    expect(find.text('guardian@example.test'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -450)); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Next page')); await tester.pumpAndSettle(); await tester.tap(find.text('Next page')); await tester.pumpAndSettle();
    expect(find.text('Second Learner'), findsOneWidget);
    expect(fake.lastPrefix, 'Example', reason: 'pagination keeps the server search');
    await tester.ensureVisible(find.text('Previous page')); await tester.pumpAndSettle(); await tester.tap(find.text('Previous page')); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    expect(find.text('guardian@example.test'), findsOneWidget);
    fake.controller.add('staff-2'); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsNothing);
    expect(find.text('guardian@example.test'), findsNothing);
    fake.fail = true;
    await tester.ensureVisible(find.text('Search school')); await tester.pumpAndSettle(); await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    expect(find.text('Could not load learners'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign out')); await tester.pumpAndSettle(); await tester.tap(find.text('Sign out')); await tester.pumpAndSettle();
    expect(find.text('Continue with Google'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });
}
