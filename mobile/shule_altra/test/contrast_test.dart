/// Contrast and motion, measured rather than claimed.
///
/// A palette is easy to get wrong in a theme file and almost impossible to notice
/// in a screenshot, so this test re-measures every text pair the app actually
/// draws. Two rules:
///  * 4.5:1 for body text, 3:1 for large text (WCAG 2.1 AA);
///  * reduced motion removes every reveal, and hides nothing.
library;

import 'dart:math' as math;
import 'dart:ui' show Color;

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

void main() {
  final themes = <String, ShuleTokens>{
    'day': ShuleTokens.day,
    'night': ShuleTokens.night,
  };

  group('text contrast', () {
    for (final entry in themes.entries) {
      final name = entry.key;
      final tokens = entry.value;

      test('$name body text on every surface', () {
        for (final surface in tokens.surfacesForTest.entries) {
          expectPass('$name ink on ${surface.key}', tokens.ink, surface.value, kBodyContrast);
          expectPass('$name inkMuted on ${surface.key}', tokens.inkMuted, surface.value, kBodyContrast);
        }
      });

      test('$name text that sits on the brand and accent fills', () {
        expectPass('$name onPrimary', tokens.onPrimary, tokens.primary, kBodyContrast);
        expectPass('$name onAccent', tokens.onAccent, tokens.accent, kBodyContrast);
        // The brand card puts the accent eyebrow straight on the deep green.
        expectPass('$name accent on primary', tokens.accent, tokens.primary, kBodyContrast);
      });

      test('$name status colours are readable, not decorative', () {
        for (final surface in tokens.surfacesForTest.entries) {
          expectPass('$name danger on ${surface.key}', tokens.danger, surface.value, kBodyContrast);
          expectPass('$name success on ${surface.key}', tokens.success, surface.value, kBodyContrast);
          expectPass('$name warning on ${surface.key}', tokens.warning, surface.value, kBodyContrast);
        }
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
      expect(light.outlinedButtonTheme.style?.minimumSize?.resolve({})?.height,
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

      // First frame: no controller, no fade, no offset. The text is there.
      expect(find.text('always visible'), findsOneWidget);
      expect(
        tester.widget<Opacity>(find.ancestor(
          of: find.text('always visible'),
          matching: find.byType(Opacity),
        ).first).opacity,
        1.0,
      );
      await tester.pumpAndSettle();
      expect(find.text('always visible'), findsOneWidget);
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
      expect(find.text('sticker'), findsOneWidget);
      expect(
        tester.widget<Opacity>(find.ancestor(
          of: find.text('sticker'),
          matching: find.byType(Opacity),
        ).first).opacity,
        1.0,
      );
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
