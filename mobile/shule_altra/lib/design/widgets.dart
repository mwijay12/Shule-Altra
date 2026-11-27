/// The small parts every screen is built from.
///
/// Nothing here knows about data. Each one reads its colours from
/// [ShuleTokens] and its durations from [MotionPrefs], so it looks right in both
/// themes and stops moving when the OS asks it to.
library;

import 'package:flutter/material.dart';

import 'doodles.dart';
import 'glass.dart';
import 'motion.dart';
import 'theme.dart' show shuleShadow;
import 'tokens.dart';

/// The app's main call to action: full-pill button carrying the brand ramp.
///
/// Keeps every ergonomics promise: 54 logical pixels tall, full-pill geometry,
/// [Semantics] button role, tactile press feedback and a flat disabled state
/// that never looks active.
class GradientButton extends StatelessWidget {
  const GradientButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    this.expand = true,
  });

  final String label;

  /// Null disables the button.
  final VoidCallback? onPressed;

  final IconData? icon;

  /// Shows a spinner in place of the icon and refuses taps.
  final bool busy;

  /// Full width by default: every primary action in this app is a full-width bar.
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final enabled = onPressed != null && !busy;
    final radius = BorderRadius.circular(Corners.pill);

    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (busy) ...[
          SizedBox.square(
            dimension: 18,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              valueColor: AlwaysStoppedAnimation<Color>(tokens.onGradient),
            ),
          ),
          const SizedBox(width: Space.sm),
        ] else if (icon != null) ...[
          Icon(
            icon,
            size: 19,
            color: enabled ? tokens.onGradient : tokens.inkMuted,
          ),
          const SizedBox(width: Space.sm),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              color: enabled ? tokens.onGradient : tokens.inkMuted,
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.1,
            ),
          ),
        ),
      ],
    );

    final button = Opacity(
      opacity: enabled ? 1 : 0.9,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: enabled ? tokens.brandGradient : null,
          color: enabled ? null : tokens.mutedSurface,
          borderRadius: radius,
          border: enabled ? null : Border.all(color: tokens.border),
          boxShadow: enabled ? shuleShadow(tokens) : null,
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: radius,
          child: InkWell(
            borderRadius: radius,
            onTap: enabled ? onPressed : null,
            child: Container(
              height: 54,
              constraints: const BoxConstraints(minWidth: kMinTapTarget),
              padding: const EdgeInsets.symmetric(horizontal: Space.xl),
              alignment: Alignment.center,
              child: content,
            ),
          ),
        ),
      ),
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      child: button,
    );
  }
}

/// Official Shule Altra blue shield-with-checkmark app icon.
///
/// Renders the bundled `assets/images/shule_icon.png` (matching the website's
/// `src/app/icon2.png` and the Android launcher icon) with a crisp vector
/// shield fallback so it looks identical everywhere, including in tests.
class ShuleLogoMark extends StatelessWidget {
  const ShuleLogoMark({super.key, this.size = 40, this.radius});

  final double size;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final corner = radius ?? (size * 0.28).clamp(10.0, 26.0);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(corner),
        boxShadow: [
          BoxShadow(
            color: tokens.primary.withValues(alpha: 0.30),
            blurRadius: size * 0.36,
            offset: Offset(0, size * 0.14),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(corner),
        child: Image.asset(
          'assets/images/shule_icon.png',
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => CustomPaint(
            size: Size.square(size),
            painter: const _ShuleShieldFallbackPainter(),
          ),
        ),
      ),
    );
  }
}

