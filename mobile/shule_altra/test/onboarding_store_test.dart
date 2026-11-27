import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shule_altra_mobile/data/onboarding_store.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/design/widgets.dart';
import 'package:shule_altra_mobile/screens/onboarding.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('DeviceOnboardingStore persists introduction completion', () async {
    const store = DeviceOnboardingStore();
    expect(await store.hasSeenIntroduction(), isFalse);
    await store.markIntroductionSeen();
    expect(await store.hasSeenIntroduction(), isTrue);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getKeys(), {'introduction_seen_v1'});
  });

  testWidgets('OnboardingPage wires single-school sign-in and demo callbacks', (tester) async {
    tester.view.physicalSize = const Size(390 * 3, 844 * 3);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.reset);

    var signInTapped = 0;
    var demoTapped = 0;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildTheme(Brightness.light),
        home: OnboardingPage(
          onSignIn: () => signInTapped++,
          onQuickDemo: () => demoTapped++,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(ShuleLogoMark), findsWidgets);
    expect(find.text('Connect my school'), findsNothing);

    await tester.tap(find.text('Skip'));
    await tester.pumpAndSettle();
    expect(signInTapped, 1);

    await tester.tap(find.text('Explore with demo account'));
    await tester.pumpAndSettle();
    expect(demoTapped, 1);
  });
}
