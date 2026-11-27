/// End-to-end tests of the single-school Shule Altra mobile app:
///  * official Shule Altra app icon on onboarding & sign-in
///  * NO "Connect my school" multi-school selector
///  * dedicated Staff Sign-In (Admin / Teacher / Bursar demo roles)
///  * Learners directory (NO login buried inside Learners tab), search, enrol & dossier
///  * School Day operational tabs (Attendance, Finance, Academics, Timetable)
///  * More & Settings (Auto/Light/Dark adaptive theme, device permissions, sign out)
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

  testWidgets('dedicated staff sign-in matches website roles and enters the app', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Skip');
    expect(find.byType(ShuleLogoMark), findsWidgets);
    expect(find.text('Staff Portal Login'), findsOneWidget);

    for (final email in const ['admin@shule.pro', 'teacher@shule.pro', 'bursar@shule.pro']) {
      await tester.scrollUntilVisible(
        find.textContaining(email),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining(email), findsWidgets);
    }

    await tester.scrollUntilVisible(
      find.text('Administrator · Head Master'),
      -200,
      scrollable: find.byType(Scrollable).first,
    );
    await tapText(tester, 'Administrator · Head Master');

    expect(find.byType(ShuleGlassDock), findsOneWidget);
    expect(find.text('Mwalimu Nyerere Secondary School'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('Learners tab opens directly without login gate, searches and opens dossier', (tester) async {
    usePhoneScreen(tester);
    final gateway = FakeGateway();
    await tester.pumpWidget(_app(gateway));
    await tester.pumpAndSettle();

    await tapText(tester, 'Explore with demo account');
    await tapText(tester, 'Learners');

    // No login gate inside Learners tab; learners are immediately visible.
    expect(find.text('Staff Portal Login'), findsNothing);
    expect(find.text('Amina Juma'), findsOneWidget);

    // Search filter works immediately.
    await tester.enterText(find.byType(TextField).first, 'Baraka');
    await tester.pumpAndSettle();
    expect(find.text('Baraka John'), findsOneWidget);
    expect(find.text('Amina Juma'), findsNothing);

    await tester.enterText(find.byType(TextField).first, '');
    await tester.pumpAndSettle();

    // Tapping a learner opens the full profile sheet with photo & PDF actions.
    await tapText(tester, 'Amina Juma');
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
    expect(find.text('Pending balances'), findsOneWidget);

    await tapText(tester, 'Academics');
    expect(find.text('Form 4 NECTA Ranking'), findsOneWidget);

    await tapText(tester, 'Timetable');
    expect(find.text('Form 4 · Monday'), findsOneWidget);
    await gateway.close();
  });

  testWidgets('More supports Auto/Light/Dark switching, permissions and sign out', (tester) async {
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
      find.text('Gallery & Photos'),
      220,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Gallery & Photos'), findsOneWidget);

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
