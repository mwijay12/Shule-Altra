import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/demo_school_store.dart';
import 'package:shule_altra_mobile/data/sample_timetable.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/school_day.dart';

import 'fake_gateway.dart';

void main() {
  test('sample timetable has five weekdays with three lessons each', () {
    expect(sampleTimetable.keys, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    for (final lessons in sampleTimetable.values) {
      expect(lessons.length, 3);
    }
  });

  testWidgets('day selection switches weekday lessons cleanly', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    final session = AppSession(gateway);
    final workspace = SchoolWorkspace();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.light),
        home: Scaffold(
          body: SchoolDayScreen(
            session: session,
            workspace: workspace,
            initialTab: SchoolDayTab.timetable,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Form 4 · Monday'), findsOneWidget);
    expect(find.text('Mathematics'), findsOneWidget);

    await tester.tap(find.text('Tue'));
    await tester.pumpAndSettle();
    expect(find.text('Form 4 · Tuesday'), findsOneWidget);
    expect(find.text('History'), findsOneWidget);
    expect(find.text('Mathematics'), findsNothing);

    workspace.dispose();
    session.dispose();
    await gateway.close();
  });
}
