/// End-to-end tests of the app as a person uses it: a tap on the screen, a
/// page of learners, a sign-out, a failure.
///
/// These run without Firebase, a network or an account: the gateway is injected.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';
import 'package:shule_altra_mobile/design/tokens.dart';

import 'fake_gateway.dart';

/// The app builds its own MaterialApp, so tests pump it directly: wrapping it in
/// another one would test the wrapper's theme, not the app's.
Widget _app(FakeGateway gateway) => ShuleApp.withGateway(gateway: gateway);

/// Every screen is exercised at the size of the phone this is for (390x844), not
/// at the test harness default, so a screen that only fits a wide window fails
/// here instead of on someone's handset.
void usePhoneScreen(WidgetTester tester) {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

/// Jump back to the top of the list on screen. A lazily built list only creates
/// the rows in view, so a test that asserts on those rows has to be looking at
/// them; jumping the scroll position is deterministic where repeated drags are
/// not.
Future<void> scrollToTop(WidgetTester tester) async {
  final scrollable = tester.state<ScrollableState>(find.byType(Scrollable).first);
  scrollable.position.jumpTo(0);
  await tester.pumpAndSettle();
}

/// Scroll to a control before tapping it, the way a person would. A tap on a
/// widget below the fold is a no-op in a widget test, and a silent one.
Future<void> tapText(WidgetTester tester, String text) async {
  final target = find.text(text);
  // Say which label is missing, rather than letting `ensureVisible` throw a bare
  // "Bad state: No element" from inside the framework.
  expect(target, findsWidgets, reason: 'nothing on screen says "$text"');
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
  await tester.tap(target.first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('onboarding explains itself and hands over to the sample', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    // Onboarding first: nothing is connected, and no session exists yet.
    expect(find.text('Connect my school'), findsNothing);
    expect(gateway.loadCalls, 0);

    // First promise, in words, before anything is connected.
    expect(find.textContaining('Every learner'), findsOneWidget);

    await tapText(tester, 'Continue');
    expect(find.textContaining('Not another'), findsOneWidget);

    await tapText(tester, 'Continue');
    expect(find.textContaining('Read-only'), findsOneWidget);

    // The last page is where the two paths are chosen.
    expect(find.text('Connect my school'), findsOneWidget);
    expect(find.text('Explore the sample preview'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('the register signs in, pages, searches and opens a learner', (tester) async {
    usePhoneScreen(tester);
    // A short first page keeps the controls visible on one phone screen. The
    // paging logic is the same; the two-page test lives in session_test.dart.
    final gateway = FakeGateway(pageSize: 1);
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Continue');
    await tapText(tester, 'Continue');
    await tapText(tester, 'Explore the sample preview');

    // The sample preview is labelled with the gateway's own source, in words.
    // (The injected fake calls itself "Fake"; the shipped sample gateway says
    // "Sample · fictional learners".) The label is below the fold, and a lazily
    // built list does not create it until it is scrolled to.
    expect(find.textContaining('A little more room'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.textContaining('Fake'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('Fake'), findsOneWidget);

    await tapText(tester, 'Learners');

    // Signed out: the register lists the effects and offers exactly one action.
    // Only "Continue with Google" is asserted here; the surrounding sentences are
    // below the fold on a phone and are checked in the screen's own test.
    await tapText(tester, 'Continue with Google');

    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('1 learner on this page'), findsOneWidget);

    // Search only covers the loaded page, and says so when it finds nothing.
    await tester.scrollUntilVisible(
      find.byType(TextField),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Neema');
    await tester.pumpAndSettle();
    expect(find.textContaining('0 of 1 learner match "Neema"'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Amina');
    await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '');
    await tester.pumpAndSettle();

    // Paging forwards and back.
    // The page buttons are at the bottom of a long list, so scroll to them as a
    // person would.
    await tester.scrollUntilVisible(
      find.text('Next page'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Next page');
    await scrollToTop(tester);
    // Page two of a one-learner page size is Baraka John, not the third learner;
    // the remainder is the point of paging.
    expect(find.text('Baraka John'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);

    // And back, which is a fresh read of the first page.
    await tester.scrollUntilVisible(
      find.text('Previous'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Previous');
    await scrollToTop(tester);
    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Baraka John'), findsNothing);

    // A learner's details open as a sheet, with the read-only statement.
    await tester.ensureVisible(find.text('Amina Juma'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Amina Juma');
    expect(find.text('one@example.test'), findsOneWidget);
    // Above the guardian fields sits the statement that decides what this sheet
    // means: a sample record says so, a live one says it is a snapshot. Only one
    // of the two is built, so this asserts whichever the session calls for.
    expect(
      find.textContaining('Sample learner').evaluate().isNotEmpty ||
          find.textContaining('Read-only snapshot').evaluate().isNotEmpty,
      isTrue,
      reason: 'the sheet must say where its record came from',
    );
    expect(find.text('Fatuma Juma'), findsOneWidget);

    await gateway.close();
  });

  testWidgets('a refused read is shown as words, never as an empty list', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway(pageSize: 1);
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Continue');
    await tapText(tester, 'Continue');
    await tapText(tester, 'Explore the sample preview');

    await tapText(tester, 'Learners');
    await tapText(tester, 'Continue with Google');

    // The read fails, not the sign-in.
    gateway.loadFailure = const GatewayFailure(
      'The school rules refused this read. Your account may not be on the staff list.',
      kind: GatewayFailureKind.denied,
    );
    // The page buttons are at the bottom of a long list, so scroll to them as a
    // person would.
    await tester.scrollUntilVisible(
      find.text('Next page'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Next page');

    expect(find.text('Could not load learners'), findsOneWidget);
    expect(find.textContaining('refused this read'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);
    expect(find.text('Try again'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('the practice sheet marks, counts and clears without saving', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Continue');
    await tapText(tester, 'Continue');
    await tapText(tester, 'Explore the sample preview');

    await tapText(tester, 'Day');

    // Both statements are in the first screen, above the list.
    expect(find.textContaining('Practice only'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('0 of 6 marked'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('0 of 6 marked'), findsOneWidget);

    await tester.tap(find.text('Present').first);
    await tester.pumpAndSettle();
    expect(find.text('1 of 6 marked'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Clear practice marks'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Clear practice marks');
    await tester.scrollUntilVisible(
      find.text('0 of 6 marked'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('0 of 6 marked'), findsOneWidget);

    // The practice sheet never marks a real learner's record: it lists sample
    // learners even while a live account is signed in.
    expect(find.textContaining('sample'), findsWidgets);
    await gateway.close();
  });

  testWidgets('More states what is missing and signs out', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Continue');
    await tapText(tester, 'Continue');
    await tapText(tester, 'Explore the sample preview');

    await tapText(tester, 'Learners');
    await tapText(tester, 'Continue with Google');

    await tapText(tester, 'More');
    expect(find.textContaining('Built with care'), findsOneWidget);

    // Walk down the page the way a person does, and stop when the statement
    // appears: the list builds its children lazily, so nothing below the fold
    // exists until it is scrolled into view.
    final statement = find.textContaining('No writes, no payments');
    for (var step = 0; step < 8 && statement.evaluate().isEmpty; step++) {
      await tester.drag(find.byType(Scrollable).first, const Offset(0, -260));
      await tester.pumpAndSettle();
    }
    expect(statement, findsOneWidget);
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Sign out'),
      160,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(OutlinedButton, 'Sign out'));
    await tester.pumpAndSettle();
    expect(gateway.signOutCalls, 1);

    await tapText(tester, 'Learners');
    expect(find.text('Continue with Google'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('the signed-out register states the rules in words', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tapText(tester, 'Continue');
    await tapText(tester, 'Continue');
    await tapText(tester, 'Explore the sample preview');
    await tapText(tester, 'Learners');

    // The injected fake has no demo door, so this is the school-account form.
    // On a phone the illustration and three sentences do not all fit, so this
    // test scrolls through the screen and checks each statement exists.
    final statements = <String>[
      'The register is behind',
      'Continue with Google',
      'Read-only pilot',
    ];
    for (final statement in statements) {
      await tester.scrollUntilVisible(
        find.textContaining(statement),
        160,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining(statement), findsOneWidget, reason: statement);
    }
    await gateway.close();
  });

  testWidgets('both themes render the same screens', (tester) async {
    usePhoneScreen(tester);
    for (final dark in [false, true]) {
      final gateway = FakeGateway();
      await tester.pumpWidget(
        ShuleApp.withGateway(
          gateway: gateway,
          themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        ),
      );
      await tester.pumpAndSettle();
      await tapText(tester, 'Continue');
      await tapText(tester, 'Continue');
      await tapText(tester, 'Explore the sample preview');

      final context = tester.element(find.byType(NavigationBar));
      final tokens = ShuleTokens.of(context);
      expect(tokens.brightness, dark ? Brightness.dark : Brightness.light);
      expect(find.textContaining('A little more room'), findsOneWidget);
      await gateway.close();
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}
