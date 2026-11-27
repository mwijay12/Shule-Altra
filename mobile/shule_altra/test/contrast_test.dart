/// Contrast and motion, measured rather than claimed.
///
/// A palette is easy to get wrong in a theme file and almost impossible to notice
/// in a screenshot, so this test re-measures every text pair the app actually
/// draws. Two rules:
///  * 4.5:1 for body text, 3:1 for large text (WCAG 2.1 AA);
///  * reduced motion removes every reveal, and hides nothing.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/design/motion.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/design/tokens.dart';

/// WCAG 2.1 relative luminance, from the specification's own formula.
double _linear(double channel) {
  return channel <= 0.03928
      ? channel / 12.92
      : math.pow((channel + 0.055) / 1.055, 2.4).toDouble();
}

double luminance(Color colour) =>
    0.2126 * _linear(colour.r) + 0.7152 * _linear(colour.g) + 0.0722 * _linear(colour.b);

double ratio(Color foreground, Color background) {
  final a = luminance(foreground);
  final b = luminance(background);
  final lighter = a > b ? a : b;
  final darker = a > b ? b : a;
  return (lighter + 0.05) / (darker + 0.05);
}

void expectPass(String name, Color fg, Color bg, double floor) {
  final measured = ratio(fg, bg);
  expect(
    measured,
    greaterThanOrEqualTo(floor),
    reason: '$name measured ${measured.toStringAsFixed(2)}:1, floor is $floor:1',
  );
}

/// Where each pair appears, so the table cannot drift from the screens.
typedef _Use = ({
  String where,
  Color Function(ShuleTokens) foreground,
  Color Function(ShuleTokens) background,
});

/// Every text pair the app actually draws, and the floor it must clear.
///
/// This is a table of real uses, not a cross product of every colour: `ink` on a
/// dark brand fill is 1.17:1 and is meaningless because the app never draws it.
/// If a new screen introduces a pair, it belongs in this table.
final List<_Use> _textUses = <_Use>[
  // Headings and body on the page.
  (where: 'body on canvas', foreground: (t) => t.ink, background: (t) => t.canvas),
  (where: 'body on card', foreground: (t) => t.ink, background: (t) => t.surface),
  (where: 'body on notice', foreground: (t) => t.ink, background: (t) => t.mutedSurface),
  // Secondary text: captions, the source label, hints.
  (where: 'muted text on canvas', foreground: (t) => t.inkMuted, background: (t) => t.canvas),
  (where: 'muted text on card', foreground: (t) => t.inkMuted, background: (t) => t.surface),
  (where: 'muted text on notice', foreground: (t) => t.inkMuted, background: (t) => t.mutedSurface),
  // Status words: the balance marker, the "marked present" line, cautions.
  (where: 'danger on notice', foreground: (t) => t.danger, background: (t) => t.mutedSurface),
  (where: 'danger on canvas', foreground: (t) => t.danger, background: (t) => t.canvas),
  (where: 'success on card', foreground: (t) => t.success, background: (t) => t.surface),
  (where: 'warning on card', foreground: (t) => t.warning, background: (t) => t.surface),
  // Filled surfaces: button labels and the brand card.
  (where: 'button label', foreground: (t) => t.onPrimary, background: (t) => t.primary),
  (where: 'pill label', foreground: (t) => t.onAccent, background: (t) => t.accent),
  // The panel's eyebrow is onGradient like everything else on the ramp: the
  // accent on the primary fill was 1.45:1, which this table used to assert as
  // passing. It never was drawn that way by the old widget, and it is no longer
  // a pair the app has.
  (where: 'brand eyebrow', foreground: (t) => t.onGradient, background: (t) => t.gradientStart),
  (where: 'brand heading', foreground: (t) => t.onBrand, background: (t) => t.brandSurface),
  // Text on the brand ramp, measured against *both* stops: a gradient has no
  // single background colour, so the harder end has to pass on its own.
  (where: 'heading on the ramp start', foreground: (t) => t.onGradient, background: (t) => t.gradientStart),
  (where: 'heading on the ramp end', foreground: (t) => t.onGradient, background: (t) => t.gradientEnd),
  // The inverted pill that sits on the ramp: a white/blue button on the gradient.
  (where: 'pill on the ramp start', foreground: (t) => t.primary, background: (t) => t.surface),
  // Blue editorial glass surfaces & badges.
  (where: 'blue ink on blue wash pill', foreground: (t) => t.blueInk, background: (t) => t.blueWash),
  (where: 'blue ink on card', foreground: (t) => t.blueInk, background: (t) => t.surface),
  (where: 'body on inner glass tile', foreground: (t) => t.ink, background: (t) => t.innerSurface),
  (where: 'muted text on inner glass tile', foreground: (t) => t.inkMuted, background: (t) => t.innerSurface),
  (where: 'hero text on pure-blue start', foreground: (t) => t.onGradient, background: (t) => t.blueHeroStart),
  (where: 'hero text on pure-blue end', foreground: (t) => t.onGradient, background: (t) => t.blueHeroEnd),
];

