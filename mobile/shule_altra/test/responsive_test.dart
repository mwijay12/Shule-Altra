/// Every screen, at every width a person might actually get.
///
/// The pack asks for 390 / 820 / 1440-equivalent views, and this app also has to
/// survive a large system font. A layout that overflows is not a cosmetic
/// problem: on a real phone the overflowing part is simply not on the screen, and
/// nobody can tap it.
///
/// A `RenderFlex overflowed` is thrown as an error during layout, so on a
/// widget-test binding it fails the test by itself. This test still calls
/// [WidgetTester.takeException] explicitly so the failure names the size and the
/// screen that broke.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/app/app.dart';

import 'fake_gateway.dart';

/// Logical sizes, with the pixel ratio a real device of that class reports.
const _sizes = <({String name, Size size, double ratio})>[
  (name: 'phone 390x844', size: Size(390, 844), ratio: 3),
  (name: 'tablet 820x1180', size: Size(820, 1180), ratio: 2),
  (name: 'large window 1440x900', size: Size(1440, 900), ratio: 1),
];

/// Android's font scale goes to 2.0; 1.3 is a common accessibility setting and
/// the point where fixed-height rows usually start to break.
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

        // Onboarding, all three pages.
        await _tap(tester, 'Continue');
        await _expectNoOverflow(tester, 'onboarding page 2');
        await _tap(tester, 'Continue');
        await _expectNoOverflow(tester, 'onboarding page 3');

        // Home, then the register, signed out and signed in.
        await _tap(tester, 'Explore the sample preview');
        await _expectNoOverflow(tester, 'home');

        await _tap(tester, 'Learners');
        await _expectNoOverflow(tester, 'register, signed out');
        await _tap(tester, 'Continue with Google');
        await _expectNoOverflow(tester, 'register, loaded');

        // A learner's sheet.
        await _tap(tester, 'Amina Juma');
        await _expectNoOverflow(tester, 'learner detail');
        await tester.tapAt(const Offset(10, 10)); // dismiss the sheet
        await tester.pumpAndSettle();

        // The practice sheet and the honest page.
        await _tap(tester, 'Day');
        await _expectNoOverflow(tester, 'school day');
        await _tap(tester, 'Present');
        await _expectNoOverflow(tester, 'school day, marked');

        await _tap(tester, 'More');
        await _expectNoOverflow(tester, 'more');

        // Walk the rest of the longest page: a lazily built list only lays out
        // what is in view, so the lower half needs its own check.
        for (var step = 0; step < 10; step++) {
          await tester.drag(find.byType(Scrollable).first, const Offset(0, -300));
          await _expectNoOverflow(tester, 'more, scrolled $step');
        }

        await gateway.close();
      });
    }
  }
}
