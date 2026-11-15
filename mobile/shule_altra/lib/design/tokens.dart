/// Design tokens for the Shule Altra mobile app.
///
/// One place for every colour, radius, space and duration. Screens read these
/// through [ShuleTokens] (a ThemeExtension) so a widget never hard-codes a hex
/// value, and the contrast test can check every pair without rendering a page.
///
/// The palette is the forest green direction from `design/`, raised into two
/// themes. Ratios in the comments are measured, not estimated; `test/contrast_test.dart`
/// re-measures them and fails the build if a pair slips below its floor.
library;

import 'package:flutter/material.dart';

/// Minimum text contrast (WCAG 2.1 AA): body 4.5:1, large 3:1.
const double kBodyContrast = 4.5;
const double kLargeContrast = 3.0;

/// Anything a finger has to hit is at least this big.
const double kMinTapTarget = 48;

@immutable
class ShuleTokens extends ThemeExtension<ShuleTokens> {
  const ShuleTokens({
    required this.brightness,
    required this.canvas,
    required this.surface,
    required this.mutedSurface,
    required this.ink,
    required this.inkMuted,
    required this.primary,
    required this.onPrimary,
    required this.accent,
    required this.onAccent,
    required this.border,
    required this.danger,
    required this.success,
    required this.warning,
  });

  final Brightness brightness;

  /// Page background.
  final Color canvas;

  /// Cards and sheets.
  final Color surface;

  /// Secondary blocks: notices, empty states.
  final Color mutedSurface;

  /// Body text and headings.
  final Color ink;

  /// Secondary text. Still readable: 5.5:1 (day), 9.2:1 (night).
  final Color inkMuted;

  /// The deep green of the brand, and the "brand" card by day.
  final Color primary;

  /// Text and icons on [primary].
  final Color onPrimary;

  /// The soft lime highlight; buttons on the dark brand card, marks on charts.
  final Color accent;

  /// Text on [accent].
  final Color onAccent;

  /// Hairlines. Decorative only, so it is not held to a text ratio.
  final Color border;

  final Color danger;
  final Color success;
  final Color warning;

  static const ShuleTokens day = ShuleTokens(
    brightness: Brightness.light,
    canvas: Color(0xFFF6F7F1), // paper
    surface: Color(0xFFFFFFFF),
    mutedSurface: Color(0xFFEAF0E6),
    ink: Color(0xFF14312A), // 12.97:1 on canvas
    inkMuted: Color(0xFF55685F), // 5.52:1 on canvas
    primary: Color(0xFF183D36), // ink/primary 11.9:1
    onPrimary: Color(0xFFFFFFFF),
    accent: Color(0xFFD9EFAA), // ink/accent 11.2:1
    onAccent: Color(0xFF14312A),
    border: Color(0xFFC9D6C2),
    danger: Color(0xFFA02020), // 7.2:1 on canvas
    success: Color(0xFF1B6247), // 6.8:1
    warning: Color(0xFF8A5200), // 5.9:1
  );

  static const ShuleTokens night = ShuleTokens(
    brightness: Brightness.dark,
    canvas: Color(0xFF0A1512),
    surface: Color(0xFF12241E),
    mutedSurface: Color(0xFF182E26),
    ink: Color(0xFFECF1E8), // 16.2:1 on canvas
    inkMuted: Color(0xFFA9BAB2), // 9.2:1 on canvas
    primary: Color(0xFFD6EDA9), // light green button on dark canvas 14.7:1
    onPrimary: Color(0xFF0A1512),
    accent: Color(0xFFD9EFAA), // 15.0:1 on canvas
    onAccent: Color(0xFF0A1512),
    border: Color(0xFF3A5A4B),
    danger: Color(0xFFFFA3A3), // 9.8:1
    success: Color(0xFF84D3AC), // 10.5:1
    warning: Color(0xFFF0C67D), // 11.6:1
  );

  static ShuleTokens of(BuildContext context) {
    final tokens = Theme.of(context).extension<ShuleTokens>();
    assert(tokens != null, 'ShuleTokens is missing from the ThemeData');
    return tokens ?? day;
  }

  /// The pairs the contrast test checks, named the way they are used.
  Map<String, Color> get surfacesForTest => {
        'canvas': canvas,
        'surface': surface,
        'mutedSurface': mutedSurface,
        'primary': primary,
        'accent': accent,
      };

  @override
  ShuleTokens copyWith({
    Brightness? brightness,
    Color? canvas,
    Color? surface,
    Color? mutedSurface,
    Color? ink,
    Color? inkMuted,
    Color? primary,
    Color? onPrimary,
    Color? accent,
    Color? onAccent,
    Color? border,
    Color? danger,
    Color? success,
    Color? warning,
  }) {
    return ShuleTokens(
      brightness: brightness ?? this.brightness,
      canvas: canvas ?? this.canvas,
      surface: surface ?? this.surface,
      mutedSurface: mutedSurface ?? this.mutedSurface,
      ink: ink ?? this.ink,
      inkMuted: inkMuted ?? this.inkMuted,
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      border: border ?? this.border,
      danger: danger ?? this.danger,
      success: success ?? this.success,
      warning: warning ?? this.warning,
    );
  }

  @override
  ShuleTokens lerp(ThemeExtension<ShuleTokens>? other, double t) {
    if (other is! ShuleTokens) return this;
    return ShuleTokens(
      brightness: t < 0.5 ? brightness : other.brightness,
      canvas: Color.lerp(canvas, other.canvas, t)!,
      surface: Color.lerp(surface, other.surface, t)!,
      mutedSurface: Color.lerp(mutedSurface, other.mutedSurface, t)!,
      ink: Color.lerp(ink, other.ink, t)!,
      inkMuted: Color.lerp(inkMuted, other.inkMuted, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      border: Color.lerp(border, other.border, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
    );
  }
}

/// Spacing scale. Nothing in the app uses a number that is not on this scale.
abstract final class Space {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 22;
  static const double xxl = 30;
  static const double xxxl = 44;

  /// Screen gutter. 22 keeps a 390 px phone comfortable with 16 px content.
  static const double gutter = 22;
}

abstract final class Corners {
  static const double chip = 14;
  static const double card = 18;
  static const double panel = 22;
  static const double hero = 26;
  static const double pill = 999;
}

/// Durations. Motion uses these and nothing else, so the app has one tempo.
abstract final class Motion {
  /// A control answering a touch.
  static const Duration fast = Duration(milliseconds: 140);

  /// A small element arriving.
  static const Duration base = Duration(milliseconds: 220);

  /// A screen or a large block arriving.
  static const Duration slow = Duration(milliseconds: 340);

  /// The sticker pop. Long enough to read as elastic, short enough to ignore.
  static const Duration pop = Duration(milliseconds: 620);

  /// Stagger step between two siblings.
  static const Duration stagger = Duration(milliseconds: 55);
}

abstract final class Curves2 {
  /// Overlays, chips, anything that must not look springy.
  static const Curve standard = Curves.easeOutCubic;

  /// Content arriving from below. No overshoot: text must not wobble.
  static const Curve enter = Curves.easeOutQuart;

  /// The sticker only. A little overshoot is what makes it feel like paper.
  static const Curve pop = Curves.easeOutBack;

  /// Leaving. Faster than arriving so the eye is not left waiting.
  static const Curve exit = Curves.easeInCubic;
}
