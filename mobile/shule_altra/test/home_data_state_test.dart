import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/learner.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/home.dart';

import 'fake_gateway.dart';

void main() {
  testWidgets('home does not present unread or unknown balances as zero', (tester) async {
    final gateway = FakeGateway(rows: [Learner.fromDocument('one', {'name': 'Amina', 'class': 'Form 1'})]);
    final session = AppSession(gateway);
    await session.start();
    await gateway.signIn();
    await tester.pump();
    await tester.pumpWidget(MaterialApp(theme: buildTheme(Brightness.light), home: Scaffold(
      body: ListenableBuilder(listenable: session, builder: (context, child) => HomeScreen(
        session: session, onOpenRegister: () {}, onOpenDay: () {}, onOpenMore: () {},
      )),
    )));
    await tester.pumpAndSettle();
    expect(find.textContaining('Open Learners to load a page'), findsOneWidget);
    expect(find.text('No open balance on this page.'), findsNothing);
    await session.loadFirstPage(); await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Balances are not recorded for this page.'), 150, scrollable: find.byType(Scrollable).first);
    expect(find.text('Balances are not recorded for this page.'), findsOneWidget);
    expect(find.text('No open balance on this page.'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
    session.dispose();
    await gateway.close();
  });
}
