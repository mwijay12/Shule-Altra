/// Design tokens for the Shule Altra mobile app.
///
/// One place for every colour, radius, space and duration. Screens read these
/// through [ShuleTokens] (a ThemeExtension) so a widget never hard-codes a hex
/// value, and the contrast test can check every pair without rendering a page.
///
/// **Blue Editorial Glassmorphism**, anchored to the website's blue palette:
/// `src/app/globals.css` defines the hub — #1F5AA8 royal blue carrying the
/// action, #7D5CE0 violet on the brand ramp, a cool #F8FAFC workspace and a
/// 1.25rem radius. The mobile app layers atmospheric blue mesh blooms, frosted
/// translucent glass cards, nested inner rows and full-pill controls directly
/// over those exact values so both products belong to the same family.
///
/// A test (`test/palette_parity_test.dart`) reads `globals.css` and fails if
/// any shared token drifts. Ratios in the comments are measured, not estimated;
/// `test/contrast_test.dart` re-measures them and fails the build if a pair
/// slips below its floor.
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
    required this.glowSoft,
    required this.glowDeep,
    required this.blueWash,
    required this.blueInk,
    required this.glassStart,
    required this.glassEnd,
    required this.glassBorder,
    required this.innerSurface,
    required this.blueHeroStart,
    required this.blueHeroEnd,
  });

  final Brightness brightness;

  /// Page background.
  final Color canvas;

  /// Solid cards and fallback sheets.
  final Color surface;

  /// Secondary blocks: notices, empty states, inputs.
  final Color mutedSurface;

  /// Body text and headings.
  final Color ink;

  /// Secondary text. Still readable: 6.12:1 (day), 7.72:1 (night).
  final Color inkMuted;

  /// The background of the solid brand surface.
  final Color brandSurface;

  /// Text on [brandSurface].
  final Color onBrand;

  /// The primary blue action colour.
  final Color primary;

  /// Text and icons on [primary].
  final Color onPrimary;

  /// Secondary brand accent (website parity).
  final Color accent;

  /// Text on [accent].
  final Color onAccent;

  /// Hairlines. Decorative only, so it is not held to a text ratio.
  final Color border;

  final Color danger;
  final Color success;
  final Color warning;

  /// First stop of the website's brand ramp (`linear-gradient(135deg, primary, accent)`).
  final Color gradientStart;

  /// Second stop of the same ramp — the site's `--accent` violet.
  final Color gradientEnd;

  /// Text drawn **on** [brandGradient] and [blueHeroGradient].
  final Color onGradient;

  /// Soft blue-tinted card elevation shadow.
  final Color shadow;

  /// Soft sky-blue radial ambient bloom behind frosted glass surfaces.
  final Color glowSoft;

  /// Deeper sapphire/cobalt radial bloom and orb halo.
  final Color glowDeep;

  /// Soft blue pill/badge/avatar wash (`#EAF3FF` day, `#142442` night).
  final Color blueWash;

  /// High-contrast blue ink on [blueWash], [surface] and [canvas].
  final Color blueInk;

  /// Top-left stop of a frosted glass card gradient.
  final Color glassStart;

  /// Bottom-right stop of a frosted glass card gradient.
  final Color glassEnd;

  /// Crisp 1 px glass rim around translucent cards and the floating dock.
  final Color glassBorder;

  /// Nested inner row surface inside a glass card (Z-depth layer).
  final Color innerSurface;

  /// Deep sapphire start of the pure-blue editorial hero gradient.
  final Color blueHeroStart;

  /// Bright azure end of the pure-blue editorial hero gradient.
  final Color blueHeroEnd;

  /// Day: cool off-white canvas, sky-blue ambient blooms, frosted white glass,
  /// rich royal-blue primary actions.
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
    accent: Color(0xFF7D5CE0), // --accent violet; onAccent on it 4.69:1
    onAccent: Color(0xFFFFFFFF),
    border: Color(0xFFE1E7EF), // --border, hairlines only
    danger: Color(0xFFCC1E1E), // --destructive; 5.56:1 on canvas
    success: Color(0xFF1B6247), // 6.80:1 on canvas
    warning: Color(0xFF8A5200), // 5.90:1 on canvas
    gradientStart: Color(0xFF1F5AA8), // --primary
    gradientEnd: Color(0xFF7D5CE0), // --accent
    onGradient: Color(0xFFFFFFFF), // 6.80:1 at blue, 4.69:1 at violet
    shadow: Color(0x1E1F5AA8), // soft sapphire elevation shadow
    glowSoft: Color(0xFF93C5FD), // sky blue ambient mesh orb
    glowDeep: Color(0xFF2563EB), // royal cobalt orb & highlight
    blueWash: Color(0xFFEAF3FF), // soft ice-blue badge/avatar fill
    blueInk: Color(0xFF15458A), // 8.34:1 on blueWash, 9.33:1 on white
    glassStart: Color(0xDEFFFFFF), // 87% crisp frosted white
    glassEnd: Color(0xB8EEF5FF), // 72% cool ice-blue translucent sheen
    glassBorder: Color(0xD9FFFFFF), // 85% luminous white glass edge
    innerSurface: Color(0xF5FFFFFF), // 96% pure white nested inner row
    blueHeroStart: Color(0xFF164385), // 9.65:1 with white onGradient
    blueHeroEnd: Color(0xFF256CC9), // 5.16:1 with white onGradient
  );

  /// Night: deep midnight navy canvas, luminous sapphire ambient glow, dark
  /// frosted glass cards, electric sky-blue actions.
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
    accent: Color(0xFFA58DEC), // .dark --accent 255 72% 74%
    onAccent: Color(0xFF0B111E), // onAccent on it 6.85:1
    border: Color(0xFF262E40), // .dark --border
    danger: Color(0xFFFF8080), // lightened for AA: 6.39:1 on notice
    success: Color(0xFF6FD3A6), // 10.04:1 on canvas
    warning: Color(0xFFF0C67D), // 11.60:1 on canvas
    gradientStart: Color(0xFF4C93F0),
    gradientEnd: Color(0xFFA58DEC),
    onGradient: Color(0xFF0B111E), // 6.05:1 at blue, 6.85:1 at violet
    shadow: Color(0x66000000),
    glowSoft: Color(0xFF2563EB), // diffused deep sapphire bloom
    glowDeep: Color(0xFF3B82F6), // luminous cobalt glow
    blueWash: Color(0xFF142442), // midnight sapphire badge/avatar fill
    blueInk: Color(0xFF93C5FD), // 8.56:1 on blueWash, 9.84:1 on surface
    glassStart: Color(0x24FFFFFF), // 14% frosted dark glass
    glassEnd: Color(0x123B82F6), // 7% cool sapphire glass tail
    glassBorder: Color(0x33FFFFFF), // 20% crisp glass rim
    innerSurface: Color(0xFF182236), // deep navy nested inner row
    blueHeroStart: Color(0xFF3B82F6), // 5.13:1 with #0B111E onGradient
    blueHeroEnd: Color(0xFF60A5FA), // 7.42:1 with #0B111E onGradient
  );

  static ShuleTokens of(BuildContext context) {
    final tokens = Theme.of(context).extension<ShuleTokens>();
    assert(tokens != null, 'ShuleTokens is missing from the ThemeData');
    return tokens ?? day;
  }

  /// The website's brand ramp: `135deg, primary -> accent`.
  LinearGradient get brandGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [gradientStart, gradientEnd],
      );

  /// Pure editorial blue gradient for the hero panel, primary blue CTAs and
  /// detached quick-action orb so blue is the unmistakable anchor of the app.
  LinearGradient get blueHeroGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [blueHeroStart, primary, blueHeroEnd],
        stops: const [0.0, 0.52, 1.0],
      );

  /// Soft translucent glass fill for list cards (no backdrop blur cost).
  LinearGradient get glassGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [glassStart, glassEnd],
      );

  /// The same ramp, washed out, for subtle tinted sections.
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
    Color? glowSoft,
    Color? glowDeep,
    Color? blueWash,
    Color? blueInk,
    Color? glassStart,
    Color? glassEnd,
    Color? glassBorder,
    Color? innerSurface,
    Color? blueHeroStart,
    Color? blueHeroEnd,
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
      glowSoft: glowSoft ?? this.glowSoft,
      glowDeep: glowDeep ?? this.glowDeep,
      blueWash: blueWash ?? this.blueWash,
      blueInk: blueInk ?? this.blueInk,
      glassStart: glassStart ?? this.glassStart,
      glassEnd: glassEnd ?? this.glassEnd,
      glassBorder: glassBorder ?? this.glassBorder,
      innerSurface: innerSurface ?? this.innerSurface,
      blueHeroStart: blueHeroStart ?? this.blueHeroStart,
      blueHeroEnd: blueHeroEnd ?? this.blueHeroEnd,
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
      glowSoft: Color.lerp(glowSoft, other.glowSoft, t)!,
      glowDeep: Color.lerp(glowDeep, other.glowDeep, t)!,
      blueWash: Color.lerp(blueWash, other.blueWash, t)!,
      blueInk: Color.lerp(blueInk, other.blueInk, t)!,
      glassStart: Color.lerp(glassStart, other.glassStart, t)!,
      glassEnd: Color.lerp(glassEnd, other.glassEnd, t)!,
      glassBorder: Color.lerp(glassBorder, other.glassBorder, t)!,
      innerSurface: Color.lerp(innerSurface, other.innerSurface, t)!,
      blueHeroStart: Color.lerp(blueHeroStart, other.blueHeroStart, t)!,
      blueHeroEnd: Color.lerp(blueHeroEnd, other.blueHeroEnd, t)!,
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

  /// Screen gutter. 20 keeps a 390 px phone airy while giving glass cards room.
  static const double gutter = 20;
}

