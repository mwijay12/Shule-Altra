/// Verifies Learners directory class filters, status chips, search, and reset.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/demo_school_store.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/register.dart';

import 'fake_gateway.dart';

void main() {
  testWidgets('Learners filters combine Form, status and search cleanly', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    final session = AppSession(gateway);
    final workspace = SchoolWorkspace();
    await session.start();
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.light),
        home: Scaffold(
          body: RegisterScreen(session: session, workspace: workspace),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Amina Juma'), findsOneWidget);

    // Filter to Form 1 only.
    await tester.tap(find.text('Form 1'));
    await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsNothing);
    expect(find.text('Lightness Urio'), findsOneWidget);

    // Combine with Owes fees status filter.
    await tester.tap(find.text('Owes fees'));
    await tester.pumpAndSettle();
    expect(find.text('Lightness Urio'), findsNothing);
    expect(find.text('Daniel Mwangosi'), findsOneWidget);

    // Search query that matches nobody shows empty state with Reset filters.
    await tester.enterText(find.byType(TextField).first, 'zzzzzz');
    await tester.pumpAndSettle();
    expect(find.text('No matching learners'), findsOneWidget);

    await tester.tap(find.text('Reset filters'));
    await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);

    workspace.dispose();
    session.dispose();
    await gateway.close();
  });
}
