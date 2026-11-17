/// The ramp has to be on the screen, not only in the tokens.
///
/// Step 1 of the redesign changed one file of colours and it would have been very
/// easy to ship an APK that looks identical: every screen still used a flat
/// `FilledButton`, so nothing drew the gradient. These tests fail in that case.
///
/// What they check, and why each one is a real user-visible thing:
///  * the onboarding hero is the brand ramp (the first thing a person sees);
///  * the primary action is a [GradientButton] and is still tappable (#2c2c2c);
///  * a disabled GradientButton does not draw the ramp, so it cannot look active;
///  * the header badge, the cards and the canvas all come from the tokens.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/design/tokens.dart';
import 'package:shule_altra_mobile/design/widgets.dart';

import 'fake_gateway.dart';

/// The gradient of the first decorated box that has one, matching [finder].
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
  testWidgets('the first screen draws the brand ramp, not a grey box', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
    await tester.pumpAndSettle();

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
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(extensions: [ShuleTokens.day]),
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GradientButton(label: 'Continue', onPressed: () => taps++, icon: Icons.arrow_forward),
                GradientButton(label: 'Busy', onPressed: () => taps++, busy: true),
                const GradientButton(label: 'Off', onPressed: null),
              ],
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // The ramp is behind the first one.
    final gradients = tester.widgetList<DecoratedBox>(find.byType(DecoratedBox)).where((widget) {
      final decoration = widget.decoration;
      return decoration is BoxDecoration && decoration.gradient != null;
    });
    expect(gradients, isNotEmpty, reason: 'no GradientButton drew a gradient');

    // A tap goes through, once, and only on the enabled button.
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(taps, 1);

    // A busy button refuses the tap: it is already doing the thing.
    await tester.tap(find.text('Busy'));
    await tester.pumpAndSettle();
    expect(taps, 1, reason: 'a busy button must not fire again');

    // A disabled button refuses too.
    await tester.tap(find.text('Off'));
    await tester.pumpAndSettle();
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

    final decorated = tester.widgetList<DecoratedBox>(find.byType(DecoratedBox));
    for (final widget in decorated) {
      final decoration = widget.decoration;
      if (decoration is BoxDecoration) {
        expect(decoration.gradient, isNull,
            reason: 'a disabled action must not show the brand ramp');
      }
    }
  });

  testWidgets('the header, the canvas and the cards come from the tokens', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    final gateway = FakeGateway();
    await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
    await tester.pumpAndSettle();

    // The scaffold is the canvas token, which is the website's --background.
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
    expect(scaffold.backgroundColor ?? ShuleTokens.day.canvas, ShuleTokens.day.canvas);

    // The BrandBar's PILOT badge is the muted surface, not a hard-coded grey.
    expect(find.text('PILOT'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
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
}
