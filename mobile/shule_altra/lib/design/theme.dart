/// Material 3 ThemeData built strictly from `ShuleTokens` (Cobalt/Azure only)
/// with the bundled offline Display + Body font pairing:
///  * Display & Headlines: `Outfit` (tight geometric tracking)
///  * Body, UI Labels & Tabular TZS Numbers: `PlusJakartaSans`
library;

import 'package:flutter/material.dart';

import 'tokens.dart';

const String kDisplayFont = 'Outfit';
const String kBodyFont = 'PlusJakartaSans';

/// Subtle, disciplined elevation shadows (cool deep-navy shadow, zero heavy glow).
List<BoxShadow> shuleShadow(ShuleTokens tokens, {bool raised = false}) {
  if (tokens.brightness == Brightness.dark) {
    return [
      BoxShadow(
        color: tokens.shadow,
        blurRadius: raised ? 20 : 12,
        offset: Offset(0, raised ? 8 : 4),
      ),
    ];
  }
  return [
    BoxShadow(
      color: tokens.shadow,
      blurRadius: raised ? 20 : 10,
      offset: Offset(0, raised ? 8 : 3),
    ),
  ];
}

ThemeData buildTheme(Brightness brightness) {
  final tokens = brightness == Brightness.dark ? ShuleTokens.night : ShuleTokens.day;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: tokens.primary,
    onPrimary: tokens.onPrimary,
    secondary: tokens.accent,
    onSecondary: tokens.onAccent,
    error: tokens.danger,
    onError: tokens.onPrimary,
    surface: tokens.surface,
    onSurface: tokens.ink,
    surfaceContainerLowest: tokens.canvas,
    surfaceContainerLow: tokens.surface,
    surfaceContainer: tokens.mutedSurface,
    surfaceContainerHigh: tokens.innerSurface,
    surfaceContainerHighest: tokens.mutedSurface,
    onSurfaceVariant: tokens.inkMuted,
    outline: tokens.border,
    outlineVariant: tokens.border,
    primaryContainer: tokens.blueWash,
    onPrimaryContainer: tokens.blueInk,
    secondaryContainer: tokens.blueWash,
    onSecondaryContainer: tokens.blueInk,
  );

  final text = TextTheme(
    displayLarge: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 34,
      height: 1.08,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.9,
      color: tokens.ink,
    ),
    displayMedium: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 28,
      height: 1.14,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.6,
      color: tokens.ink,
    ),
    headlineLarge: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 24,
      height: 1.18,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.45,
      color: tokens.ink,
    ),
    headlineMedium: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 22,
      height: 1.2,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.35,
      color: tokens.ink,
    ),
    headlineSmall: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 20,
      height: 1.22,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
      color: tokens.ink,
    ),
    titleLarge: TextStyle(
      fontFamily: kDisplayFont,
      fontSize: 18,
      height: 1.26,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
      color: tokens.ink,
    ),
    titleMedium: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 16,
      height: 1.32,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.1,
      color: tokens.ink,
    ),
    titleSmall: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 14,
      height: 1.35,
      fontWeight: FontWeight.w700,
      color: tokens.ink,
    ),
    bodyLarge: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 16,
      height: 1.5,
      fontWeight: FontWeight.w400,
      color: tokens.ink,
    ),
    bodyMedium: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 15,
      height: 1.48,
      fontWeight: FontWeight.w400,
      color: tokens.ink,
    ),
    bodySmall: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 13.5,
      height: 1.42,
      fontWeight: FontWeight.w400,
      color: tokens.inkMuted,
    ),
    labelLarge: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 15,
      height: 1.2,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.05,
      color: tokens.ink,
    ),
    labelMedium: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 12.5,
      height: 1.25,
      fontWeight: FontWeight.w600,
      color: tokens.inkMuted,
    ),
    labelSmall: TextStyle(
      fontFamily: kBodyFont,
      fontSize: 11,
      height: 1.3,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.75,
      color: tokens.inkMuted,
    ),
  );

  final fieldRadius = BorderRadius.circular(Corners.field);
  OutlineInputBorder fieldBorder(Color colour, [double width = 1.2]) =>
      OutlineInputBorder(
        borderRadius: fieldRadius,
        borderSide: BorderSide(color: colour, width: width),
      );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    fontFamily: kBodyFont,
    scaffoldBackgroundColor: tokens.canvas,
    canvasColor: tokens.canvas,
    textTheme: text,
    dividerColor: tokens.border,
    dividerTheme: DividerThemeData(color: tokens.border, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: tokens.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: text.titleLarge,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 68,
      indicatorColor: tokens.blueWash,
      indicatorShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Corners.pill),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: kBodyFont,
          fontSize: 12,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? tokens.blueInk : tokens.inkMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? tokens.blueInk : tokens.inkMuted,
        );
      }),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: tokens.ink,
      contentTextStyle: TextStyle(
        fontFamily: kBodyFont,
        color: tokens.canvas,
        fontSize: 14,
        height: 1.4,
      ),
      behavior: SnackBarBehavior.floating,
      insetPadding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.button)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: tokens.primary),
    cardTheme: CardThemeData(
      color: tokens.surface,
      surfaceTintColor: Colors.transparent,
      shadowColor: tokens.shadow,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Corners.card),
        side: BorderSide(color: tokens.border),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        fontFamily: kDisplayFont,
        fontSize: 19,
        fontWeight: FontWeight.w700,
        color: tokens.ink,
      ),
      contentTextStyle: TextStyle(
        fontFamily: kBodyFont,
        fontSize: 14.5,
        color: tokens.inkMuted,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Corners.hero),
        side: BorderSide(color: tokens.border),
      ),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Corners.hero)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: tokens.primary,
        foregroundColor: tokens.onPrimary,
        disabledBackgroundColor: tokens.mutedSurface,
        disabledForegroundColor: tokens.inkMuted,
        minimumSize: const Size(kMinTapTarget, 52),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.button)),
        textStyle: const TextStyle(
          fontFamily: kBodyFont,
          fontSize: 15.5,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.1,
        ),
        elevation: 0,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: tokens.blueInk,
        backgroundColor: tokens.surface,
        side: BorderSide(color: tokens.glassBorder, width: 1.25),
        minimumSize: const Size(kMinTapTarget, 50),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.button)),
        textStyle: const TextStyle(
          fontFamily: kBodyFont,
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: tokens.blueInk,
        minimumSize: const Size(kMinTapTarget, kMinTapTarget),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.button)),
        textStyle: const TextStyle(
          fontFamily: kBodyFont,
          fontSize: 14.5,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: tokens.surface,
      selectedColor: tokens.primary,
      secondarySelectedColor: tokens.primary,
      disabledColor: tokens.mutedSurface,
      checkmarkColor: tokens.onPrimary,
      labelStyle: WidgetStateTextStyle.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: kBodyFont,
          fontSize: 13.5,
          fontWeight: FontWeight.w700,
          color: selected ? tokens.onPrimary : tokens.ink,
        );
      }),
      side: BorderSide(color: tokens.glassBorder),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.chip)),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: tokens.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
      border: fieldBorder(tokens.glassBorder),
      enabledBorder: fieldBorder(tokens.glassBorder),
      focusedBorder: fieldBorder(tokens.primary, 1.8),
      errorBorder: fieldBorder(tokens.danger, 1.4),
      focusedErrorBorder: fieldBorder(tokens.danger, 1.8),
      labelStyle: TextStyle(color: tokens.inkMuted, fontWeight: FontWeight.w600),
      hintStyle: TextStyle(color: tokens.inkMuted),
    ),
    extensions: [tokens],
  );
}
