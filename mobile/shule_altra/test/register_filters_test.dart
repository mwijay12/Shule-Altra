import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/register.dart';

import 'fake_gateway.dart';

Future<void> reveal(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('page filters combine, clear, and reset on a fresh page read', (tester) async {
    final gateway = FakeGateway(pageSize: 2, rows: [
      Learner.fromDocument('one', {'name': 'Amina', 'class': 'Form 1', 'stream': 'A', 'attendanceStatus': 'Late'}),
      Learner.fromDocument('two', {'name': 'Baraka', 'class': 'Form 2', 'attendanceStatus': 'Present'}),
      Learner.fromDocument('three', {'name': 'Neema', 'class': 'Form 1', 'stream': 'B'}),
    ]);
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: Scaffold(
      body: ListenableBuilder(listenable: session, builder: (context, child) => RegisterScreen(
        session: session, onSignIn: () {}, onOpenLearner: (_) {},
      )),
    )));
    await tester.pumpAndSettle();
    await reveal(tester, find.text('Refine this page'));
    await tester.tap(find.text('Refine this page')); await tester.pumpAndSettle();
    final classField = find.byType(DropdownButtonFormField<String>).first;
    await reveal(tester, classField);
    await tester.tap(classField); await tester.pumpAndSettle();
    await tester.tap(find.text('Form 1').last); await tester.pumpAndSettle();
    final attendance = find.byType(DropdownButtonFormField<String>).last;
    await reveal(tester, attendance);
    await tester.tap(attendance); await tester.pumpAndSettle();
    await tester.tap(find.text('Late').last); await tester.pumpAndSettle();
    expect(find.text('2 page filters active'), findsOneWidget);
    expect(gateway.loadCalls, 1, reason: 'filtering never requests a school-wide read');
    await reveal(tester, find.text('Clear all page filters'));
    await tester.tap(find.text('Clear all page filters')); await tester.pumpAndSettle();
    expect(find.text('2 page filters active'), findsNothing);
    tester.state<ScrollableState>(find.byType(Scrollable).first).position.jumpTo(0);
    await tester.pumpAndSettle();
    await reveal(tester, find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'one'); await tester.pumpAndSettle();
    expect(find.text('1 page filter active'), findsOneWidget);
    await session.loadNextPage(); await tester.pumpAndSettle();
    expect(find.text('1 page filter active'), findsNothing);
    await tester.scrollUntilVisible(find.text('Neema'), 180, scrollable: find.byType(Scrollable).first);
    expect(find.text('Neema'), findsOneWidget);
    session.dispose();
    await gateway.close();
  });
}
