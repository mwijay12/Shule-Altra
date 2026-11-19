import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/onboarding.dart';

Future<void> tap(WidgetTester tester, String label) async {
  final target = find.text(label);
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  for (final dark in [false, true]) {
    testWidgets('paths remain separate and readable on a small phone, dark=$dark', (tester) async {
      tester.view.physicalSize = const Size(320 * 2, 640 * 2);
      tester.view.devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      var school = 0;
      var sample = 0;
      await tester.pumpWidget(MaterialApp(
        theme: buildTheme(dark ? Brightness.dark : Brightness.light),
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.5)),
          child: child!,
        ),
        home: OnboardingPage(onConnect: () => school++, onTrySample: () => sample++),
      ));
      await tester.pumpAndSettle();
      await tap(tester, 'Skip introduction');
      expect(find.bySemanticsLabel('Page 3 of 3'), findsOneWidget);
      expect(find.text('School account'), findsOneWidget);
      expect(find.text('Fictional sample'), findsOneWidget);
      await tap(tester, 'Connect my school');
      expect(school, 1); expect(sample, 0);
      await tap(tester, 'Explore the sample preview');
      expect(school, 1); expect(sample, 1);
      expect(tester.takeException(), isNull);
    });
  }
}
