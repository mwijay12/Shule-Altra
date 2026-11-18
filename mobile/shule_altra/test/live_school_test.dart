import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/live_school.dart';
import 'package:shule_altra_mobile/live_timetable.dart';

class FakeSchoolGateway implements SchoolGateway {
  final controller = StreamController<String?>.broadcast();
  bool fail = false;
  Object? readError;
  String lastPrefix = '';
  Object? lastCursor;
  int learnerLoads = 0;
  @override Stream<String?> get sessionUid => controller.stream;
  @override Future<void> signInWithGoogle() async { controller.add('staff-1'); }
  @override Future<LiveTimetable?> loadTimetable(String className, String stream) async => const LiveTimetable({'monday_p1': TimetableSlot('Mathematics', 'Mwalimu A', 'Room 1')});
  @override Future<void> signOut() async { controller.add(null); }
  @override Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''}) async {
    lastPrefix = namePrefix;
    lastCursor = after;
    learnerLoads++;
    if (readError != null) throw readError!;
    if (fail) throw StateError('offline');
    return after == null ? const LearnerPage([LiveLearner('Example Learner', 'Form 1', recordId: 'student-001', admissionNumber: 'A-001', residence: 'Day', enrollmentDate: '2026-01-01', attendanceStatus: 'Late', attendanceUpdateTime: '08:15', guardianName: 'Example Guardian', guardianEmail: 'guardian@example.test')], 'next') : const LearnerPage([LiveLearner('Second Learner', 'Form 2')], null);
  }
}

