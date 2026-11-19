import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';

import 'fake_gateway.dart';

Future<void> tab(WidgetTester tester, String name) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(name)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('register filters survive tabs but not an account change; no hidden reads', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final gateway = FakeGateway();
    gateway.signedInAs('staff-one');
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.live));
    await tester.pumpAndSettle();
    expect(gateway.loadCalls, 0);
    await tab(tester, 'Learners');
    expect(gateway.loadCalls, 1);
    await tester.ensureVisible(find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'Amina');
    await tester.pumpAndSettle();
    expect(find.text('1 page filter active'), findsOneWidget);
    await tab(tester, 'Home');
    await tab(tester, 'Learners');
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, 'Amina');
    expect(gateway.loadCalls, 1);
    await tab(tester, 'Home');
    gateway.signedInAs('staff-two');
    await tester.pumpAndSettle();
    expect(gateway.loadCalls, 1, reason: 'an offstage register must not read for a new account');
    await tab(tester, 'Learners');
    expect(gateway.loadCalls, 2);
    expect(tester.widget<TextField>(find.byType(TextField)).controller!.text, isEmpty);
    await tester.pumpWidget(const SizedBox.shrink());
    await gateway.close();
  });
}
