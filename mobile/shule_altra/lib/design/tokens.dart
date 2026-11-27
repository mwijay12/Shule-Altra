/// Blue-only visual identity tokens for Shule Altra mobile.
///
/// Design rules (anti-AI-slop, cobalt/azure brand system):
///  * One brand hue: Cobalt (`#1D4ED8`) & Azure (`#2563EB` / `#3B82F6`).
///  * ZERO purple/violet/magenta hues anywhere in Light or Dark themes.
///  * Neutrals: deep navy slate (`#0F172A` / `#0B1120`) and crisp slate
///    (`#F8FAFC` / `#F1F5F9`) — never pure black (`#000000`).
///  * Semantic discipline: amber only for warnings, green only for success,
///    red only for destructive/error states.
///  * Every foreground/background text pair passes WCAG 2.1 AA (>= 4.5:1).
library;

import 'package:flutter/material.dart';

/// Strict 4/8px spacing rhythm (`mobile-visual-design`).
abstract final class Space {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  /// Bottom clearance so scrollable content clears the floating bottom dock.
  static const double dockClearance = 108;
}

/// Intentional radius hierarchy — a chip, a card, and a hero panel are distinct.
abstract final class Corners {
  static const double chip = 10;
  static const double field = 12;
  static const double button = 14;
  static const double card = 16;
  static const double glass = 20;
  static const double hero = 24;
  static const double dock = 28;
  static const double pill = 999;
}

