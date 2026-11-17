/// The demo credential is a convenience, and these tests are what stop it
/// becoming a way in.
///
/// Three properties, each one a way this could go wrong:
///  * it only unlocks fictional data, never a school's register;
///  * a wrong password is refused, and the message does not say which field was
///    wrong;
///  * a build with `DISABLE_DEMO_SIGN_IN=true` does not offer it at all.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/demo_account.g.dart';
import 'package:shule_altra_mobile/data/demo_credentials.dart';
import 'package:shule_altra_mobile/data/sample_gateway.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';
import 'package:shule_altra_mobile/screens/demo_sign_in.dart';

import 'fake_gateway.dart';

Future<void> _tap(WidgetTester tester, String label) async {
  final target = find.text(label);
  expect(target, findsWidgets, reason: 'nothing on screen says "$label"');
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
  await tester.tap(target.first);
  await tester.pumpAndSettle();
}

void main() {
  group('DemoCredentials', () {
    test('accepts the printed pair, and only that pair', () {
      expect(DemoCredentials.accepts(DemoCredentials.demoEmail, DemoCredentials.demoPassword), isTrue);
      // Case and surrounding spaces are forgiven on the email only.
      final shouted = DemoCredentials.demoEmail.toUpperCase();
      expect(DemoCredentials.accepts('  $shouted ', DemoCredentials.demoPassword), isTrue);
      // The password is exact.
      final louder = DemoCredentials.demoPassword.toUpperCase();
      expect(DemoCredentials.accepts(DemoCredentials.demoEmail, louder), isFalse);
      expect(DemoCredentials.accepts(DemoCredentials.demoEmail, '${DemoCredentials.demoPassword} '), isFalse);
      expect(DemoCredentials.accepts('someone@example.com', DemoCredentials.demoPassword), isFalse);
      expect(DemoCredentials.accepts('', ''), isFalse);
    });

    test('is the account the website signs in with, generated from one file', () {
      // Both products read config/demo-account.json; the generated constants are
      // what this test can see, and they must still be the documented pair.
      expect(DemoCredentials.demoEmail, DemoAccount.email);
      expect(DemoCredentials.demoPassword, DemoAccount.password);
      expect(DemoCredentials.identity.uid, DemoAccount.uid);
      // The account is the demo school's administrator, under the id the web
      // seed creates the staff record with.
      expect(DemoAccount.role, 'ADMIN');
      expect(DemoAccount.schoolId, 'school-001');
      expect(DemoAccount.uid, 'demo-admin');
      // A real address would put a real person's name on a public demo screen.
      expect(DemoCredentials.demoEmail.endsWith('.pro'), isTrue);
    });

    test('the identity cannot be mistaken for a Firebase uid', () {
      expect(DemoCredentials.identity.uid.startsWith('demo-'), isTrue);
      // A Firebase uid is 28 alphanumeric characters; this is not one.
      expect(RegExp(r'^[A-Za-z0-9]{28}$').hasMatch(DemoCredentials.identity.uid), isFalse);
    });
  });

  group('the sample gateway', () {
    test('takes the demo credential and reports the account', () async {
      final gateway = SampleGateway();
      final session = AppSession(gateway);
      await session.start();
      await Future<void>.delayed(Duration.zero);

      expect(session.acceptsDemoCredential, isTrue);
      await session.signInWithDemo(DemoCredentials.demoEmail, DemoCredentials.demoPassword);
      await Future<void>.delayed(Duration.zero);

      expect(session.signedIn, isTrue);
      expect(session.demoIdentity?.email, DemoCredentials.demoEmail);
      await session.loadFirstPage();
      expect(session.rows, isNotEmpty);

      await session.signOut();
      expect(session.demoIdentity, isNull);
      await gateway.dispose();
      session.dispose();
    });

    test('refuses a wrong password with one message for both fields', () async {
      final gateway = SampleGateway();
      String? message;
      try {
        await gateway.signInWithDemo(DemoCredentials.demoEmail, 'not-the-password');
      } on GatewayFailure catch (error) {
        message = error.message;
      }
      await gateway.dispose();
      expect(message, isNotNull);
      expect(message, contains('do not match the demo account'));
      // Naming the field would confirm that the address is the demo one.
      expect(message!.toLowerCase(), isNot(contains('password is')));
    });

    test('a refused demo sign-in leaves the session signed out', () async {
      final gateway = SampleGateway();
      final session = AppSession(gateway);
      await session.start();
      await Future<void>.delayed(Duration.zero);

      await session.signInWithDemo(DemoCredentials.demoEmail, 'wrong');
      expect(session.signedIn, isFalse);
      expect(session.failure, contains('do not match the demo account'));
      // One message covers both fields, so a correct address is not confirmed.
      expect(session.failure, isNot(contains('password is')));
      await gateway.dispose();
      session.dispose();
    });
  });

  group('the live path', () {
    test('a gateway without a demo door refuses the credential outright', () async {
      final gateway = FakeGateway();
      expect(gateway.acceptsDemoCredential, isFalse);
      expect(gateway.demoIdentity, isNull);

      // Calling it directly, bypassing the UI, still fails.
      await expectLater(
        gateway.signInWithDemo(DemoCredentials.demoEmail, DemoCredentials.demoPassword),
        throwsA(isA<GatewayFailure>()),
      );
      await gateway.close();
    });
  });

  group('the form', () {
    testWidgets('shows the credential, fills it, and signs in', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      final gateway = SampleGateway();
      await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
      await tester.pumpAndSettle();
      // Onboarding scrolls on a phone, so every step is reached the way a
      // person reaches it: scrolled into view, then tapped.
      await _tap(tester, 'Continue');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Explore the sample preview');
      await _tap(tester, 'Learners');

      // The form exists, and the credential is on it before anything is typed.
      expect(find.byType(DemoSignInForm), findsOneWidget);
      expect(find.textContaining(DemoCredentials.demoEmail), findsWidgets);
      expect(find.textContaining(DemoCredentials.demoPassword), findsWidgets);

      // The fill button is the path a reviewer takes.
      await _tap(tester, 'Fill the demo credential');
      await _tap(tester, 'Sign in to the demo');

      // Signed in: the fictional register is readable.
      expect(find.text('Amina Juma'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.textContaining('Sample · fictional learners'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.textContaining('Sample · fictional learners'), findsOneWidget);
      await gateway.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('a wrong password is explained, and stays signed out', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      final gateway = SampleGateway();
      await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
      await tester.pumpAndSettle();
      // Onboarding scrolls on a phone, so every step is reached the way a
      // person reaches it: scrolled into view, then tapped.
      await _tap(tester, 'Continue');
      await _tap(tester, 'Continue');
      await _tap(tester, 'Explore the sample preview');
      await _tap(tester, 'Learners');

      final password = find.byType(TextField).last;
      await tester.ensureVisible(password);
      await tester.pumpAndSettle();
      await tester.enterText(password, 'wrong-password');
      await tester.pumpAndSettle();
      await _tap(tester, 'Sign in to the demo');

      expect(find.textContaining('do not match the demo account'), findsOneWidget);
      expect(find.text('Amina Juma'), findsNothing);
      await gateway.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });
}