class _ShuleShieldFallbackPainter extends CustomPainter {
  const _ShuleShieldFallbackPainter();

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    canvas.drawRect(
      rect,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1256C4), Color(0xFF0B87C1)],
        ).createShader(rect),
    );
    final w = size.width;
    final h = size.height;
    final shield = Path()
      ..moveTo(w * 0.50, h * 0.16)
      ..lineTo(w * 0.78, h * 0.27)
      ..lineTo(w * 0.78, h * 0.52)
      ..cubicTo(w * 0.78, h * 0.69, w * 0.65, h * 0.80, w * 0.50, h * 0.85)
      ..cubicTo(w * 0.35, h * 0.80, w * 0.22, h * 0.69, w * 0.22, h * 0.52)
      ..lineTo(w * 0.22, h * 0.27)
      ..close();
    canvas.drawPath(
      shield,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = (w * 0.065).clamp(2.0, 6.0)
        ..strokeJoin = StrokeJoin.round,
    );
    final check = Path()
      ..moveTo(w * 0.36, h * 0.51)
      ..lineTo(w * 0.46, h * 0.62)
      ..lineTo(w * 0.65, h * 0.41);
    canvas.drawPath(
      check,
      Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = (w * 0.075).clamp(2.2, 6.5)
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Editorial app header: official Shule Altra icon, wordmark, and status pill.
class BrandBar extends StatelessWidget {
  const BrandBar({super.key, this.trailing, this.subtitle});

  final Widget? trailing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Row(
      children: [
        const ExcludeSemantics(
          child: ShuleLogoMark(size: 40),
        ),
        const SizedBox(width: Space.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Shule Altra',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      letterSpacing: -0.4,
                      fontWeight: FontWeight.w800,
                      height: 1.12,
                    ),
              ),
              Text(
                subtitle ?? 'ELIMU KWANZA',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      fontSize: 9.5,
                      letterSpacing: 1.1,
                    ),
              ),
            ],
          ),
        ),
        trailing ??
            StatusPill(
              label: 'TERM 2',
              background: tokens.blueWash,
              foreground: tokens.blueInk,
              uppercase: true,
            ),
      ],
    );
  }
}

/// A section heading with an optional pill count/source on the right.
class SectionHead extends StatelessWidget {
  const SectionHead({super.key, required this.title, this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ),
        if (trailing != null) ...[
          const SizedBox(width: Space.sm),
          Flexible(
            child: StatusPill(
              label: trailing!,
              background: tokens.blueWash,
              foreground: tokens.blueInk,
            ),
          ),
        ],
      ],
    );
  }
}

/// Frosted glass editorial card for scrolling surfaces (GPU-safe, zero blur).
class ShuleCard extends StatelessWidget {
  const ShuleCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.lg + 2),
    this.brand = false,
    this.transparent = false,
    this.flat = false,
    this.glowCorner = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool brand;

  /// Draw no background of its own; the caller supplies one.
  final bool transparent;

  /// No shadow and no hairline: for cards inside a card.
  final bool flat;

  /// Subtle top-right sapphire ambient sheen.
  final bool glowCorner;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final radius = BorderRadius.circular(Corners.glass);
    final ink = brand ? tokens.onGradient : tokens.ink;
    final content = Padding(padding: padding, child: child);

    if (transparent) {
      return DefaultTextStyle.merge(
        style: TextStyle(color: ink),
        child: onTap == null
            ? content
            : InkWell(borderRadius: radius, onTap: onTap, child: content),
      );
    }

    if (brand) {
      return DecoratedBox(
        decoration: BoxDecoration(
          color: tokens.gradientStart,
          borderRadius: radius,
          border: flat ? null : Border.all(color: tokens.glassBorder),
          boxShadow: flat ? null : shuleShadow(tokens),
        ),
        child: Material(
          color: Colors.transparent,
          borderRadius: radius,
          child: DefaultTextStyle.merge(
            style: TextStyle(color: ink),
            child: onTap == null
                ? content
                : InkWell(borderRadius: radius, onTap: onTap, child: content),
          ),
        ),
      );
    }

    return ShuleGlassCard(
      padding: padding,
      radius: Corners.glass,
      flat: flat,
      glowCorner: glowCorner,
      onTap: onTap,
      child: DefaultTextStyle.merge(
        style: TextStyle(color: ink),
        child: child,
      ),
    );
  }
}

/// A statement of what the app does and does not do.
enum NoticeTone { info, caution, danger, done }

class Notice extends StatelessWidget {
  const Notice({
    super.key,
    required this.title,
    required this.body,
    this.tone = NoticeTone.info,
  });

