/// The app's two themes, built from [ShuleTokens].
///
/// Day is paper and deep green; night is the same green after dark, not a
/// different product. Both are complete: a screen that only looks right in one
/// of them is a bug, and `test/contrast_test.dart` holds every text pair to its
/// ratio.
library;

import 'package:flutter/material.dart';

import 'tokens.dart';

ThemeData buildTheme(Brightness brightness) {
  final tokens = brightness == Brightness.dark ? ShuleTokens.night : ShuleTokens.day;
  final base = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    fontFamily: null, // system face for now; a bundled face is a separate decision
    splashFactory: InkSparkle.splashFactory,
  );

  final scheme = ColorScheme.fromSeed(
    seedColor: tokens.primary,
    brightness: brightness,
  ).copyWith(
    primary: tokens.primary,
    onPrimary: tokens.onPrimary,
    secondary: tokens.accent,
    onSecondary: tokens.onAccent,
    surface: tokens.surface,
    onSurface: tokens.ink,
    error: tokens.danger,
    outline: tokens.border,
  );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: tokens.canvas,
    canvasColor: tokens.canvas,
    dividerColor: tokens.border,
    extensions: <ThemeExtension<dynamic>>[tokens],
    textTheme: _textTheme(tokens),
    appBarTheme: AppBarTheme(
      backgroundColor: tokens.canvas,
      surfaceTintColor: Colors.transparent,
      foregroundColor: tokens.ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: tokens.ink,
        fontSize: 17,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(0, 54)),
        padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: Space.xl)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.card)),
        ),
        backgroundColor: WidgetStatePropertyAll(tokens.primary),
        foregroundColor: WidgetStatePropertyAll(tokens.onPrimary),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(0, 54)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.card)),
        ),
        side: WidgetStatePropertyAll(BorderSide(color: tokens.border)),
        foregroundColor: WidgetStatePropertyAll(tokens.primary),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: ButtonStyle(
        foregroundColor: WidgetStatePropertyAll(tokens.primary),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: tokens.surface,
      hintStyle: TextStyle(color: tokens.inkMuted, fontSize: 15),
      contentPadding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.lg),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.card),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.card),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.card),
        borderSide: BorderSide(color: tokens.primary, width: 1.6),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: tokens.accent,
      elevation: 0,
      height: 68,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          color: selected ? tokens.onAccent : tokens.inkMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? tokens.onAccent : tokens.inkMuted,
        );
      }),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: tokens.ink,
      contentTextStyle: TextStyle(color: tokens.canvas, fontSize: 14, height: 1.4),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.card)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: tokens.primary),
  );
}

TextTheme _textTheme(ShuleTokens tokens) {
  TextStyle style(double size, FontWeight weight, {double height = 1.35, double letterSpacing = 0, Color? color}) {
    return TextStyle(
      fontSize: size,
      fontWeight: weight,
      height: height,
      letterSpacing: letterSpacing,
      color: color ?? tokens.ink,
    );
  }

  return TextTheme(
    displaySmall: style(32, FontWeight.w800, height: 1.08, letterSpacing: -1.1),
    headlineMedium: style(26, FontWeight.w800, height: 1.12, letterSpacing: -0.8),
    headlineSmall: style(21, FontWeight.w700, height: 1.2, letterSpacing: -0.4),
    titleMedium: style(16, FontWeight.w700, height: 1.3),
    bodyLarge: style(15, FontWeight.w500, height: 1.5),
    bodyMedium: style(14, FontWeight.w500, height: 1.5, color: tokens.ink),
    bodySmall: style(12, FontWeight.w500, height: 1.45, color: tokens.inkMuted),
    labelLarge: style(13, FontWeight.w700, height: 1.2, letterSpacing: 0.2),
    labelSmall: style(10, FontWeight.w800, height: 1.2, letterSpacing: 1.3, color: tokens.inkMuted),
  );
}
