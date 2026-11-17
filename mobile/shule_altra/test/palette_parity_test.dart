/// The app's palette must be the website's palette, and this is what proves it.
///
/// The first version of this app used its own forest green: #183D36 against the
/// hub's #1F5BA6, lime against violet, on a warm paper background. It did not
/// look like the same product, and no screenshot made that obvious — only the two
/// token files side by side did.
///
/// So this test reads the website's `src/app/globals.css` directly, converts its
/// HSL custom properties with the same formula CSS uses, and holds the app's
/// tokens to them. If someone retunes the hub's brand, this test fails until the
/// app follows, which is the whole point.
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/design/tokens.dart';

/// Where the website's theme lives, relative to this package.
/// Flutter runs tests from the package root (`mobile/shule_altra`), so the
/// website's stylesheet and the package's own tokens file are two levels up.
final File _globals = File('../../src/app/globals.css');

/// Used only to find the repository: if the stylesheet is in the checkout, the
/// checkout is where the test is running from.
File get _tokens => File('lib/design/tokens.dart');

/// One `--name: h s% l%` declaration, resolved to a colour.
///
/// The site writes `--primary: 214 69% 39%`, which is what
/// `hsl(var(--primary))` expands to; this does the same conversion.
Color _hsl(String h, String s, String l) => HSLColor.fromAHSL(1, double.parse(h), double.parse(s), double.parse(l)).toColor();

/// Every custom property in the block that starts at [selector], as HSL colours.
///
/// Deliberately a small hand-rolled reader rather than a CSS parser: the file is
/// plain, and a parser would hide the one thing that matters — that the numbers
/// are still the numbers.
Map<String, Color> _readBlock(String css, String selector) {
  final start = css.indexOf(selector);
  expect(start, greaterThan(-1), reason: 'src/app/globals.css has no "$selector" block');
  final open = css.indexOf('{', start);
  var depth = 0;
  var end = open;
  for (var i = open; i < css.length; i++) {
    if (css[i] == '{') depth++;
    if (css[i] == '}') {
      depth--;
      if (depth == 0) {
        end = i;
        break;
      }
    }
  }
  final block = css.substring(open, end);

  final found = <String, Color>{};
  final pattern = RegExp(r'--([a-z-]+):\s*(-?[\d.]+)\s+(-?[\d.]+)%\s+(-?[\d.]+)%');
  for (final match in pattern.allMatches(block)) {
    found[match.group(1)!] = _hsl(match.group(2)!, match.group(3)!, match.group(4)!);
  }
  return found;
}

/// Two colours are the same if every channel is within one step of rounding.
void expectSameColour(String name, Color app, Color site) {
  final appRgb = <int>[(app.r * 255).round(), (app.g * 255).round(), (app.b * 255).round()];
  final siteRgb = <int>[(site.r * 255).round(), (site.g * 255).round(), (site.b * 255).round()];
  for (var i = 0; i < 3; i++) {
    expect(
      (appRgb[i] - siteRgb[i]).abs(),
      lessThanOrEqualTo(1),
      reason: '$name: app $appRgb vs website $siteRgb '
          '(the app changed a colour the website still owns)',
    );
  }
}