/// WCAG 2.1 AA floors, enforced by `test/contrast_test.dart`.
const double kBodyContrast = 4.5;
const double kLargeContrast = 3.0;
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
    required this.shadow,
  });

  final Brightness brightness;
  final Color canvas;
  final Color surface;
  final Color mutedSurface;
  final Color ink;
  final Color inkMuted;
  final Color brandSurface;
  final Color onBrand;
  final Color primary;
  final Color onPrimary;
  final Color accent;
  final Color onAccent;
  final Color border;
  final Color danger;
  final Color success;
  final Color warning;
  final Color gradientStart;
  final Color gradientEnd;
  final Color onGradient;

  /// Soft azure ambient highlight (`#DBEAFE` day, `#1E3A8A` night).
  final Color glowSoft;

  /// Rich cobalt highlight (`#3B82F6` day, `#60A5FA` night).
  final Color glowDeep;

  /// Soft cobalt/ice badge & icon well fill (`#EFF6FF` day, `#172554` night).
  final Color blueWash;

  /// High-contrast cobalt ink on `blueWash` & cards (`#1E40AF` day, `#93C5FD` night).
  final Color blueInk;

  /// Surface card gradient start & end (subtle tonal crispness).
  final Color glassStart;
  final Color glassEnd;

  /// Crisp hairline border for cards & panels.
  final Color glassBorder;

  /// Nested tile / input well surface.
  final Color innerSurface;

  /// Same-hue cobalt tonal hero gradient stops (~10% lightness shift, zero purple).
  final Color blueHeroStart;
  final Color blueHeroEnd;

  /// Subtle cool navy elevation shadow.
  final Color shadow;

  /// Same-hue tonal cobalt gradient (<=10% lightness shift, zero hue shift).
  LinearGradient get brandGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [gradientStart, gradientEnd],
      );

  /// Deep cobalt hero gradient for primary identity headers & shields.
  LinearGradient get blueHeroGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [blueHeroStart, blueHeroEnd],
      );

  /// Clean surface gradient for elevated cards.
  LinearGradient get glassGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [glassStart, glassEnd],
      );

  /// Light palette — crisp slate canvas, pure white cards, cobalt brand primary.
  static const ShuleTokens day = ShuleTokens(
    brightness: Brightness.light,
    canvas: Color(0xFFF8FAFC), // Slate 50
    surface: Color(0xFFFFFFFF), // Pure white card
    mutedSurface: Color(0xFFF1F5F9), // Slate 100
    ink: Color(0xFF0F172A), // Deep navy Slate 900 (17.06:1 on canvas)
    inkMuted: Color(0xFF475569), // Slate 600 (7.24:1 on canvas)
    brandSurface: Color(0xFF1D4ED8), // Brand Cobalt 700
    onBrand: Color(0xFFFFFFFF),
    primary: Color(0xFF1D4ED8), // Cobalt 700 (6.70:1 with white)
    onPrimary: Color(0xFFFFFFFF),
    accent: Color(0xFF2563EB), // Cobalt 600 (5.17:1 with white, same-hue tonal step)
    onAccent: Color(0xFFFFFFFF),
    border: Color(0xFFE2E8F0), // Slate 200 hairline
    danger: Color(0xFFB91C1C), // Red 700 (6.18:1 on canvas)
    success: Color(0xFF15803D), // Green 700 (5.02:1 on white)
    warning: Color(0xFF92400E), // Amber 800 (7.09:1 on white)
    gradientStart: Color(0xFF1D4ED8), // Cobalt 700
    gradientEnd: Color(0xFF2563EB), // Cobalt 600 (~8% tonal shift, zero purple)
    onGradient: Color(0xFFFFFFFF),
    glowSoft: Color(0xFFDBEAFE), // Blue 100
    glowDeep: Color(0xFF3B82F6), // Azure 500 (illustrations & non-text accents)
    blueWash: Color(0xFFEFF6FF), // Blue 50
    blueInk: Color(0xFF1E40AF), // Blue 800 (8.01:1 on blueWash)
    glassStart: Color(0xFFFFFFFF),
    glassEnd: Color(0xFFF8FBFF),
    glassBorder: Color(0xFFCBD5E1), // Slate 300 crisp card border
    innerSurface: Color(0xFFEFF6FF), // Blue 50 inner well
    blueHeroStart: Color(0xFF1E3A8A), // Deep Cobalt 900 (10.36:1 with white)
    blueHeroEnd: Color(0xFF1D4ED8), // Cobalt 700 (6.70:1 with white)
    shadow: Color(0x140F172A),
  );

  /// Dark palette — deep navy slate surfaces (never pure black), crisp azure actions.
  static const ShuleTokens night = ShuleTokens(
    brightness: Brightness.dark,
    canvas: Color(0xFF0B1120), // Deep Navy Slate (never #000000)
    surface: Color(0xFF111827), // Slate 900
    mutedSurface: Color(0xFF1E293B), // Slate 800
    ink: Color(0xFFF8FAFC), // Slate 50 (18.00:1 on canvas)
    inkMuted: Color(0xFF94A3B8), // Slate 400 (7.34:1 on canvas)
    brandSurface: Color(0xFF111827),
    onBrand: Color(0xFFF8FAFC),
    primary: Color(0xFF60A5FA), // Azure 400 (7.41:1 with #0B1120)
    onPrimary: Color(0xFF0B1120),
    accent: Color(0xFF93C5FD), // Azure 300 (10.44:1 with #0B1120)
    onAccent: Color(0xFF0B1120),
    border: Color(0xFF1E293B), // Slate 800 hairline
    danger: Color(0xFFF87171), // Red 400 (5.29:1 on mutedSurface)
    success: Color(0xFF4ADE80), // Green 400 (10.18:1 on surface)
    warning: Color(0xFFFBBF24), // Amber 400 (10.63:1 on surface)
    gradientStart: Color(0xFF3B82F6), // Azure 500 (5.12:1 with #0B1120)
    gradientEnd: Color(0xFF60A5FA), // Azure 400 (7.41:1 with #0B1120)
    onGradient: Color(0xFF0B1120),
    glowSoft: Color(0xFF1E3A8A),
    glowDeep: Color(0xFF3B82F6),
    blueWash: Color(0xFF172554), // Blue 950
    blueInk: Color(0xFF93C5FD), // Azure 300 (8.15:1 on blueWash)
    glassStart: Color(0xFF111827),
    glassEnd: Color(0xFF162033),
    glassBorder: Color(0xFF26354D),
    innerSurface: Color(0xFF172554),
    blueHeroStart: Color(0xFF3B82F6),
    blueHeroEnd: Color(0xFF60A5FA),
    shadow: Color(0x4D020617),
  );

  static ShuleTokens of(BuildContext context) {
    final ext = Theme.of(context).extension<ShuleTokens>();
    assert(ext != null, 'ShuleTokens missing from ThemeData. Use buildTheme().');
    return ext ?? day;
  }

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
      shadow: shadow ?? this.shadow,
    );
  }

  @override
  ShuleTokens lerp(ThemeExtension<ShuleTokens>? other, double t) {
    if (other is! ShuleTokens) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t) ?? a;
    return ShuleTokens(
      brightness: t < 0.5 ? brightness : other.brightness,
      canvas: mix(canvas, other.canvas),
      surface: mix(surface, other.surface),
      mutedSurface: mix(mutedSurface, other.mutedSurface),
      ink: mix(ink, other.ink),
      inkMuted: mix(inkMuted, other.inkMuted),
      brandSurface: mix(brandSurface, other.brandSurface),
      onBrand: mix(onBrand, other.onBrand),
      primary: mix(primary, other.primary),
      onPrimary: mix(onPrimary, other.onPrimary),
      accent: mix(accent, other.accent),
      onAccent: mix(onAccent, other.onAccent),
      border: mix(border, other.border),
      danger: mix(danger, other.danger),
      success: mix(success, other.success),
      warning: mix(warning, other.warning),
      gradientStart: mix(gradientStart, other.gradientStart),
      gradientEnd: mix(gradientEnd, other.gradientEnd),
      onGradient: mix(onGradient, other.onGradient),
      glowSoft: mix(glowSoft, other.glowSoft),
      glowDeep: mix(glowDeep, other.glowDeep),
      blueWash: mix(blueWash, other.blueWash),
      blueInk: mix(blueInk, other.blueInk),
      glassStart: mix(glassStart, other.glassStart),
      glassEnd: mix(glassEnd, other.glassEnd),
      glassBorder: mix(glassBorder, other.glassBorder),
      innerSurface: mix(innerSurface, other.innerSurface),
      blueHeroStart: mix(blueHeroStart, other.blueHeroStart),
      blueHeroEnd: mix(blueHeroEnd, other.blueHeroEnd),
      shadow: mix(shadow, other.shadow),
    );
  }
}
