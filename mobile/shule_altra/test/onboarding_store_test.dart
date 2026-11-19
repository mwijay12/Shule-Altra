import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shule_altra_mobile/data/onboarding_store.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/screens/onboarding.dart';

class FailingStore implements OnboardingStore {
  @override
  Future<bool> hasSeenIntroduction() async => throw StateError('unavailable');

  @override
  Future<void> markIntroductionSeen() async => throw StateError('unavailable');
}

Widget page(OnboardingStore store) => MaterialApp(
      theme: buildTheme(Brightness.light),
      home: OnboardingPage(store: store, onConnect: () {}, onTrySample: () {}),
    );

Future<void> tapSkip(WidgetTester tester) async {
  final skip = find.text('Skip introduction');
  await tester.ensureVisible(skip);
  await tester.pumpAndSettle();
  await tester.tap(skip);
  await tester.pumpAndSettle();
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  testWidgets('completion is remembered but never selects a data path', (tester) async {
    const store = DeviceOnboardingStore();
    await tester.pumpWidget(page(store));
    await tester.pumpAndSettle();
    expect(find.textContaining('Your register,'), findsOneWidget);
    await tapSkip(tester);
    expect(await store.hasSeenIntroduction(), isTrue);

    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(page(store));
    await tester.pumpAndSettle();
    expect(find.text('Connect my school'), findsOneWidget);
    expect(find.text('Explore the sample preview'), findsOneWidget);
    expect(find.textContaining('Your register,'), findsNothing);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getKeys(), {'introduction_seen_v1'});
  });

  testWidgets('storage errors show introduction and do not block choices', (tester) async {
    await tester.pumpWidget(page(FailingStore()));
    await tester.pumpAndSettle();
    expect(find.textContaining('Your register,'), findsOneWidget);
    await tapSkip(tester);
    expect(find.text('Connect my school'), findsOneWidget);
    expect(find.text('Explore the sample preview'), findsOneWidget);
  });
}
