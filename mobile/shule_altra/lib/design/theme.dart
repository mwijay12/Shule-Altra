/// The app's two themes, built from [ShuleTokens].
///
/// Day is crisp cool alabaster with sky-blue ambient light and frosted glass
/// cards; night is deep midnight navy with sapphire glow and dark frosted glass.
/// Both follow the website's blue identity and pass every contrast ratio in
/// `test/contrast_test.dart`.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'tokens.dart';

ThemeData buildTheme(Brightness brightness) {
  final tokens = brightness == Brightness.dark ? ShuleTokens.night : ShuleTokens.day;
  final dark = brightness == Brightness.dark;
  final base = ThemeData(
    useMaterial3: true,
    brightness: brightness,
    fontFamily: 'PlusJakartaSans',
    fontFamilyFallback: const ['Inter', 'Roboto'],
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
    onSurfaceVariant: tokens.inkMuted,
    error: tokens.danger,
    outline: tokens.border,
    outlineVariant: tokens.border,
  );

  final overlay = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: dark ? Brightness.light : Brightness.dark,
    statusBarBrightness: dark ? Brightness.dark : Brightness.light,
    systemNavigationBarColor: Colors.transparent,
    systemNavigationBarIconBrightness: dark ? Brightness.light : Brightness.dark,
    systemNavigationBarContrastEnforced: false,
  );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: tokens.canvas,
    canvasColor: tokens.canvas,
    dividerColor: tokens.border,
    shadowColor: tokens.shadow,
    extensions: <ThemeExtension<dynamic>>[tokens],
    textTheme: _textTheme(tokens),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      surfaceTintColor: Colors.transparent,
      foregroundColor: tokens.ink,
      systemOverlayStyle: overlay,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontFamily: 'PlusJakartaSans',
        color: tokens.ink,
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.4,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(0, 52)),
        padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: Space.xl)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
        ),
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.disabled) ? tokens.border : tokens.primary;
        }),
        foregroundColor: WidgetStateProperty.resolveWith((states) {
          return states.contains(WidgetState.disabled) ? tokens.inkMuted : tokens.onPrimary;
        }),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.1,
          ),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(0, 50)),
        padding: const WidgetStatePropertyAll(EdgeInsets.symmetric(horizontal: Space.lg)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
        ),
        side: WidgetStatePropertyAll(
          BorderSide(
            color: dark ? tokens.border : tokens.primary.withValues(alpha: 0.30),
            width: 1.2,
          ),
        ),
        foregroundColor: WidgetStatePropertyAll(tokens.blueInk),
        backgroundColor: WidgetStatePropertyAll(tokens.innerSurface),
        iconColor: WidgetStatePropertyAll(tokens.blueInk),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 14,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.1,
          ),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: ButtonStyle(
        minimumSize: const WidgetStatePropertyAll(Size(kMinTapTarget, kMinTapTarget)),
        shape: WidgetStatePropertyAll(
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
        ),
        foregroundColor: WidgetStatePropertyAll(tokens.blueInk),
        textStyle: const WidgetStatePropertyAll(
          TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(
        minimumSize: const Size(44, 44),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: tokens.innerSurface,
      hintStyle: TextStyle(color: tokens.inkMuted, fontSize: 14.5),
      labelStyle: TextStyle(color: tokens.inkMuted, fontSize: 13.5, fontWeight: FontWeight.w600),
      floatingLabelStyle: TextStyle(color: tokens.blueInk, fontSize: 13.5, fontWeight: FontWeight.w700),
      contentPadding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.lg),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide(color: tokens.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Corners.field),
        borderSide: BorderSide(color: tokens.border),
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
      indicatorColor: tokens.blueWash,
      elevation: 0,
      height: 68,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
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
      contentTextStyle: TextStyle(color: tokens.canvas, fontSize: 14, height: 1.4),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: tokens.primary),
    cardTheme: CardThemeData(
      color: tokens.glassStart,
      surfaceTintColor: Colors.transparent,
      shadowColor: tokens.shadow,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Corners.glass),
        side: BorderSide(color: tokens.glassBorder),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: tokens.surface,
      surfaceTintColor: Colors.transparent,
      titleTextStyle: TextStyle(
        fontFamily: 'PlusJakartaSans',
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: tokens.ink,
      ),
      contentTextStyle: TextStyle(
        fontFamily: 'PlusJakartaSans',
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: tokens.ink,
      ),
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
      backgroundColor: tokens.blueWash,
      selectedColor: tokens.primary,
      checkmarkColor: tokens.onPrimary,
      iconTheme: IconThemeData(color: tokens.blueInk, size: 16),
      labelStyle: WidgetStateTextStyle.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 12.5,
          fontWeight: FontWeight.w700,
          color: selected ? tokens.onPrimary : tokens.blueInk,
        );
      }),
      secondaryLabelStyle: TextStyle(
        fontFamily: 'PlusJakartaSans',
        fontSize: 12.5,
        fontWeight: FontWeight.w700,
        color: tokens.onPrimary,
      ),
      side: BorderSide(color: tokens.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(Corners.pill)),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        return states.contains(WidgetState.selected) ? tokens.onPrimary : tokens.surface;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        return states.contains(WidgetState.selected) ? tokens.primary : tokens.mutedSurface;
      }),
      trackOutlineColor: WidgetStatePropertyAll(tokens.border),
    ),
    dividerTheme: DividerThemeData(color: tokens.border, thickness: 1, space: 1),
  );
}

/// Soft blue-tinted editorial elevation shadow.
List<BoxShadow> shuleShadow(ShuleTokens tokens, {bool raised = false}) {
  return [
    BoxShadow(
      color: tokens.shadow,
      blurRadius: raised ? 36 : 24,
      offset: Offset(0, raised ? 14 : 8),
      spreadRadius: raised ? -4 : -2,
    ),
    BoxShadow(
      color: tokens.brightness == Brightness.dark
          ? const Color(0x33000000)
          : const Color(0x0A131820),
      blurRadius: 8,
      offset: const Offset(0, 2),
    ),
  ];
}

TextTheme _textTheme(ShuleTokens tokens) {
  TextStyle style(
    double size,
    FontWeight weight, {
    double height = 1.35,
    double letterSpacing = 0,
    Color? color,
  }) {
    return TextStyle(
      fontFamily: 'PlusJakartaSans',
      fontSize: size,
      fontWeight: weight,
      height: height,
      letterSpacing: letterSpacing,
      color: color ?? tokens.ink,
    );
  }

  return TextTheme(
    displaySmall: style(31, FontWeight.w800, height: 1.08, letterSpacing: -0.9),
    headlineMedium: style(25, FontWeight.w800, height: 1.12, letterSpacing: -0.65),
    headlineSmall: style(20, FontWeight.w800, height: 1.2, letterSpacing: -0.4),
    titleLarge: style(18, FontWeight.w800, height: 1.25, letterSpacing: -0.3),
    titleMedium: style(15.5, FontWeight.w700, height: 1.3, letterSpacing: -0.15),
    bodyLarge: style(15, FontWeight.w500, height: 1.48),
    bodyMedium: style(14, FontWeight.w500, height: 1.48, color: tokens.ink),
    bodySmall: style(12.5, FontWeight.w500, height: 1.42, color: tokens.inkMuted),
    labelLarge: style(13, FontWeight.w700, height: 1.2, letterSpacing: 0.1),
    labelSmall: style(10.5, FontWeight.w800, height: 1.2, letterSpacing: 1.1, color: tokens.inkMuted),
  );
}