  final String title;
  final String body;
  final NoticeTone tone;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final dark = tokens.brightness == Brightness.dark;
    final (icon, colour, tint) = switch (tone) {
      NoticeTone.info => (
          Icons.info_outline_rounded,
          tokens.blueInk,
          tokens.blueWash,
        ),
      NoticeTone.caution => (
          Icons.warning_amber_rounded,
          tokens.warning,
          tokens.warning.withValues(alpha: dark ? 0.18 : 0.12),
        ),
      NoticeTone.danger => (
          Icons.error_outline_rounded,
          tokens.danger,
          tokens.danger.withValues(alpha: dark ? 0.18 : 0.12),
        ),
      NoticeTone.done => (
          Icons.check_circle_outline_rounded,
          tokens.success,
          tokens.success.withValues(alpha: dark ? 0.18 : 0.12),
        ),
    };
    return Semantics(
      container: true,
      child: Container(
        padding: const EdgeInsets.all(Space.lg),
        decoration: BoxDecoration(
          color: tokens.mutedSurface.withValues(alpha: dark ? 0.86 : 0.84),
          borderRadius: BorderRadius.circular(Corners.glass),
          border: Border.all(color: tokens.glassBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ShuleGlyph(
              icon: icon,
              size: 36,
              background: tint,
              foreground: colour,
            ),
            const SizedBox(width: Space.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14),
                  ),
                  const SizedBox(height: Space.xs),
                  Text(body, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A label and a value, used on profile and connection cards.
class FactRow extends StatelessWidget {
  const FactRow({super.key, required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 108,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          const SizedBox(width: Space.sm),
          Expanded(
            child: SelectableText(
              value.trim().isEmpty ? 'Not provided' : value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: tokens.ink,
                    fontWeight: FontWeight.w600,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

/// An empty state that says why it is empty and what to do next.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    required this.body,
    this.doodle = Doodle.sparkles,
    this.action,
  });

  final String title;
  final String body;
  final Doodle doodle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleGlassCard(
      padding: const EdgeInsets.symmetric(vertical: Space.xl, horizontal: Space.lg),
      child: Column(
        children: [
          ExcludeSemantics(child: DoodleView(doodle: doodle, size: 60, color: tokens.blueInk)),
          const SizedBox(height: Space.md),
          Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: Space.sm),
          Text(body, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
          if (action != null) ...[
            const SizedBox(height: Space.lg),
            action!,
          ],
        ],
      ),
    );
  }
}

/// A tappable frosted glass shortcut tile with a blue icon badge and arrow.
class FeatureTile extends StatelessWidget {
  const FeatureTile({
    super.key,
    required this.doodle,
    required this.title,
    required this.caption,
    required this.onTap,
    this.icon,
  });

  final Doodle doodle;
  final String title;
  final String caption;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.lg),
      glowCorner: true,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (icon != null)
                ShuleGlyph(icon: icon!, size: 42)
              else
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: tokens.blueWash,
                    borderRadius: BorderRadius.circular(Corners.chip + 2),
                  ),
                  alignment: Alignment.center,
                  child: DoodleView(
                    doodle: doodle,
                    size: 30,
                    strokeWidth: 3.0,
                    color: tokens.blueInk,
                  ),
                ),
              const Spacer(),
              ExcludeSemantics(
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: tokens.innerSurface,
                    shape: BoxShape.circle,
                    border: Border.all(color: tokens.border),
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    Icons.arrow_outward_rounded,
                    size: 15,
                    color: tokens.blueInk,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: Space.xs),
          Text(
            caption,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted),
          ),
        ],
      ),
    );
  }
}

/// The flagship pure-blue editorial hero card with a painted orbital seal and
/// crisp inverted pill CTA.
class BrandPanel extends StatelessWidget {
  const BrandPanel({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.actionLabel,
    required this.onAction,
  });

