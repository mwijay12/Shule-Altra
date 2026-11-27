/// Blue Editorial Glassmorphism primitives for Shule Altra.
///
/// GPU rules followed strictly across every screen:
///  * [ShuleBackdrop] paints static ambient blue radial blooms in a
///    [RepaintBoundary] — zero BackdropFilter overhead on every frame.
///  * [ShuleGlassCard] fakes frosted glass with translucent blue-tinted
///    gradients and a 1 px crisp rim so scrolling lists stay smooth on
///    mid-range Android handsets.
///  * [ShuleGlassBlur] applies real [ui.ImageFilter.blur] **only** on the
///    floating bottom dock and modal bottom sheets, with a solid fallback when
///    high-contrast mode is active.
///  * [PressableScale] uses GPU transform only (`140ms`, `0.96`) and stops
///    immediately when reduced motion is enabled.
library;

import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'motion.dart';
import 'theme.dart' show shuleShadow;
import 'tokens.dart';

/// Atmospheric blue canvas with diffused radial sapphire & sky blooms.
///
/// Painted via [CustomPaint] inside a [RepaintBoundary] so it repaints only on
/// resize or theme change and never introduces a gradient [DecoratedBox] ahead
/// of a screen's own hero gradient.
class ShuleBackdrop extends StatelessWidget {
  const ShuleBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final highContrast = MediaQuery.highContrastOf(context);
    return Stack(
      fit: StackFit.expand,
      children: [
        RepaintBoundary(
          child: ColoredBox(
            color: tokens.canvas,
            child: highContrast
                ? const SizedBox.expand()
                : CustomPaint(
                    painter: _BlueMeshPainter(
                      dark: tokens.brightness == Brightness.dark,
                      glowSoft: tokens.glowSoft,
                      glowDeep: tokens.glowDeep,
                    ),
                  ),
          ),
        ),
        child,
      ],
    );
  }
}

class _BlueMeshPainter extends CustomPainter {
  const _BlueMeshPainter({
    required this.dark,
    required this.glowSoft,
    required this.glowDeep,
  });

  final bool dark;
  final Color glowSoft;
  final Color glowDeep;

  @override
  void paint(Canvas canvas, Size size) {
    void bloom(Offset center, double radius, Color color, double alpha) {
      if (radius <= 0) return;
      canvas.drawRect(
        Offset.zero & size,
        Paint()
          ..shader = RadialGradient(
            colors: [
              color.withValues(alpha: alpha),
              color.withValues(alpha: 0),
            ],
          ).createShader(Rect.fromCircle(center: center, radius: radius)),
      );
    }

    bloom(
      Offset(size.width * 0.88, size.height * 0.10),
      size.width * 0.78,
      glowSoft,
      dark ? 0.22 : 0.36,
    );
    bloom(
      Offset(size.width * 0.10, size.height * 0.84),
      size.width * 0.86,
      glowDeep,
      dark ? 0.16 : 0.15,
    );
    bloom(
      Offset(size.width * 0.52, size.height * 0.44),
      size.width * 0.60,
      glowSoft,
      dark ? 0.08 : 0.12,
    );
  }

  @override
  bool shouldRepaint(_BlueMeshPainter old) {
    return old.dark != dark || old.glowSoft != glowSoft || old.glowDeep != glowDeep;
  }
}

/// Tactile press scale (`140ms`, scale to `0.96`) with reduced-motion guard.
class PressableScale extends StatefulWidget {
  const PressableScale({
    super.key,
    required this.child,
    this.onTap,
    this.onLongPress,
    this.scale = 0.96,
    this.haptic = false,
  });

  final Widget child;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final double scale;
  final bool haptic;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _down = false;

  void _set(bool value) {
    if (_down == value) return;
    setState(() => _down = value);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null || widget.onLongPress != null;
    final prefs = MotionPrefs.of(context);
    final duration = prefs.fast;
    final target = (!prefs.reduced && _down) ? widget.scale : 1.0;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap == null
          ? null
          : () {
              if (widget.haptic) ShuleHaptics.selection();
              widget.onTap!();
            },
      onLongPress: widget.onLongPress,
      onTapDown: enabled ? (_) => _set(true) : null,
      onTapUp: enabled ? (_) => _set(false) : null,
      onTapCancel: enabled ? () => _set(false) : null,
      child: AnimatedScale(
        scale: target,
        duration: duration,
        curve: Curves2.standard,
        child: widget.child,
      ),
    );
  }
}

/// Best-effort touch feedback that never throws on desktop or web.
abstract final class ShuleHaptics {
  static void selection() => unawaited(_play(HapticFeedback.selectionClick));

  static void light() => unawaited(_play(HapticFeedback.lightImpact));

  static Future<void> _play(Future<void> Function() effect) async {
    if (kIsWeb ||
        (defaultTargetPlatform != TargetPlatform.android &&
            defaultTargetPlatform != TargetPlatform.iOS)) {
      return;
    }
    try {
      await effect();
    } on MissingPluginException {
      // No haptic engine on this platform.
    } on PlatformException {
      // Haptics are optional; never block user interaction.
    }
  }
}