class DelayedSchoolGateway extends FakeSchoolGateway {
  final pending = Completer<LearnerPage>();
  @override Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''}) => pending.future;
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
    final row = LiveLearner.fromFirestore({'name': ' Amina ', 'class': null, 'guardianPhone': 123, 'guardianEmail': ' x@example.test ', 'type': ' Day ', 'enrollmentDate': 20260101, 'admissionNumber': ' A-123 ', 'attendanceStatus': ' Late ', 'lastAttendanceUpdate': 815}, recordId: 'doc-1');
    expect(row.name, 'Amina');
    expect(row.className, 'Class not set');
    expect(row.guardianPhone, '');
    expect(row.guardianEmail, 'x@example.test');
    expect(row.recordId, 'doc-1');
    expect(row.admissionNumber, 'A-123');
    expect(row.residence, 'Day');
    expect(row.enrollmentDate, '');
    expect(row.attendanceStatus, 'Late');
    expect(row.attendanceUpdateTime, '');
  });
  testWidgets('timetable clears a previous class and handles empty and failed reads', (tester) async {
    var calls = 0;
    var fail = false;
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: LiveTimetablePanel(
      onBack: () {}, onSignOut: () {},
      load: (className, stream) async {
        calls++;
        if (fail) throw StateError('unavailable');
        if (className == 'Form 2') return null;
        return const LiveTimetable({'monday_p1': TimetableSlot('Mathematics', 'Teacher', 'Room')});
      },
    ))));
    await tester.scrollUntilVisible(find.textContaining('Choose a class and stream'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('Choose a class and stream'), findsOneWidget);
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mathematics'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mathematics'), findsOneWidget);
    final classField = find.byType(DropdownButtonFormField<String>).first;
    await tester.ensureVisible(classField); await tester.pumpAndSettle();
    await tester.tap(classField); await tester.pumpAndSettle();
    await tester.tap(find.text('Form 2').last); await tester.pumpAndSettle();
    expect(find.text('Mathematics'), findsNothing);
    expect(calls, 1, reason: 'changing class requires an explicit load');
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('No saved schedule for this class and stream.'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('No saved schedule for this class and stream.'), findsOneWidget);
    fail = true;
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.textContaining('Could not load this schedule.'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('Could not load this schedule.'), findsOneWidget);
  });

  testWidgets('register keeps visible search state when navigating and clears a page filter', (tester) async {
    final fake = FakeSchoolGateway();
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add('staff-1'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    final schoolSearch = find.widgetWithText(TextField, 'School name prefix');
    await tester.ensureVisible(schoolSearch); await tester.pumpAndSettle();
    await tester.enterText(schoolSearch, 'Example');
    await tester.scrollUntilVisible(find.text('Workspace'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Workspace')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(schoolSearch, 150, scrollable: find.byType(Scrollable).first);
    expect(tester.widget<TextField>(schoolSearch).controller!.text, 'Example');
    await tester.ensureVisible(find.text('Search school')); await tester.pumpAndSettle();
    await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    final pageSearch = find.widgetWithText(TextField, 'Search loaded learners');
    await tester.scrollUntilVisible(pageSearch, 200, scrollable: find.byType(Scrollable).first);
    await tester.enterText(pageSearch, 'not found'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('No learners shown'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('No learners shown'), findsOneWidget);
    await tester.scrollUntilVisible(find.byTooltip('Clear page filter'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Clear page filter')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Example Learner'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Example Learner'), findsOneWidget);
    expect(fake.lastPrefix, 'Example');
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });

  testWidgets('stored attendance and ID filters apply only to the loaded page', (tester) async {
    final fake = FakeSchoolGateway();
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add('staff-1'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Search school')); await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    final filter = find.byType(DropdownButtonFormField<String>);
    await tester.scrollUntilVisible(filter, 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(filter); await tester.pumpAndSettle();
    await tester.tap(find.text('Absent').last); await tester.pumpAndSettle();
    expect(find.text('No learners shown'), findsOneWidget);
    expect(find.text('Example Learner'), findsNothing);
    await tester.ensureVisible(filter); await tester.tap(filter); await tester.pumpAndSettle();
    await tester.tap(find.text('Late').last); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    final pageSearch = find.widgetWithText(TextField, 'Search loaded learners');
    await tester.ensureVisible(pageSearch); await tester.pumpAndSettle();
    await tester.enterText(pageSearch, 'a-001'); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    expect(fake.learnerLoads, 1, reason: 'page filters do not query the school');
    await tester.scrollUntilVisible(find.text('Next page'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Next page')); await tester.pumpAndSettle();
    expect(find.text('Second Learner'), findsOneWidget, reason: 'page change resets local filters');
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });

  testWidgets('register explains permission denial without showing raw errors', (tester) async {
    final fake = FakeSchoolGateway()..readError = FirebaseException(plugin: 'test', code: 'permission-denied', message: 'sensitive server message');
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add('staff-1'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Search school')); await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.textContaining('Ask your school administrator to check your access'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('Ask your school administrator to check your access'), findsOneWidget);
    expect(find.textContaining('sensitive server message'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });

  testWidgets('late learner response cannot reappear after an account change', (tester) async {
    final fake = DelayedSchoolGateway();
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add('staff-1'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Search school')); await tester.tap(find.text('Search school')); await tester.pump();
    fake.controller.add('staff-2'); await tester.pump();
    fake.pending.complete(const LearnerPage([LiveLearner('Old account learner', 'Form 1', guardianEmail: 'private@example.test')], null));
    await tester.pumpAndSettle();
    expect(find.text('Old account learner'), findsNothing);
    expect(find.text('private@example.test'), findsNothing);
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    expect(find.text('Start with a search'), findsOneWidget);
    expect(find.text('Old account learner'), findsNothing);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });

  testWidgets('school screens remain usable on a narrow phone with larger text', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final previousErrorHandler = FlutterError.onError;
    FlutterError.onError = (details) { debugPrint(details.toString()); previousErrorHandler?.call(details); };
    addTearDown(() => FlutterError.onError = previousErrorHandler);
    final fake = FakeSchoolGateway();
    await tester.pumpWidget(MediaQuery(data: const MediaQueryData(textScaler: TextScaler.linear(1.5)), child: MaterialApp(home: LiveSchoolPage(gateway: fake))));
    fake.controller.add('staff-1'); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Search school'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Example Learner'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    expect(find.text('student-001'), findsOneWidget);
    expect(find.text('A-001'), findsOneWidget);
    expect(find.text('Latest stored attendance'), findsOneWidget);
    expect(find.text('Late'), findsOneWidget);
    expect(find.textContaining('not a dated attendance history'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('guardian@example.test'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(find.text('Timetable'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Load timetable'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mathematics'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });

  testWidgets('sign in, load, error and account switch discard displayed records', (tester) async {
    final fake = FakeSchoolGateway();
    await tester.pumpWidget(MaterialApp(home: LiveSchoolPage(gateway: fake)));
    fake.controller.add(null); await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google')); await tester.pumpAndSettle();
    expect(find.text('Your workspace'), findsOneWidget);
    expect(find.text('Signed in · online reads only'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Timetable'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Timetable')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mathematics'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mathematics'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Short break'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Short break'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Learner register'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextField, 'School name prefix'), 'Example');
    await tester.ensureVisible(find.text('Search school')); await tester.pumpAndSettle();
    await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    expect(fake.lastPrefix, 'Example');
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('guardian@example.test'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('guardian@example.test'), findsOneWidget);
    await tester.drag(find.byType(ListView), const Offset(0, -450)); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Next page')); await tester.pumpAndSettle(); await tester.tap(find.text('Next page')); await tester.pumpAndSettle();
    expect(find.text('Second Learner'), findsOneWidget);
    expect(fake.lastPrefix, 'Example', reason: 'pagination keeps the server search');
    await tester.scrollUntilVisible(find.text('Reload this page'), -200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle();
    expect(find.textContaining('Read completed'), findsOneWidget);
    await tester.tap(find.text('Reload this page')); await tester.pumpAndSettle();
    expect(fake.lastCursor, 'next', reason: 'reload stays on the current page');
    expect(fake.lastPrefix, 'Example');
    expect(fake.learnerLoads, 3);
    await tester.scrollUntilVisible(find.text('Second Learner'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Second Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Previous page')); await tester.pumpAndSettle(); await tester.tap(find.text('Previous page')); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsOneWidget);
    await tester.ensureVisible(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.tap(find.text('Example Learner')); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('guardian@example.test'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('guardian@example.test'), findsOneWidget);
    fake.controller.add('staff-2'); await tester.pumpAndSettle();
    expect(find.text('Example Learner'), findsNothing);
    expect(find.text('guardian@example.test'), findsNothing);
    fake.fail = true;
    expect(find.text('Your workspace'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Learner register'), 200, scrollable: find.byType(Scrollable).first); await tester.pumpAndSettle(); await tester.tap(find.text('Learner register')); await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Search school')); await tester.pumpAndSettle(); await tester.tap(find.text('Search school')); await tester.pumpAndSettle();
    expect(find.text('Could not load learners'), findsOneWidget);
    await tester.ensureVisible(find.text('Sign out')); await tester.pumpAndSettle(); await tester.tap(find.text('Sign out')); await tester.pumpAndSettle();
    expect(find.text('Continue with Google'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await fake.controller.close();
  });
}
