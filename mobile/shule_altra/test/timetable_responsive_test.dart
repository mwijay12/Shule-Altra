import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/saved_timetable.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/sample_timetable.dart';
import 'package:shule_altra_mobile/screens/saved_timetable.dart';

import 'fake_gateway.dart';

class _Reader implements TimetableReader {
  @override
  Future<SavedTimetable?> loadTimetable(String className, String stream) async =>
      const SavedTimetable({'monday_p1': TimetableSlot('Mathematics', 'Teacher A', 'Room 1')});
}

void main() {
  for (final dark in [false, true]) {
    testWidgets('both timetables fit a small phone with large text, dark=$dark', (tester) async {
      tester.view.physicalSize = const Size(320 * 2, 640 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final gateway = FakeGateway();
      final session = AppSession(gateway);
      await session.start(); await gateway.signIn(); await tester.pump();
      Widget wrap(Widget child) => MaterialApp(
        theme: buildTheme(dark ? Brightness.dark : Brightness.light),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: child,
      );
      await tester.pumpWidget(wrap(SampleTimetableScreen(initialDay: 'Monday', onDayChanged: (_) {})));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Mathematics'), 180, scrollable: find.byType(Scrollable).first);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(wrap(SavedTimetableScreen(session: session, reader: _Reader())));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Load timetable'), 180, scrollable: find.byType(Scrollable).first);
      await tester.ensureVisible(find.text('Load timetable')); await tester.pumpAndSettle();
      await tester.tap(find.text('Load timetable')); await tester.pumpAndSettle();
      await tester.scrollUntilVisible(find.text('Mathematics'), 180, scrollable: find.byType(Scrollable).first);
      expect(find.text('Mathematics'), findsOneWidget);
      for (var i = 0; i < 6; i++) {
        await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
        await tester.pumpAndSettle();
      }
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink()); session.dispose(); await gateway.close();
    });
  }
}
