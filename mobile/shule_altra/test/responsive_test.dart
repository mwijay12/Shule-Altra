/// Responsive overflow guard across phone (390), tablet (820) and desktop (1440)
/// at both 1.0x and 1.3x system text scales.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';

import 'fake_gateway.dart';

const _sizes = <({String name, Size size, double ratio})>[
  (name: 'phone 390x844', size: Size(390, 844), ratio: 3),
  (name: 'tablet 820x1180', size: Size(820, 1180), ratio: 2),
  (name: 'large window 1440x900', size: Size(1440, 900), ratio: 1),
];

const _scales = <double>[1.0, 1.3];

Future<void> _expectNoOverflow(WidgetTester tester, String where) async {
  await tester.pumpAndSettle();
  final error = tester.takeException();
  expect(error, isNull, reason: '$where reported: $error');
}

Future<void> _tap(WidgetTester tester, String label) async {
  final target = find.text(label);
  expect(target, findsWidgets, reason: 'nothing on screen says "$label"');
  await tester.ensureVisible(target.first);
  await tester.pumpAndSettle();
  await tester.tap(target.first);
  await tester.pumpAndSettle();
}

void main() {
  for (final device in _sizes) {
    for (final scale in _scales) {
      testWidgets('${device.name} at text scale $scale', (tester) async {
        tester.view.physicalSize = device.size * device.ratio;
        tester.view.devicePixelRatio = device.ratio;
        addTearDown(tester.view.reset);

        final gateway = FakeGateway(pageSize: 2);
        await tester.pumpWidget(
          ShuleApp.withGateway(gateway: gateway, textScale: scale),
        );
        await _expectNoOverflow(tester, 'onboarding page 1');

        await _tap(tester, 'Next');
        await _expectNoOverflow(tester, 'onboarding page 2');
        await _tap(tester, 'Next');
        await _expectNoOverflow(tester, 'onboarding page 3');

        await _tap(tester, 'Sign in to Shule Altra');
        await _expectNoOverflow(tester, 'staff sign-in');

        await tester.scrollUntilVisible(
          find.textContaining('Administrator'),
          180,
          scrollable: find.byType(Scrollable).first,
        );
        await _tap(tester, 'Administrator · Head Master');
        await _expectNoOverflow(tester, 'home');

        await _tap(tester, 'Learners');
        await _expectNoOverflow(tester, 'learners');

        await _tap(tester, 'Amina Juma');
        await _expectNoOverflow(tester, 'learner detail');
        await tester.binding.handlePopRoute();
        await tester.pumpAndSettle();

        await _tap(tester, 'School Day');
        await _expectNoOverflow(tester, 'school day attendance');

        await _tap(tester, 'Finance');
        await _expectNoOverflow(tester, 'school day finance');

        await _tap(tester, 'Academics');
        await _expectNoOverflow(tester, 'school day academics');

        await _tap(tester, 'Timetable');
        await _expectNoOverflow(tester, 'school day timetable');

        await _tap(tester, 'More');
        await _expectNoOverflow(tester, 'more');

        for (var step = 0; step < 6; step++) {
          await tester.drag(find.byType(Scrollable).first, const Offset(0, -280));
          await _expectNoOverflow(tester, 'more scrolled $step');
        }

        await gateway.close();
      });
    }
  }
}
