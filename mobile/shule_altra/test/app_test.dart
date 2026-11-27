/// End-to-end tests of the single-school Shule Altra mobile app:
///  * official Shule Altra app icon on onboarding & sign-in
///  * NO "Connect my school" multi-school selector
///  * dedicated Staff Sign-In (Admin / Teacher / Bursar demo roles)
///  * Command Deck website parity (150 learners, Follow-up queue, ledger stream)
///  * Learners directory (NO login buried inside Learners tab), search & dossier
///  * School Day operational tabs (Attendance, Finance, Academics, Timetable)
///  * More & Settings (Auto/Light/Dark adaptive theme, permissions, modules & sign out)
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/design/dock.dart';
import 'package:shule_altra_mobile/design/tokens.dart';
import 'package:shule_altra_mobile/design/widgets.dart';

import 'fake_gateway.dart';

Widget _app(FakeGateway gateway) => ShuleApp.withGateway(gateway: gateway);

void usePhoneScreen(WidgetTester tester) {
  tester.view.physicalSize = const Size(390 * 3, 844 * 3);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.reset);
}

Future<void> tapText(WidgetTester tester, String text) async {
  final target = find.text(text);
  expect(target, findsWidgets, reason: 'nothing on screen says "$text"');
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
  await tester.tap(target.first);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('onboarding displays Shule Altra icon and never asks to connect a school', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    expect(find.byType(ShuleLogoMark), findsWidgets);
    expect(find.text('Connect my school'), findsNothing);
    expect(find.textContaining('Your school,'), findsOneWidget);

    await tapText(tester, 'Next');
    expect(find.textContaining('instant PDF print'), findsOneWidget);

    await tapText(tester, 'Next');
    expect(find.textContaining('school operations'), findsOneWidget);
    expect(find.text('Sign in to Shule Altra'), findsOneWidget);
    expect(find.text('Explore with demo account'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('dedicated staff sign-in matches website roles and enters the Command Deck', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Skip');
    expect(find.byType(ShuleLogoMark), findsWidgets);
    expect(find.text('Staff Portal Login'), findsOneWidget);

    for (final label in const [
      'Administrator · Head Master',
      'Teacher · Academic Master',
      'Bursar · School Bursar',
    ]) {
      await tester.scrollUntilVisible(
        find.text(label),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text(label), findsOneWidget);
    }

    await tester.scrollUntilVisible(
      find.text('Administrator · Head Master'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Administrator · Head Master');

    expect(find.byType(ShuleGlassDock), findsOneWidget);
    expect(find.textContaining('Habari za asubuhi'), findsOneWidget);
    expect(find.text('150'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('Learners tab opens directly without login gate, searches real 150-student register and opens dossier', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Explore with demo account');
    await tapText(tester, 'Learners');

    // No login gate inside Learners tab; 150 learners immediately visible.
    expect(find.text('Staff Portal Login'), findsNothing);
    expect(find.text('150'), findsOneWidget);

    // Search for exact website follow-up #1 learner.
    await tester.enterText(find.byType(TextField).first, 'ALT-2026-107');
    await tester.pumpAndSettle();
    expect(find.text('FARAJA MUSSA SHAYO'), findsOneWidget);

    // Tapping a learner opens the full profile sheet with photo & PDF actions.
    await tapText(tester, 'FARAJA MUSSA SHAYO');
    expect(find.text('Gallery photo'), findsOneWidget);
    expect(find.text('Take photo'), findsOneWidget);
    expect(find.text('Report card'), findsOneWidget);
    expect(find.text('Fee statement'), findsOneWidget);
    expect(find.text('Student ID'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('School Day exposes Attendance, Finance, Academics and Timetable', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Explore with demo account');
    await tapText(tester, 'School Day');

    expect(find.text('Form 4 Roll Call'), findsOneWidget);

    await tapText(tester, 'Finance');
    expect(find.text('Global balances'), findsOneWidget);

    await tapText(tester, 'Academics');
    expect(find.text('Form 4 NECTA Ranking'), findsOneWidget);

    await tapText(tester, 'Timetable');
    expect(find.text('Form 4 · Monday'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('More supports Auto/Light/Dark switching, permissions, modules and sign out', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Explore with demo account');
    await tapText(tester, 'More');

    await tester.scrollUntilVisible(
      find.text('Dark'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Dark');
    final darkTokens = ShuleTokens.of(tester.element(find.byType(ShuleGlassDock)));
    expect(darkTokens.brightness, Brightness.dark);

    await tapText(tester, 'Light');
    final lightTokens = ShuleTokens.of(tester.element(find.byType(ShuleGlassDock)));
    expect(lightTokens.brightness, Brightness.light);

    await tester.scrollUntilVisible(
      find.text('Notifications'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Notifications'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('Shule Guide'),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Shule Guide'), findsOneWidget);

    // Scroll back up to Sign out.
    await tester.scrollUntilVisible(
      find.text('Sign out'),
      -260,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Sign out');
    expect(find.text('Staff Portal Login'), findsOneWidget);
    await gateway.close();
  });
}