void main() {
  late String css;
  late Map<String, Color> light;
  late Map<String, Color> dark;

  setUpAll(() {
    if (!_globals.existsSync() || !_tokens.existsSync()) {
      fail('Cannot find the repository beside the app package. Expected '
          '${_globals.absolute.path} — run flutter test from mobile/shule_altra.');
    }
    css = _globals.readAsStringSync();
    light = _readBlock(css, ':root {');
    dark = _readBlock(css, '.dark {');
  });

  group('the day palette is the website :root block', () {
    test('the page, the cards and the muted blocks', () {
      expectSameColour('canvas', ShuleTokens.day.canvas, light['background']!);
      expectSameColour('surface', ShuleTokens.day.surface, light['card']!);
      expectSameColour('mutedSurface', ShuleTokens.day.mutedSurface, light['muted']!);
      expectSameColour('border', ShuleTokens.day.border, light['border']!);
    });

    test('the action, the accent and the ramp', () {
      expectSameColour('primary', ShuleTokens.day.primary, light['primary']!);
      expectSameColour('accent', ShuleTokens.day.accent, light['accent']!);
      expectSameColour('gradientStart', ShuleTokens.day.gradientStart, light['primary']!);
      expectSameColour('gradientEnd', ShuleTokens.day.gradientEnd, light['accent']!);
      expectSameColour('danger', ShuleTokens.day.danger, light['destructive']!);
    });

    test('the ink, and the one documented exception', () {
      expectSameColour('ink', ShuleTokens.day.ink, light['foreground']!);
      // Muted ink is the exception, and it is asserted as an exception so nobody
      // "fixes" it back to a failing ratio: the site's grey is 4.49:1 on its own
      // background, and the app is deliberately a shade darker.
      final siteMuted = light['muted-foreground']!;
      expect(ShuleTokens.day.inkMuted, isNot(siteMuted),
          reason: 'the app should stay darker than the site here');
      expect(
        ShuleTokens.day.inkMuted.computeLuminance(),
        lessThan(siteMuted.computeLuminance()),
        reason: 'the app muted ink must be darker (higher contrast) than the site',
      );
    });
  });

  group('the night palette is the website .dark block', () {
    test('surfaces, ink and both ramp stops', () {
      expectSameColour('canvas', ShuleTokens.night.canvas, dark['background']!);
      expectSameColour('surface', ShuleTokens.night.surface, dark['card']!);
      expectSameColour('mutedSurface', ShuleTokens.night.mutedSurface, dark['muted']!);
      expectSameColour('ink', ShuleTokens.night.ink, dark['foreground']!);
      expectSameColour('primary', ShuleTokens.night.primary, dark['primary']!);
      expectSameColour('accent', ShuleTokens.night.accent, dark['accent']!);
      expectSameColour('gradientStart', ShuleTokens.night.gradientStart, dark['primary']!);
      expectSameColour('gradientEnd', ShuleTokens.night.gradientEnd, dark['accent']!);
      expectSameColour('border', ShuleTokens.night.border, dark['border']!);
    });

    test('danger is the second documented exception', () {
      // `.dark --destructive` (#DF3A3A) measures 3.55:1 on the notice surface.
      // The app lightens it and says so here, so a future reader does not
      // "restore parity" and ship an unreadable warning.
      expect(ShuleTokens.night.danger, isNot(dark['destructive']));
      expect(
        ShuleTokens.night.danger.computeLuminance(),
        greaterThan(dark['destructive']!.computeLuminance()),
        reason: 'the app danger must be lighter (higher contrast) than the site',
      );
    });
  });

  group('the shape vocabulary is the website radius', () {
    test('the base radius is the site --radius of 1.25rem', () {
      final radius = RegExp(r'--radius:\s*([\d.]+)rem').firstMatch(css);
      expect(radius, isNotNull, reason: 'globals.css no longer defines --radius');
      // 1.25rem at the CSS root font size of 16 px.
      expect(Corners.card, closeTo(double.parse(radius!.group(1)!) * 16, 0.01));
    });

    test('the ramp runs at the site gradient angle, corner to corner', () {
      // `.colorful-gradient` is `linear-gradient(135deg, primary, accent)`.
      // 135deg in CSS (from 12 o'clock, clockwise) is top-left → bottom-right,
      // which is what the app's brandGradient says.
      expect(css.contains('linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)'),
          isTrue,
          reason: 'the website ramp changed; the app gradient must be re-derived');
      final gradient = ShuleTokens.day.brandGradient;
      expect(gradient.begin, Alignment.topLeft);
      expect(gradient.end, Alignment.bottomRight);
      expect(gradient.colors, [ShuleTokens.day.gradientStart, ShuleTokens.day.gradientEnd]);
    });
  });

  group('the app never drifts back to the old palette', () {
    test('the forest green from pilot 02 is gone from the tokens', () {
      const retired = <Color>[
        Color(0xFF183D36), // primary / brandSurface
        Color(0xFFD9EFAA), // accent lime
        Color(0xFFF6F7F1), // paper canvas
        Color(0xFFEAF0E6), // muted paper
        Color(0xFFC9D6C2), // green hairline
      ];
      for (final tokens in [ShuleTokens.day, ShuleTokens.night]) {
        final used = <Color>[
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
          expect(used, isNot(contains(colour)), reason: 'the retired $colour is still in the tokens');
        }
      }
    });

    test('the two ramp stops are different colours, so the gradient is visible', () {
      for (final tokens in [ShuleTokens.day, ShuleTokens.night]) {
        final distance = (tokens.gradientStart.r - tokens.gradientEnd.r).abs() +
            (tokens.gradientStart.g - tokens.gradientEnd.g).abs() +
            (tokens.gradientStart.b - tokens.gradientEnd.b).abs();
        expect(distance, greaterThan(0.2), reason: 'the ramp is nearly one flat colour');
      }
    });
  });
}
