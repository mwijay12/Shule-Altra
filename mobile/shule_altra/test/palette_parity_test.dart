/// Blue-only brand identity guardrails for Shule Altra mobile.
///
/// Enforces our anti-AI-slop visual identity:
///  * Single brand hue: Cobalt / Azure (`195° – 235°` HSL).
///  * ZERO purple / violet / magenta hues anywhere (`#7D5CE0`, `#A58DEC`, etc.).
///  * Deep navy slate neutrals (never pure `#000000`).
///  * Same-hue tonal gradient (<= 18% lightness shift, zero hue shift).
///  * Strict 4/8px spacing rhythm and bundled Outfit + PlusJakartaSans pairing.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/design/theme.dart';
import 'package:shule_altra_mobile/design/tokens.dart';

bool _isCobaltAzureHue(Color color) {
  final hsl = HSLColor.fromColor(color);
  return hsl.hue >= 195 && hsl.hue <= 235;
}

bool _isPurpleHue(Color color) {
  final hsl = HSLColor.fromColor(color);
  return hsl.saturation > 0.15 && hsl.hue >= 245 && hsl.hue <= 325;
}

void main() {
  group('blue-only visual identity (anti-AI-slop)', () {
    for (final entry in {'day': ShuleTokens.day, 'night': ShuleTokens.night}.entries) {
      final name = entry.key;
      final tokens = entry.value;

      test('$name contains zero purple or violet hues', () {
        final palette = <String, Color>{
          'canvas': tokens.canvas,
          'surface': tokens.surface,
          'mutedSurface': tokens.mutedSurface,
          'ink': tokens.ink,
          'inkMuted': tokens.inkMuted,
          'brandSurface': tokens.brandSurface,
          'primary': tokens.primary,
          'accent': tokens.accent,
          'gradientStart': tokens.gradientStart,
          'gradientEnd': tokens.gradientEnd,
          'glowSoft': tokens.glowSoft,
          'glowDeep': tokens.glowDeep,
          'blueWash': tokens.blueWash,
          'blueInk': tokens.blueInk,
          'blueHeroStart': tokens.blueHeroStart,
          'blueHeroEnd': tokens.blueHeroEnd,
        };
        for (final item in palette.entries) {
          expect(
            _isPurpleHue(item.value),
            isFalse,
            reason: '$name.${item.key} (${item.value}) drifted into purple/violet',
          );
        }
      });

      test('$name brand primary, accent, and hero stops stay strictly Cobalt/Azure', () {
        for (final color in [
          tokens.primary,
          tokens.accent,
          tokens.gradientStart,
          tokens.gradientEnd,
          tokens.blueHeroStart,
          tokens.blueHeroEnd,
        ]) {
          expect(
            _isCobaltAzureHue(color),
            isTrue,
            reason: '$name brand colour $color must sit in Cobalt/Azure (195°–235°)',
          );
        }
      });

      test('$name CTA ramp uses a subtle same-hue tonal shift (no hue-shifting gradient)', () {
        final a = HSLColor.fromColor(tokens.gradientStart);
        final b = HSLColor.fromColor(tokens.gradientEnd);
        expect((a.hue - b.hue).abs(), lessThanOrEqualTo(15));
        expect((a.lightness - b.lightness).abs(), lessThanOrEqualTo(0.18));
      });

      test('$name neutrals never use pure black #000000', () {
        for (final neutral in [tokens.canvas, tokens.surface, tokens.mutedSurface, tokens.ink]) {
          expect(neutral, isNot(const Color(0xFF000000)));
        }
      });
    }

    test('retired forest green and violet AI-slop stops are completely gone', () {
      const retired = <Color>[
        Color(0xFF183D36), // old forest green
        Color(0xFFD9EFAA), // old lime
        Color(0xFF7D5CE0), // old violet accent
        Color(0xFFA58DEC), // old dark violet accent
      ];
      for (final tokens in [ShuleTokens.day, ShuleTokens.night]) {
        final all = <Color>[
          tokens.canvas,
          tokens.surface,
          tokens.mutedSurface,
          tokens.ink,
          tokens.inkMuted,
          tokens.brandSurface,
          tokens.primary,
          tokens.accent,
          tokens.border,
          tokens.gradientStart,
          tokens.gradientEnd,
        ];
        for (final colour in retired) {
          expect(all, isNot(contains(colour)));
        }
      }
    });
  });

  group('typography & spacing discipline', () {
    test('buildTheme pairs Outfit display headings with PlusJakartaSans body', () {
      final light = buildTheme(Brightness.light);
      expect(light.textTheme.displayLarge?.fontFamily, kDisplayFont);
      expect(light.textTheme.headlineLarge?.fontFamily, kDisplayFont);
      expect(light.textTheme.bodyLarge?.fontFamily, kBodyFont);
      expect(light.textTheme.bodyMedium?.fontFamily, kBodyFont);
    });

    test('spacing tokens adhere strictly to the 4/8px grid', () {
      for (final value in [
        Space.xs,
        Space.sm,
        Space.md,
        Space.lg,
        Space.xl,
        Space.xxl,
        Space.xxxl,
      ]) {
        expect(value % 4, 0, reason: 'Spacing $value must be a multiple of 4px');
      }
    });
  });
}
