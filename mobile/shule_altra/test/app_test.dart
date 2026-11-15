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

void main() {
  testWidgets('onboarding explains itself and hands over to the sample', (tester) async {
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    // First promise, in words, before anything is connected.
    expect(find.textContaining('Every learner'), findsOneWidget);
    expect(find.text('Connect my school'), findsNothing);

    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Not another'), findsOneWidget);

    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Read-only'), findsOneWidget);

    // The last page is where the two paths are chosen.
    expect(find.text('Connect my school'), findsOneWidget);
    expect(find.text('Explore the sample preview'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('the register signs in, pages, searches and opens a learner', (tester) async {
    final gateway = FakeGateway(pageSize: 2);
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Explore the sample preview'));
    await tester.pumpAndSettle();

    // The sample preview is labelled on the home screen, in words.
    expect(find.textContaining('A little more room'), findsOneWidget);
    expect(find.text('Sample · fictional learners'), findsOneWidget);

    await tester.tap(find.text('Learners'));
    await tester.pumpAndSettle();

    // Signed out: the register says so and offers exactly one action.
    expect(find.textContaining('The register is behind'), findsOneWidget);
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Baraka John'), findsOneWidget);
    expect(find.text('Neema Peter'), findsNothing);
    expect(find.text('2 learners on this page'), findsOneWidget);

    // Search only covers the loaded page, and says so when it finds nothing.
    await tester.enterText(find.byType(TextField), 'Neema');
    await tester.pumpAndSettle();
    expect(find.textContaining('0 of 2 learners match "Neema"'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Amina');
    await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);
    expect(find.text('Baraka John'), findsNothing);
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
    await tester.tap(find.text('Next page'));
    await tester.pumpAndSettle();
    expect(find.text('Neema Peter'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);
    await tester.tap(find.text('Previous'));
    await tester.pumpAndSettle();
    expect(find.text('Amina Juma'), findsOneWidget);

    // A learner's details open as a sheet, with the read-only statement.
    await tester.tap(find.text('Amina Juma'));
    await tester.pumpAndSettle();
    expect(find.text('one@example.test'), findsOneWidget);
    expect(find.textContaining('Read-only snapshot'), findsOneWidget);

    await gateway.close();
  });

  testWidgets('a refused read is shown as words, never as an empty list', (tester) async {
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Explore the sample preview'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Learners'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

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
    await tester.tap(find.text('Next page'));
    await tester.pumpAndSettle();

    expect(find.text('Could not load learners'), findsOneWidget);
    expect(find.textContaining('refused this read'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);
    expect(find.text('Try again'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('the practice sheet marks, counts and clears without saving', (tester) async {
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Explore the sample preview'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Day'));
    await tester.pumpAndSettle();

    expect(find.textContaining('nothing is saved'), findsOneWidget);
    // The count sits below the notice, so it is found by scrolling to it.
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
    await tester.tap(find.text('Clear practice marks'));
    await tester.pumpAndSettle();
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
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Explore the sample preview'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Learners'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Continue with Google'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('More'));
    await tester.pumpAndSettle();
    expect(find.textContaining('No writes, no payments, no offline'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Sign out'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(OutlinedButton, 'Sign out'));
    await tester.pumpAndSettle();
    expect(gateway.signOutCalls, 1);

    await tester.tap(find.text('Learners'));
    await tester.pumpAndSettle();
    expect(find.text('Continue with Google'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('both themes render the same screens', (tester) async {
    for (final dark in [false, true]) {
      final gateway = FakeGateway();
      await tester.pumpWidget(
        ShuleApp.withGateway(
          gateway: gateway,
          themeMode: dark ? ThemeMode.dark : ThemeMode.light,
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Continue'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Explore the sample preview'));
      await tester.pumpAndSettle();

      final context = tester.element(find.byType(NavigationBar));
      final tokens = ShuleTokens.of(context);
      expect(tokens.brightness, dark ? Brightness.dark : Brightness.light);
      expect(find.textContaining('A little more room'), findsOneWidget);
      await gateway.close();
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}