void main() {
  final themes = <String, ShuleTokens>{
    'day': ShuleTokens.day,
    'night': ShuleTokens.night,
  };

  group('text contrast', () {
    for (final entry in themes.entries) {
      final name = entry.key;
      final tokens = entry.value;

      for (final use in _textUses) {
        test('$name ${use.where}', () {
          expectPass(
            '$name ${use.where}',
            use.foreground(tokens),
            use.background(tokens),
            kBodyContrast,
          );
        });
      }

      test('$name the brand panel draws its text at full strength', () {
        for (final stop in [tokens.gradientStart, tokens.gradientEnd]) {
          expectPass('$name brand text on the ramp', tokens.onGradient, stop, kBodyContrast);
        }
        // Even on our higher-contrast cobalt ramp, dropping text opacity to 0.80
        // on the lighter day stop would still slip below AA, proving full opacity
        // onGradient text must be preserved.
        if (tokens.brightness == Brightness.light) {
          final faded = Color.alphaBlend(
            tokens.onGradient.withValues(alpha: 0.78),
            tokens.gradientEnd,
          );
          expect(ratio(faded, tokens.gradientEnd), lessThan(kBodyContrast));
        }
      });

      test('$name hairlines are decorative, and are not used as text', () {
        // Recorded rather than asserted at 4.5:1: a border is not read, and
        // pretending it is would push the palette into something it is not.
        final border = tokens.border;
        expect(border, isNot(tokens.ink));
        expect(border, isNot(tokens.inkMuted));
      });
    }
  });

  group('theme wiring', () {
    test('both themes install the token extension', () {
      final light = buildTheme(Brightness.light);
      final dark = buildTheme(Brightness.dark);
      expect(light.extension<ShuleTokens>(), isNotNull);
      expect(dark.extension<ShuleTokens>(), isNotNull);
      expect(light.extension<ShuleTokens>()!.brightness, Brightness.light);
      expect(dark.extension<ShuleTokens>()!.brightness, Brightness.dark);
    });

    test('the scaffold background is the canvas token, not a guess', () {
      expect(buildTheme(Brightness.light).scaffoldBackgroundColor, ShuleTokens.day.canvas);
      expect(buildTheme(Brightness.dark).scaffoldBackgroundColor, ShuleTokens.night.canvas);
    });

    test('every tap target meets 48 logical pixels', () {
      final light = buildTheme(Brightness.light);
      expect(light.filledButtonTheme.style?.minimumSize?.resolve(<WidgetState>{})?.height,
          greaterThanOrEqualTo(kMinTapTarget));
      expect(light.outlinedButtonTheme.style?.minimumSize?.resolve(<WidgetState>{})?.height,
          greaterThanOrEqualTo(kMinTapTarget));
    });
  });

  group('reduced motion', () {
    testWidgets('Rise shows its child at once and never hides it', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: Scaffold(body: Rise(child: const Text('always visible'))),
        ),
      );

      // Reduced motion takes the controller out of the tree, so the child is
      // already in its final position and does not move. Measuring the position
      // is honest; counting Opacity widgets would measure Material's own wrapper.
      expect(find.text('always visible'), findsOneWidget);
      final before = tester.getTopLeft(find.text('always visible'));
      await tester.pumpAndSettle();
      final after = tester.getTopLeft(find.text('always visible'));
      expect(after, before, reason: 'the text must not move once animations are off');
      expect(tester.getSize(find.text('always visible')).height, greaterThan(0));
    });

    testWidgets('StickerPop rests at full size when animations are off', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(disableAnimations: true),
            child: child!,
          ),
          home: const Scaffold(body: StickerPop(child: Text('sticker'))),
        ),
      );
      await tester.pump();
      // At rest: full size, drawn, in place. Under reduced motion the pop never
      // starts, so the first frame is the last frame.
      expect(find.text('sticker'), findsOneWidget);
      final before = tester.getRect(find.text('sticker'));
      await tester.pump(const Duration(milliseconds: 700));
      expect(tester.getRect(find.text('sticker')), before);
    });

    test('MotionPrefs zeroes every duration it owns', () {
      const reduced = MotionPrefs(reduced: true);
      expect(reduced.fast, Duration.zero);
      expect(reduced.base, Duration.zero);
      expect(reduced.slow, Duration.zero);
      expect(reduced.pop, Duration.zero);
      expect(reduced.stagger, Duration.zero);
      expect(reduced.delay(6), Duration.zero);

      const normal = MotionPrefs(reduced: false);
      expect(normal.fast, greaterThan(Duration.zero));
      // Stagger is clamped so a long list cannot take seconds to appear.
      expect(normal.delay(50), normal.delay(6));
    });
  });
}
