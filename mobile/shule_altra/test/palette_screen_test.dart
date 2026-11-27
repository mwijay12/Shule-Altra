/// Verifies the brand gradient ramp, blue glass dock, quick-action orb,
/// official Shule Altra icon, and Day/Night token alignment on rendered screens.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/design/dock.dart';
import 'package:shule_altra_mobile/design/glass.dart';
import 'package:shule_altra_mobile/design/tokens.dart';
import 'package:shule_altra_mobile/design/widgets.dart';

import 'fake_gateway.dart';

Gradient? _gradientOf(WidgetTester tester, Finder finder) {
  for (final element in finder.evaluate()) {
    final widget = element.widget;
    if (widget is DecoratedBox) {
      final decoration = widget.decoration;
      if (decoration is BoxDecoration && decoration.gradient != null) {
        return decoration.gradient;
      }
    }
  }
  return null;
}

void main() {
  testWidgets('the first screen draws the brand ramp and official app icon', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
    await tester.pumpAndSettle();

    expect(find.byType(ShuleLogoMark), findsWidgets);

    final ramp = _gradientOf(tester, find.byType(DecoratedBox));
    expect(ramp, isA<LinearGradient>(), reason: 'the onboarding hero has no gradient at all');
    final gradient = ramp! as LinearGradient;
    expect(gradient.colors, [ShuleTokens.day.gradientStart, ShuleTokens.day.gradientEnd]);
    expect(gradient.begin, Alignment.topLeft);
    expect(gradient.end, Alignment.bottomRight);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('the primary action is the ramp button, and it still works', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    var taps = 0;
    Future<void> show(List<Widget> bars) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [ShuleTokens.day]),
          home: Scaffold(
            body: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                for (final bar in bars)
                  Padding(padding: const EdgeInsets.only(bottom: 12), child: bar),
              ],
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));
    }

    await show([
      GradientButton(label: 'Continue', onPressed: () => taps++, icon: Icons.arrow_forward),
    ]);

    final gradients = tester.widgetList<DecoratedBox>(find.byType(DecoratedBox)).where((widget) {
      final decoration = widget.decoration;
      return decoration is BoxDecoration && decoration.gradient != null;
    });
    expect(gradients, isNotEmpty, reason: 'no GradientButton drew a gradient');

    await tester.tap(find.text('Continue'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(taps, 1);

    await show([GradientButton(label: 'Busy', onPressed: () => taps++, busy: true)]);
    await tester.tap(find.text('Busy'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(taps, 1, reason: 'a busy button must not fire again');

    await show([const GradientButton(label: 'Off', onPressed: null)]);
    await tester.tap(find.text('Off'));
    await tester.pump(const Duration(milliseconds: 400));
    expect(taps, 1, reason: 'a disabled button must not fire');
  });

  testWidgets('a disabled button is flat, so it cannot look active', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(extensions: [ShuleTokens.day]),
        home: const Scaffold(
          body: Center(child: SizedBox(width: 280, child: GradientButton(label: 'Off', onPressed: null))),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final buttons = find.descendant(
      of: find.byType(GradientButton),
      matching: find.byType(DecoratedBox),
    );
    expect(buttons, findsWidgets);
    for (final widget in tester.widgetList<DecoratedBox>(buttons)) {
      final decoration = widget.decoration;
      if (decoration is BoxDecoration) {
        expect(decoration.gradient, isNull,
            reason: 'a disabled action must not show the brand ramp');
      }
    }
  });

  testWidgets('night mode keeps the ramp, with the light stops', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    await tester.pumpWidget(
      ShuleApp.withGateway(gateway: gateway, themeMode: ThemeMode.dark),
    );
    await tester.pumpAndSettle();

    final ramp = _gradientOf(tester, find.byType(DecoratedBox))! as LinearGradient;
    expect(ramp.colors, [ShuleTokens.night.gradientStart, ShuleTokens.night.gradientEnd]);

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('floating blue glass dock and quick-action orb open school shortcuts', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    await tester.pumpWidget(
      ShuleApp.withGateway(gateway: gateway, initialMode: AppMode.sample),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ShuleBackdrop), findsWidgets);
    expect(find.byType(ShuleGlassDock), findsOneWidget);
    expect(find.byKey(const Key('shule-quick-orb')), findsOneWidget);

    await tester.tap(find.byKey(const Key('shule-quick-orb')));
    await tester.pumpAndSettle();

    expect(find.text('Quick school actions'), findsOneWidget);
    expect(find.text('Learners & Enrolment'), findsOneWidget);
    expect(find.text('Reports & PDF Printing'), findsOneWidget);

    await tester.tap(find.text('Learners & Enrolment'));
    await tester.pumpAndSettle();

    expect(find.text('150 shown'), findsOneWidget);
    await gateway.close();
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
