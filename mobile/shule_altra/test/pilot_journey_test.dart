import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/data/sample_gateway.dart';

Future<void> tapText(WidgetTester tester, String label) async {
  final finder = find.text(label);
  for (var step = 0; step < 20 && finder.evaluate().isEmpty; step++) {
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -220));
    await tester.pumpAndSettle();
  }
  expect(finder, findsWidgets, reason: 'Cannot find $label');
  await tester.ensureVisible(finder.first); await tester.pumpAndSettle();
  await tester.tap(finder.first); await tester.pumpAndSettle();
}

Future<void> tab(WidgetTester tester, String label) async {
  await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('complete fictional journey from onboarding to sign-out', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);
    final gateway = SampleGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Skip introduction');
    await tapText(tester, 'Explore the sample preview');
    expect(find.textContaining('Fictional learners only'), findsOneWidget);
    await tab(tester, 'Learners');
    await tapText(tester, 'Fill the demo credential');
    await tapText(tester, 'Sign in to the demo');
    final search = find.byType(TextField);
    await tester.ensureVisible(search); await tester.pumpAndSettle();
    await tester.enterText(search, 'Amina'); await tester.pumpAndSettle();
    await tapText(tester, 'Amina Juma');
    expect(find.text('Sample learner'), findsOneWidget);
    await tester.binding.handlePopRoute(); await tester.pumpAndSettle();
    await tab(tester, 'Day');
    await tapText(tester, 'View fictional timetable');
    expect(find.text('Sample schedule only'), findsOneWidget);
    await tester.binding.handlePopRoute(); await tester.pumpAndSettle();
    await tapText(tester, 'Present');
    await tab(tester, 'More');
    await tapText(tester, 'Sign out');
    await tab(tester, 'Learners');
    expect(find.text('Amina Juma'), findsNothing);
    expect(find.byType(TextField), findsWidgets, reason: 'the demo sign-in form returns');
    await tester.pumpWidget(const SizedBox.shrink()); await gateway.dispose();
  });
}