  final String eyebrow;
  final String title;
  final String body;
  final String actionLabel;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final shape = BorderRadius.circular(Corners.hero);
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: tokens.blueHeroGradient,
        borderRadius: shape,
        border: Border.all(
          color: tokens.onGradient.withValues(alpha: 0.16),
        ),
        boxShadow: shuleShadow(tokens, raised: true),
      ),
      child: ClipRRect(
        borderRadius: shape,
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: CustomPaint(
                  painter: _BlueOrbitalSeal(ink: tokens.onGradient),
                ),
              ),
            ),
            ShuleCard(
              brand: true,
              transparent: true,
              padding: const EdgeInsets.all(Space.xl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: tokens.brightness == Brightness.dark
                          ? const Color(0x26FFFFFF)
                          : const Color(0x2609162B),
                      borderRadius: BorderRadius.circular(Corners.pill),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ExcludeSemantics(
                          child: Icon(
                            Icons.auto_awesome_outlined,
                            size: 14,
                            color: tokens.onGradient,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Flexible(
                          child: Text(
                            eyebrow,
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: tokens.onGradient,
                                  letterSpacing: 1.3,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.lg),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                          color: tokens.onGradient,
                          height: 1.12,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: Space.sm),
                  Text(
                    body,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: tokens.onGradient,
                        ),
                  ),
                  const SizedBox(height: Space.lg + 2),
                  FilledButton.icon(
                    onPressed: onAction,
                    style: FilledButton.styleFrom(
                      backgroundColor: tokens.surface,
                      foregroundColor: tokens.primary,
                      iconColor: tokens.primary,
                      minimumSize: const Size(0, kMinTapTarget),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Corners.pill),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: Space.xl),
                    ),
                    icon: Icon(Icons.arrow_forward_rounded, size: 18, color: tokens.primary),
                    iconAlignment: IconAlignment.end,
                    label: Text(
                      actionLabel,
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        color: tokens.primary,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Decorative orbital seal in the hero card's top-right corner.
class _BlueOrbitalSeal extends CustomPainter {
  const _BlueOrbitalSeal({required this.ink});

  final Color ink;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width * 0.88, size.height * 0.24);
    final radius = (size.shortestSide * 0.34).clamp(44.0, 90.0);
    canvas.drawCircle(
      center,
      radius * 1.45,
      Paint()
        ..shader = RadialGradient(
          colors: [ink.withValues(alpha: 0.16), ink.withValues(alpha: 0.0)],
        ).createShader(Rect.fromCircle(center: center, radius: radius * 1.45)),
    );
    final ring = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1;
    canvas.drawCircle(center, radius * 0.92, ring..color = ink.withValues(alpha: 0.16));
    canvas.drawCircle(center, radius * 1.24, ring..color = ink.withValues(alpha: 0.10));
    canvas.drawCircle(
      center + Offset(-radius * 0.86, radius * 0.32),
      3.5,
      Paint()..color = ink.withValues(alpha: 0.35),
    );
  }

  @override
  bool shouldRepaint(_BlueOrbitalSeal old) => old.ink != ink;
}

/// A labelled metric with tabular numerals so numbers never jitter.
class MetricBlock extends StatelessWidget {
  const MetricBlock({
    super.key,
    required this.value,
    required this.label,
    this.caption,
  });

  final String value;
  final String label;
  final String? caption;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            maxLines: 1,
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: tokens.blueInk,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: tokens.inkMuted,
                fontWeight: FontWeight.w600,
              ),
        ),
        if (caption != null) ...[
          const SizedBox(height: 2),
          Text(caption!, style: Theme.of(context).textTheme.labelSmall),
        ],
      ],
    );
  }
}

/// A full-pill choice chip with a crisp blue active state and 48 px tap target.
class ChoicePill extends StatelessWidget {
  const ChoicePill({
    super.key,
    required this.label,
    required this.selected,
    required this.onSelected,
    this.semanticHint,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;
  final String? semanticHint;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    return Semantics(
      button: true,
      selected: selected,
      hint: semanticHint,
      child: PressableScale(
        onTap: onSelected,
        scale: 0.95,
        haptic: true,
        child: AnimatedContainer(
          duration: prefs.fast,
          curve: Curves2.standard,
          constraints: const BoxConstraints(
            minHeight: kMinTapTarget,
            minWidth: kMinTapTarget,
          ),
          decoration: BoxDecoration(
            color: selected ? tokens.primary : tokens.innerSurface,
            borderRadius: BorderRadius.circular(Corners.pill),
            border: Border.all(
              color: selected ? tokens.primary : tokens.border,
            ),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: tokens.primary.withValues(alpha: 0.24),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          padding: const EdgeInsets.symmetric(horizontal: Space.lg),
          child: Center(
            widthFactor: 1,
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: selected ? tokens.onPrimary : tokens.ink,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}