/// Radii, uniting the website's 1.25rem (`20px`) base with the editorial glass
/// hierarchy: 26 px outer glass cards, 16 px nested inner rows, 999 px pills.
abstract final class Corners {
  /// Half the base: tags, small labels, icon glyphs.
  static const double chip = 12;

  /// Nested inner rows and input fields: `16 px`.
  static const double field = 16;

  /// Website `--radius` (`1.25rem` = 20 px). Held by `palette_parity_test`.
  static const double card = 20;

  /// Editorial glass outer card radius (`24–28 px` hierarchy).
  static const double glass = 26;

  /// Large panels and bottom sheets.
  static const double panel = 28;

  /// Featured hero card radius.
  static const double hero = 32;

  /// Full pill (`999 px`) for every interactive control, chip and floating dock.
  static const double pill = 999;
}

/// Durations. Motion uses these and nothing else, so the app has one tempo.
abstract final class Motion {
  /// A control answering a touch (`140ms`, snappy press scale).
  static const Duration fast = Duration(milliseconds: 140);

  /// A small element arriving.
  static const Duration base = Duration(milliseconds: 240);

  /// A screen or a large block arriving (`expo-out` reveal).
  static const Duration slow = Duration(milliseconds: 340);

  /// The sticker pop. Long enough to read as elastic, short enough to ignore.
  static const Duration pop = Duration(milliseconds: 620);

  /// Stagger step between two siblings.
  static const Duration stagger = Duration(milliseconds: 55);
}

abstract final class Curves2 {
  /// Snappy tactile tap curve (`cubic-bezier(0.22, 1, 0.36, 1)`).
  static const Curve standard = Cubic(0.22, 1.0, 0.36, 1.0);

  /// Editorial `expo-out` reveal (`cubic-bezier(0.16, 1, 0.3, 1)`).
  static const Curve enter = Cubic(0.16, 1.0, 0.3, 1.0);

  /// The sticker only. A little overshoot is what makes it feel like paper.
  static const Curve pop = Curves.easeOutBack;

  /// Leaving. Faster than arriving so the eye is not left waiting.
  static const Curve exit = Curves.easeInCubic;
}