/// Frosted translucent glass card for scrolling lists — zero backdrop-blur cost.
class ShuleGlassCard extends StatelessWidget {
  const ShuleGlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.lg + 2),
    this.radius = Corners.glass,
    this.onTap,
    this.glowCorner = false,
    this.flat = false,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;

  /// Adds a soft top-right sapphire light-leak painted via [CustomPaint].
  final bool glowCorner;
  final bool flat;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final highContrast = MediaQuery.highContrastOf(context);
    final shape = BorderRadius.circular(radius);

    final surface = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        color: highContrast ? tokens.surface : null,
        gradient: highContrast ? null : tokens.glassGradient,
        border: Border.all(
          color: highContrast ? tokens.border : tokens.glassBorder,
          width: 1.1,
        ),
        boxShadow: flat ? null : shuleShadow(tokens),
      ),
      child: ClipRRect(
        borderRadius: shape,
        child: Stack(
          children: [
            if (glowCorner && !highContrast)
              Positioned.fill(
                child: IgnorePointer(
                  child: CustomPaint(
                    painter: _CornerGlowPainter(
                      color: tokens.glowSoft,
                      dark: tokens.brightness == Brightness.dark,
                    ),
                  ),
                ),
              ),
            Material(
              color: Colors.transparent,
              child: Padding(padding: padding, child: child),
            ),
          ],
        ),
      ),
    );

    if (onTap == null) return surface;
    return Semantics(
      button: true,
      child: PressableScale(
        onTap: onTap,
        scale: 0.98,
        haptic: true,
        child: surface,
      ),
    );
  }
}

class _CornerGlowPainter extends CustomPainter {
  const _CornerGlowPainter({required this.color, required this.dark});

  final Color color;
  final bool dark;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.94, size.height * 0.06);
    final radius = (size.width * 0.55).clamp(110.0, 220.0);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          colors: [
            color.withValues(alpha: dark ? 0.22 : 0.34),
            color.withValues(alpha: 0),
          ],
        ).createShader(Rect.fromCircle(center: center, radius: radius)),
    );
  }

  @override
  bool shouldRepaint(_CornerGlowPainter old) => old.color != color || old.dark != dark;
}

/// Real backdrop-blurred glass surface.
///
/// Strictly reserved for the floating dock and modal bottom sheets — never used
/// inside scrolling list items. Falls back to solid surface in high contrast.
class ShuleGlassBlur extends StatelessWidget {
  const ShuleGlassBlur({
    super.key,
    required this.child,
    this.radius = Corners.panel,
    this.padding = const EdgeInsets.all(6),
    this.sigma = 20,
    this.shadow = true,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final double sigma;
  final bool shadow;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final dark = tokens.brightness == Brightness.dark;
    final solid = MediaQuery.highContrastOf(context);
    final shape = BorderRadius.circular(radius);

    final inner = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        color: solid
            ? tokens.surface
            : (dark
                ? tokens.surface.withValues(alpha: 0.80)
                : tokens.surface.withValues(alpha: 0.78)),
        border: Border.all(
          color: solid ? tokens.border : tokens.glassBorder,
          width: 1.2,
        ),
      ),
      child: Padding(padding: padding, child: child),
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: shape,
        boxShadow: shadow
            ? [
                BoxShadow(
                  color: dark
                      ? const Color(0x66000000)
                      : tokens.primary.withValues(alpha: 0.16),
                  blurRadius: 28,
                  offset: const Offset(0, 12),
                ),
                BoxShadow(
                  color: dark
                      ? const Color(0x33000000)
                      : const Color(0x0D131820),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: ClipRRect(
        borderRadius: shape,
        child: solid
            ? inner
            : BackdropFilter(
                filter: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
                child: inner,
              ),
      ),
    );
  }
}

/// Nested inner row (`16 px` radius) sitting inside a [ShuleGlassCard] to give
/// editorial Z-depth between outer frosted cards and inner data blocks.
class ShuleInnerTile extends StatelessWidget {
  const ShuleInnerTile({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.md + 2),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final shape = BorderRadius.circular(Corners.field);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: tokens.innerSurface,
        borderRadius: shape,
        border: Border.all(color: tokens.border.withValues(alpha: 0.85)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: shape,
        child: onTap == null
            ? Padding(padding: padding, child: child)
            : InkWell(
                borderRadius: shape,
                onTap: onTap,
                child: Padding(padding: padding, child: child),
              ),
      ),
    );
  }
}

/// Full-pill editorial badge for status tags, eyebrows and metadata.
class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    this.icon,
    this.background,
    this.foreground,
    this.uppercase = false,
  });

  final String label;
  final IconData? icon;
  final Color? background;
  final Color? foreground;
  final bool uppercase;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final bg = background ?? tokens.blueWash;
    final fg = foreground ?? tokens.blueInk;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(Corners.pill),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              ExcludeSemantics(child: Icon(icon, size: 13.5, color: fg)),
              const SizedBox(width: 5),
            ],
            Flexible(
              child: Text(
                uppercase ? label.toUpperCase() : label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: uppercase ? 10 : 11.5,
                  fontWeight: FontWeight.w800,
                  letterSpacing: uppercase ? 0.9 : 0.0,
                  color: fg,
                  height: 1.15,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Soft blue-washed rounded-square icon badge (inspired by StudyDesk & Noellyne).
class ShuleGlyph extends StatelessWidget {
  const ShuleGlyph({
    super.key,
    required this.icon,
    this.size = 40,
    this.background,
    this.foreground,
  });

  final IconData icon;
  final double size;
  final Color? background;
  final Color? foreground;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: background ?? tokens.blueWash,
          borderRadius: BorderRadius.circular(Corners.chip + 2),
        ),
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: size * 0.52,
          color: foreground ?? tokens.blueInk,
        ),
      ),
    );
  }
}
