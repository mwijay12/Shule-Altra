/// Verifies shared demo credentials (`config/demo-account.json`), website
/// demo role parity, and dedicated Sign-In screen behaviour.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';
import 'package:shule_altra_mobile/app/session.dart';
import 'package:shule_altra_mobile/data/demo_account.g.dart';
import 'package:shule_altra_mobile/data/demo_credentials.dart';
import 'package:shule_altra_mobile/data/demo_school_store.dart';
import 'package:shule_altra_mobile/data/sample_gateway.dart';
import 'package:shule_altra_mobile/data/school_gateway.dart';

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
      final shouted = DemoCredentials.demoEmail.toUpperCase();
      expect(DemoCredentials.accepts('  $shouted ', DemoCredentials.demoPassword), isTrue);
      final louder = DemoCredentials.demoPassword.toUpperCase();
      expect(DemoCredentials.accepts(DemoCredentials.demoEmail, louder), isFalse);
      expect(DemoCredentials.accepts(DemoCredentials.demoEmail, '${DemoCredentials.demoPassword} '), isFalse);
      expect(DemoCredentials.accepts('someone@example.com', DemoCredentials.demoPassword), isFalse);
      expect(DemoCredentials.accepts('', ''), isFalse);
    });

    test('matches the website demo account generated from config/demo-account.json', () {
      expect(DemoCredentials.demoEmail, DemoAccount.email);
      expect(DemoCredentials.demoPassword, DemoAccount.password);
      expect(DemoCredentials.identity.uid, DemoAccount.uid);
      expect(DemoAccount.role, 'ADMIN');
      expect(DemoAccount.schoolId, 'school-001');
      expect(DemoAccount.uid, 'demo-admin');
      expect(DemoCredentials.demoEmail.endsWith('.pro'), isTrue);
    });

    test('school profile matches all three website demo roles', () {
      expect(SchoolProfile.matchDemoLogin('admin@shule.pro', DemoCredentials.demoPassword)?.role, 'ADMIN');
      expect(SchoolProfile.matchDemoLogin('teacher@shule.pro', DemoCredentials.demoPassword)?.role, 'TEACHER');
      expect(SchoolProfile.matchDemoLogin('bursar@shule.pro', DemoCredentials.demoPassword)?.role, 'BURSAR');
      expect(SchoolProfile.matchDemoLogin('admin@shule.pro', 'wrong'), isNull);
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
    });
  });

  group('the live path', () {
    test('a gateway without a demo door refuses the credential outright', () async {
      final gateway = FakeGateway();
      expect(gateway.acceptsDemoCredential, isFalse);
      await expectLater(
        gateway.signInWithDemo(DemoCredentials.demoEmail, DemoCredentials.demoPassword),
        throwsA(isA<GatewayFailure>()),
      );
      await gateway.close();
    });
  });

  group('dedicated Staff Sign-In screen', () {
    testWidgets('signs in with website demo email & password', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      final gateway = SampleGateway();
      await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
      await tester.pumpAndSettle();

      await _tap(tester, 'Skip');
      expect(find.text('Staff Portal Login'), findsOneWidget);

      await tester.enterText(find.byType(TextField).last, DemoCredentials.demoPassword);
      await tester.pumpAndSettle();
      await _tap(tester, 'Sign in');

      expect(find.textContaining('Habari za asubuhi'), findsOneWidget);
      await gateway.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    });

    testWidgets('explains wrong password and stays on sign-in', (tester) async {
      tester.view.physicalSize = const Size(390 * 3, 844 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);

      final gateway = SampleGateway();
      await tester.pumpWidget(ShuleApp.withGateway(gateway: gateway));
      await tester.pumpAndSettle();

      await _tap(tester, 'Skip');
      await tester.enterText(find.byType(TextField).last, 'wrong-password');
      await tester.pumpAndSettle();
      await _tap(tester, 'Sign in');

      expect(find.text('Sign-in notice'), findsOneWidget);
      expect(find.text('Staff Portal Login'), findsOneWidget);
      await gateway.dispose();
      await tester.pumpWidget(const SizedBox.shrink());
    });
  });
}
