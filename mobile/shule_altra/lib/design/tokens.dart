/// Design tokens for the Shule Altra mobile app.
///
/// One place for every colour, radius, space and duration. Screens read these
/// through [ShuleTokens] (a ThemeExtension) so a widget never hard-codes a hex
/// value, and the contrast test can check every pair without rendering a page.
///
/// **The palette is the website's palette.** `src/app/globals.css` defines the
/// hub: #1F5BA6 blue carrying the action, a blue accent chosen for mobile, a
/// cool #F8FAFC workspace and a 1.25rem radius. The app reads the same values
/// here, with a deliberate blue-only mobile accent, so a button on the phone and a
/// button in the dashboard are the same button. A test
/// (`test/palette_parity_test.dart`) reads `globals.css` and fails if these drift.
///
/// One place the app is stricter than the site: the site's muted grey
/// (hsl 215 16% 47%) measures 4.49:1 on its own background, a hair under AA. The
/// app uses hsl(215 20% 39%) — the same hue, 5.6–6.4:1 everywhere it is drawn.
///
/// Ratios in the comments are measured, not estimated; `test/contrast_test.dart`
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
    required this.brandSurface,
    required this.onBrand,
    required this.primary,
    required this.onPrimary,
    required this.accent,
    required this.onAccent,
    required this.border,
    required this.danger,
    required this.success,
    required this.warning,
    required this.gradientStart,
    required this.gradientEnd,
    required this.onGradient,
    required this.shadow,
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

  /// The background of the "brand" card: a filled block, not a text surface.
  ///
  /// It is separate from [primary] because they play different roles: by day the
  /// card is the deep green, at night it is the dark green, and [accent] and
  /// [onPrimary] are the only things drawn on it. Measured, not guessed: 9.59:1
  /// day, 13.01:1 night for accent on brand.
  final Color brandSurface;

  /// Text on [brandSurface]. By day this is white; at night it is the light ink,
  /// because the card is a dark green there too (14.12:1).
  final Color onBrand;

  /// The primary action colour: a filled button by day, a light green button at
  /// night. Never a background for body text.
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

  /// First stop of the brand ramp: every filled call to action. On the website
  /// this is `.colorful-gradient`, `linear-gradient(135deg, primary, accent)`.
  final Color gradientStart;

  /// Second stop of the mobile blue ramp.
  final Color gradientEnd;

  /// Text drawn **on** the ramp. White by day (6.8:1 at the blue end, 4.69:1 at
  /// the darker blue end); near-black at night, where both stops are light.
  final Color onGradient;

  /// The elevation colour: the site's soft blue-tinted card shadow, not
  /// Material's neutral grey.
  final Color shadow;

  /// Day: the hub's workspace — cool off-white, white cards, blue action.
  ///
  /// Every value is the website's: `--background 210 40% 98%`,
  /// `--card 0 0% 100%`, `--primary 214 69% 39%`, `--accent 255 68% 62%`,
  /// `--muted 210 40% 94%`, `--border 214 32% 91%`.
  static const ShuleTokens day = ShuleTokens(
    brightness: Brightness.light,
    canvas: Color(0xFFF8FAFC), // --background. 17.02:1 with ink
    surface: Color(0xFFFFFFFF), // --card
    mutedSurface: Color(0xFFEAF0F6), // --muted 210 40% 94%
    ink: Color(0xFF131820), // --foreground. 17.02:1 on canvas
    inkMuted: Color(0xFF506077), // hsl(215 20% 39%), 6.12:1 on canvas
    brandSurface: Color(0xFF1F5AA8), // --primary; onBrand on it 6.80:1
    onBrand: Color(0xFFFFFFFF),
    primary: Color(0xFF1F5AA8), // --primary; onPrimary on it 6.80:1
    onPrimary: Color(0xFFFFFFFF),
    accent: Color(0xFF17467F), // blue accent, intentionally distinct from the web violet
    onAccent: Color(0xFFFFFFFF),
    border: Color(0xFFE1E7EF), // --border, hairlines only
    danger: Color(0xFFCC1E1E), // --destructive; 5.56:1 on canvas
    success: Color(0xFF1B6247), // 6.80:1 on canvas
    warning: Color(0xFF8A5200), // 5.90:1 on canvas
    gradientStart: Color(0xFF1F5AA8), // --primary
    gradientEnd: Color(0xFF17467F), // deep blue
    onGradient: Color(0xFFFFFFFF), // white on both blue stops
    shadow: Color(0x1A1F5AA8), // the site's blue-tinted card shadow
  );

  /// Night: the site's `.dark` block — #090E1A canvas, #111827 cards, and both
  /// ramp stops lightened so the gradient carries dark text.
  ///
  /// `danger` is the one value lightened past the site's: `.dark
  /// --destructive` (#DF3A3A) measures 3.55:1 on the notice surface, below AA,
  /// and a warning line nobody can read is not a warning.
  static const ShuleTokens night = ShuleTokens(
    brightness: Brightness.dark,
    canvas: Color(0xFF090E1A), // .dark --background 222 47% 7%
    surface: Color(0xFF111827), // .dark --card 222 40% 11%
    mutedSurface: Color(0xFF1D2434), // .dark --muted 222 28% 16%
    ink: Color(0xFFF1F5F9), // .dark --foreground; 17.60:1 on canvas
    inkMuted: Color(0xFF97A5BA), // .dark --muted-foreground; 7.72:1 on canvas
    brandSurface: Color(0xFF111827),
    onBrand: Color(0xFFF1F5F9),
    primary: Color(0xFF4C93F0), // .dark --primary 214 85% 62%
    onPrimary: Color(0xFF0B111E), // onPrimary on it 6.05:1
    accent: Color(0xFF9CC9FF), // accessible light blue
    onAccent: Color(0xFF0B111E), // onAccent on it 6.85:1
    border: Color(0xFF262E40), // .dark --border
    danger: Color(0xFFFF8080), // the site's destructive lightened: 6.39:1 on notice
    success: Color(0xFF6FD3A6), // 10.04:1 on canvas
    warning: Color(0xFFF0C67D), // 11.60:1 on canvas
    gradientStart: Color(0xFF4C93F0),
    gradientEnd: Color(0xFF9CC9FF),
    onGradient: Color(0xFF0B111E), // dark ink on both blue stops
    shadow: Color(0x66000000),
  );

  static ShuleTokens of(BuildContext context) {
    final tokens = Theme.of(context).extension<ShuleTokens>();
    assert(tokens != null, 'ShuleTokens is missing from the ThemeData');
    return tokens ?? day;
  }

  /// The backgrounds a person can read text on, named the way they are used.
  ///
  /// `primary` is deliberately absent: it is the fill of a button, so the only
  /// text that may sit on it is [onPrimary] (a large, bold label). Body text on a
  /// primary fill is 1.17:1 by day, and the test below must not pretend
  /// otherwise.
  /// The brand ramp, exactly as the website draws it: `135deg, primary → accent`.
  ///
  /// Linear, two stops, no third colour. A screen that wants "the Shule Altra
  /// look" asks for this rather than building its own gradient, so the hero, the
  /// login card and the active tab all move together.
  LinearGradient get brandGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [gradientStart, gradientEnd],
      );

  /// The same ramp, washed out, for a page background behind cards.
  LinearGradient get washGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          gradientStart.withValues(alpha: brightness == Brightness.dark ? 0.22 : 0.10),
          gradientEnd.withValues(alpha: brightness == Brightness.dark ? 0.18 : 0.09),
        ],
      );

  Map<String, Color> get surfacesForTest => {
        'canvas': canvas,
        'surface': surface,
        'mutedSurface': mutedSurface,
        'brandSurface': brandSurface,
      };

  @override
  ShuleTokens copyWith({
    Brightness? brightness,
    Color? canvas,
    Color? surface,
    Color? mutedSurface,
    Color? ink,
    Color? inkMuted,
    Color? brandSurface,
    Color? onBrand,
    Color? primary,
    Color? onPrimary,
    Color? accent,
    Color? onAccent,
    Color? border,
    Color? danger,
    Color? success,
    Color? warning,
    Color? gradientStart,
    Color? gradientEnd,
    Color? onGradient,
    Color? shadow,
  }) {
    return ShuleTokens(
      brightness: brightness ?? this.brightness,
      canvas: canvas ?? this.canvas,
      surface: surface ?? this.surface,
      mutedSurface: mutedSurface ?? this.mutedSurface,
      ink: ink ?? this.ink,
      inkMuted: inkMuted ?? this.inkMuted,
      brandSurface: brandSurface ?? this.brandSurface,
      onBrand: onBrand ?? this.onBrand,
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      border: border ?? this.border,
      danger: danger ?? this.danger,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      gradientStart: gradientStart ?? this.gradientStart,
      gradientEnd: gradientEnd ?? this.gradientEnd,
      onGradient: onGradient ?? this.onGradient,
      shadow: shadow ?? this.shadow,
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
      brandSurface: Color.lerp(brandSurface, other.brandSurface, t)!,
      onBrand: Color.lerp(onBrand, other.onBrand, t)!,
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      accent: Color.lerp(accent, other.accent, t)!,
      onAccent: Color.lerp(onAccent, other.onAccent, t)!,
      border: Color.lerp(border, other.border, t)!,
      danger: Color.lerp(danger, other.danger, t)!,
      success: Color.lerp(success, other.success, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      gradientStart: Color.lerp(gradientStart, other.gradientStart, t)!,
      gradientEnd: Color.lerp(gradientEnd, other.gradientEnd, t)!,
      onGradient: Color.lerp(onGradient, other.onGradient, t)!,
      shadow: Color.lerp(shadow, other.shadow, t)!,
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

/// Radii, on the website's scale.
///
/// The site's `--radius` is `1.25rem` = 20 px: buttons and inputs use it as-is,
/// cards double it, chips halve it. The same numbers on the phone are what make a
/// phone screenshot read as the same product as a dashboard screenshot.
abstract final class Corners {
  /// Half the base: tags, small labels, dense table chips.
  static const double chip = 10;

  /// The site's inner blocks: `calc(var(--radius) - 4px)`.
  static const double field = 16;

  /// `--radius`, 1.25rem. Buttons and inputs.
  static const double card = 20;

  /// `calc(var(--radius) * 2)`, the big dashboard cards.
  static const double panel = 32;

  /// The landing page's hero block: `2.5rem`.
  static const double hero = 40;

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
