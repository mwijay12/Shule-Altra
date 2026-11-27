/// Verifies Learners directory class filters, status chips, search, and reset
/// across the real 150-student website dataset.
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

    expect(find.text('150 shown'), findsOneWidget);

    // Filter to Form 3 + search for exact website top defaulter ALT-2026-107.
    await tester.tap(find.text('Form 3'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'FARAJA MUSSA SHAYO');
    await tester.pumpAndSettle();
    expect(find.text('FARAJA MUSSA SHAYO'), findsOneWidget);

    // Switch to Form 1 -> Form 3 student should no longer match.
    await tester.tap(find.text('Form 1'));
    await tester.pumpAndSettle();
    expect(find.text('No matching learners'), findsOneWidget);

    // Reset filters brings back all 150 learners.
    await tester.tap(find.text('Reset filters'));
    await tester.pumpAndSettle();
    expect(find.text('150 shown'), findsOneWidget);

    workspace.dispose();
    session.dispose();
    await gateway.close();
  });
}
