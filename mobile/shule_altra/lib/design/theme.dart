/// The app's two themes, built from [ShuleTokens].
///
/// Day is the hub's cool workspace; night is the hub after dark (`globals.css`
/// `.dark`). Both are complete: a screen that only looks right in one of them is
/// a bug, and `test/contrast_test.dart` holds every text pair to its ratio.
///
/// The house style comes from the website and is applied here once, so screens do
/// not restate it: the brand ramp on every filled button, 20 px radii (the site's
/// `--radius`), a soft blue-tinted shadow instead of Material elevation, and the
/// input treatment the hub uses (filled, borderless, focus ring).
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
        // The ramp, as `.colorful-gradient` draws it on the website. A disabled
        // button loses the gradient entirely rather than showing a pale one.
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.disabled) ? tokens.border : null;
        }),
        foregroundColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.disabled) ? tokens.inkMuted : tokens.onGradient;
        }),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: -0.1),
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
        backgroundColor: WidgetStatePropertyAll(tokens.surface),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
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
      // The hub's field is a muted fill on a card, not a white box on white.
      fillColor: tokens.mutedSurface,
      hintStyle: TextStyle(color: tokens.inkMuted, fontSize: 15),
      labelStyle: TextStyle(color: tokens.inkMuted, fontSize: 14, fontWeight: FontWeight.w600),
      floatingLabelStyle: TextStyle(color: tokens.primary, fontSize: 14, fontWeight: FontWeight.w700),
      contentPadding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.lg),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide(color: tokens.primary, width: 1.8),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide(color: tokens.danger, width: 1.4),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      // The active tab sits on a 12% wash of the primary, the way the sidebar's
      // selected row does on the website.
      indicatorColor: tokens.primary.withValues(alpha: 0.12),
      elevation: 0,
      height: 68,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          color: selected ? tokens.primary : tokens.inkMuted,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: 22,
          color: selected ? tokens.primary : tokens.inkMuted,
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
    cardTheme: CardThemeData(
      color: tokens.surface,
      surfaceTintColor: Colors.transparent,
      shadowColor: tokens.shadow,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.panel)),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.panel)),
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(Corners.panel)),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: tokens.mutedSurface,
      selectedColor: tokens.primary.withValues(alpha: 0.12),
      labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: tokens.ink),
      side: BorderSide.none,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
    ),
    dividerTheme: DividerThemeData(color: tokens.border, thickness: 1, space: 1),
  );
}

/// The house shadow, used by cards and the sticky header.
///
/// Defined once because a shadow is the fastest way for an app to look
/// home-made: three different elevations in one screen read as three products.
List<BoxShadow> shuleShadow(ShuleTokens tokens, {bool raised = false}) {
  return [
    BoxShadow(
      color: tokens.shadow,
      blurRadius: raised ? 40 : 24,
      offset: Offset(0, raised ? 18 : 8),
      spreadRadius: raised ? -4 : -2,
    ),
  ];
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
