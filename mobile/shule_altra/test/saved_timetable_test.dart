import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/saved_timetable.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/saved_timetable.dart';

import 'fake_gateway.dart';

class FakeTimetableReader implements TimetableReader {
  final pending = <Completer<SavedTimetable?>>[];
  @override
  Future<SavedTimetable?> loadTimetable(String className, String stream) {
    final request = Completer<SavedTimetable?>();
    pending.add(request);
    return request.future;
  }
}

class DelayedSignOutGateway extends FakeGateway {
  final pendingSignOut = Completer<void>();
  @override
  Future<void> signOut() => pendingSignOut.future;
}

void main() {
  test('web schedule IDs and validated slots', () {
    expect(timetableId('Form 1', 'A'), 'schedule-form-1-a');
    expect(() => timetableId('Form 9', 'A'), throwsArgumentError);
    final schedule = SavedTimetable.parse({
      'schemaVersion': 1, 'className': 'Form 1', 'stream': 'A',
      'slots': {'monday_p1': {'subject': 'Math', 'teacher': 'Teacher A', 'room': 'Room 1'}},
    }, 'Form 1', 'A');
    expect(schedule.slot('Monday', 'p1')?.subject, 'Math');
    expect(schedule.slot('Tuesday', 'p1'), isNull);
    expect(() => SavedTimetable.parse({'schemaVersion': 1, 'className': 'Form 2', 'stream': 'A', 'slots': {}}, 'Form 1', 'A'), throwsFormatException);
    expect(() => SavedTimetable.parse({'schemaVersion': 1, 'className': 'Form 1', 'stream': 'A', 'slots': {'monday_p1': {'subject': 1}}}, 'Form 1', 'A'), throwsFormatException);
  });

  testWidgets('changing account discards an in-flight timetable read', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    final reader = FakeTimetableReader();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: SavedTimetableScreen(session: session, reader: reader)));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pump();
    gateway.signedInAs('other-account');
    await tester.pump();
    reader.pending.single.complete(const SavedTimetable({'monday_p1': TimetableSlot('Private lesson', '', '')}));
    await tester.pumpAndSettle();
    expect(find.text('Private lesson'), findsNothing);
    expect(find.textContaining('Choose a class and stream'), findsOneWidget);
    await tester.tap(find.text('Load timetable')); await tester.pump();
    reader.pending.last.complete(null);
    await tester.pumpAndSettle();
    expect(find.text('No saved schedule'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    session.dispose();
    await gateway.close();
  });

  testWidgets('class changes clear a loaded timetable before the next read', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    final reader = FakeTimetableReader();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: SavedTimetableScreen(session: session, reader: reader)));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pump();
    reader.pending.single.complete(const SavedTimetable({'monday_p1': TimetableSlot('Mathematics', 'Teacher', '')}));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Mathematics'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mathematics'), findsOneWidget);
    await tester.ensureVisible(find.byType(DropdownButtonFormField<String>).first); await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Form 2').last); await tester.pumpAndSettle();
    expect(find.text('Mathematics'), findsNothing);
    expect(reader.pending.length, 1);
    await tester.pumpWidget(const SizedBox());
    session.dispose();
    await gateway.close();
  });
  testWidgets('sign-out invalidation clears loaded and pending timetable even if sign-out fails', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    final reader = FakeTimetableReader();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: SavedTimetableScreen(session: session, reader: reader)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pump();
    reader.pending.single.complete(const SavedTimetable({'monday_p1': TimetableSlot('Private lesson', '', '')}));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Private lesson'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Private lesson'), findsOneWidget);
    expect(find.textContaining('Read on this device'), findsOneWidget);
    gateway.signOutFailure = const GatewayFailure('Could not sign out');
    expect(await session.signOut(), isFalse);
    await tester.pumpAndSettle();
    expect(find.text('Private lesson'), findsNothing);
    await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pump();
    expect(await session.signOut(), isFalse);
    await tester.pump();
    reader.pending.last.complete(const SavedTimetable({'monday_p1': TimetableSlot('Stale lesson', '', '')}));
    await tester.pumpAndSettle();
    expect(find.text('Stale lesson'), findsNothing);
    expect(find.textContaining('Choose a class and stream'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose(); await gateway.close();
  });

  testWidgets('class changes during a read discard the old result, and day changes do not read again', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await session.start(); await gateway.signIn(); await tester.pump();
    final reader = FakeTimetableReader();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: SavedTimetableScreen(session: session, reader: reader)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Load timetable')); await tester.pump();
    await tester.tap(find.byType(DropdownButtonFormField<String>).first); await tester.pumpAndSettle();
    await tester.tap(find.text('Form 2').last); await tester.pumpAndSettle();
    reader.pending.first.complete(const SavedTimetable({'monday_p1': TimetableSlot('Old class lesson', '', '')}));
    await tester.pumpAndSettle();
    expect(find.text('Old class lesson'), findsNothing);
    await tester.tap(find.text('Load timetable')); await tester.pump();
    reader.pending.last.complete(const SavedTimetable({
      'monday_p1': TimetableSlot('New class lesson', '', ''),
      'tuesday_p1': TimetableSlot('Tuesday science', '', ''),
    }));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byType(DropdownButtonFormField<String>).last); await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String>).last); await tester.pumpAndSettle();
    await tester.tap(find.text('Tuesday').last); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Tuesday science'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Tuesday science'), findsOneWidget);
    expect(reader.pending.length, 2);
    await tester.pumpWidget(const SizedBox.shrink()); session.dispose(); await gateway.close();
  });

  testWidgets('school timetable cannot be re-read while sign-out is pending', (tester) async {
    final gateway = DelayedSignOutGateway();
    final session = AppSession(gateway);
    await session.start(); await gateway.signIn(); await tester.pump();
    final reader = FakeTimetableReader();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: SavedTimetableScreen(session: session, reader: reader)));
    await tester.pumpAndSettle();
    final signOut = session.signOut(); await tester.pump();
    final button = tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Load timetable'));
    expect(button.onPressed, isNull);
    expect(reader.pending, isEmpty);
    gateway.pendingSignOut.completeError(const GatewayFailure('Sign out failed'));
    expect(await signOut, isFalse); await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Load timetable')).onPressed, isNotNull);
    await tester.pumpWidget(const SizedBox.shrink()); session.dispose(); await gateway.close();
  });

}
