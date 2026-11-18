import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/sample_timetable.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/school_day.dart';

import 'fake_gateway.dart';

void main() {
  test('fictional timetable has five weekdays with three lessons each', () {
    expect(sampleTimetable.keys, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    for (final lessons in sampleTimetable.values) {
      expect(lessons.length, 3);
    }
  });

  testWidgets('day selection changes sample lessons, not practice marks', (tester) async {
    final gateway = FakeGateway();
    final session = AppSession(gateway);
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: Scaffold(
      body: SchoolDayScreen(session: session, onOpenRegister: () {}),
    )));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Present').first, 150, scrollable: find.byType(Scrollable).first);
    await tester.tap(find.text('Present').first); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Sample schedule only'), 300, scrollable: find.byType(Scrollable).first);
    expect(find.textContaining('not the saved school timetable'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Mathematics'), 200, scrollable: find.byType(Scrollable).first);
    expect(find.text('Mathematics'), findsOneWidget);
    final dropdown = find.byType(DropdownButtonFormField<String>);
    await tester.ensureVisible(dropdown); await tester.pumpAndSettle();
    await tester.tap(dropdown); await tester.pumpAndSettle();
    await tester.tap(find.text('Tuesday').last); await tester.pumpAndSettle();
    expect(find.text('History'), findsOneWidget);
    expect(find.text('Mathematics'), findsNothing);
    tester.state<ScrollableState>(find.byType(Scrollable).first).position.jumpTo(0);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('1 of 6 marked'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('1 of 6 marked'), findsOneWidget);
    expect(gateway.loadCalls, 0);
    session.dispose();
    await gateway.close();
  });
}
