/// The small parts every screen is built from.
///
/// Nothing here knows about data. Each one reads its colours from
/// [ShuleTokens] and its durations from [MotionPrefs], so it looks right in both
/// themes and stops moving when the OS asks it to.
library;

import 'package:flutter/material.dart';

import 'doodles.dart';
import 'motion.dart';
import 'theme.dart' show shuleShadow;
import 'tokens.dart';

/// The app's main call to action: the website's brand ramp, in a button.
///
/// `FilledButton` cannot draw a gradient (it fills with one colour), and the
/// gradient is the most recognisable thing the product has — it is on the login
/// card, every primary button and the landing page's hero. So the primary action
/// is this widget rather than a styled `FilledButton`.
///
/// It keeps the things a button owes a finger: 54 logical pixels tall, a
/// [Semantics] button role, an InkWell ripple clipped to the pill, and a disabled
/// state that reads as disabled (flat hairline, muted label) instead of a faded
/// gradient that still looks tappable.
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
    final radius = BorderRadius.circular(Corners.card);

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
          Icon(icon, size: 20, color: tokens.onGradient),
          const SizedBox(width: Space.sm),
        ],
        Flexible(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: enabled ? tokens.onGradient : tokens.inkMuted,
              fontSize: 15,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.1,
            ),
          ),
        ),
      ],
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      child: Opacity(
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
      ),
    );
  }
}

/// The app header: mark, wordmark, and the honesty badge.
class BrandBar extends StatelessWidget {
  const BrandBar({super.key, this.trailing});

  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Row(
      children: [
        const DoodleView(doodle: Doodle.mark, size: 40, strokeWidth: 3.6),
        const SizedBox(width: Space.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'shule altra',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      letterSpacing: -0.5,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              Text(
                'SCHOOL, IN SYNC',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
        trailing ??
            Container(
              padding: const EdgeInsets.symmetric(horizontal: Space.md, vertical: 6),
              decoration: BoxDecoration(
                color: tokens.mutedSurface,
                borderRadius: BorderRadius.circular(Corners.pill),
              ),
              child: Text('PILOT', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.ink)),
            ),
      ],
    );
  }
}

/// A section heading with an optional count on the right.
class SectionHead extends StatelessWidget {
  const SectionHead({super.key, required this.title, this.trailing});

  final String title;
  final String? trailing;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Expanded(child: Text(title, style: Theme.of(context).textTheme.headlineSmall)),
        if (trailing != null)
          Text(trailing!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted)),
      ],
    );
  }
}

/// A card: white on the hub's off-white page, a hairline edge, a soft shadow.
///
/// `brand` fills it with the ramp and switches to the gradient ink; `transparent`
/// lets a caller draw its own background (the gradient panel does), so the card
/// still owns the padding, radius and tap behaviour.
class ShuleCard extends StatelessWidget {
  const ShuleCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.xl),
    this.brand = false,
    this.transparent = false,
    this.flat = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool brand;

  /// Draw no background of its own; the caller supplies one.
  final bool transparent;

  /// No shadow and no hairline: for cards inside a card.
  final bool flat;

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final radius = BorderRadius.circular(Corners.hero);
    final ink = brand ? tokens.onGradient : tokens.ink;
    final content = Padding(padding: padding, child: child);

    if (transparent) {
      return onTap == null
          ? content
          : InkWell(borderRadius: radius, onTap: onTap, child: content);
    }

    return DecoratedBox(
      decoration: BoxDecoration(
        // A brand card gets the ramp as a flat block of its first stop: the
        // gradient belongs to the panel that wraps it.
        color: brand ? tokens.gradientStart : tokens.surface,
        borderRadius: radius,
        border: flat ? null : Border.all(color: tokens.border),
        boxShadow: flat ? null : shuleShadow(tokens),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: DefaultTextStyle.merge(
          style: TextStyle(color: ink),
          child: onTap == null
              ? content
              : InkWell(
                  borderRadius: radius,
                  onTap: onTap,
                  child: content,
                ),
        ),
      ),
    );
  }
}

/// A statement of what the app does and does not do.
///
/// [tone] is not decoration: every notice states a fact the reader has to be
/// able to trust, so the colour matches the meaning and the text always says it
/// in words as well.
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
    final (icon, colour) = switch (tone) {
      NoticeTone.info => (Icons.info_outline_rounded, tokens.ink),
      NoticeTone.caution => (Icons.warning_amber_rounded, tokens.warning),
      NoticeTone.danger => (Icons.error_outline_rounded, tokens.danger),
      NoticeTone.done => (Icons.check_circle_outline_rounded, tokens.success),
    };
    return Semantics(
      container: true,
      child: Container(
        padding: const EdgeInsets.all(Space.lg),
        decoration: BoxDecoration(
          color: tokens.mutedSurface,
          borderRadius: BorderRadius.circular(Corners.panel),
          border: Border.all(color: tokens.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ExcludeSemantics(child: Icon(icon, size: 20, color: colour)),
            const SizedBox(width: Space.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14)),
                  const SizedBox(height: Space.xs + 1),
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

/// A label and a value, used on the profile sheets.
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
            width: 116,
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Expanded(
            child: SelectableText(
              value.trim().isEmpty ? 'Not provided' : value,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.ink),
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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xxl, horizontal: Space.lg),
      child: Column(
        children: [
          ExcludeSemantics(child: DoodleView(doodle: doodle, size: 64, color: tokens.inkMuted)),
          const SizedBox(height: Space.lg),
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

/// A tappable tile with a doodle, a title and one line of explanation.
class FeatureTile extends StatelessWidget {
  const FeatureTile({
    super.key,
    required this.doodle,
    required this.title,
    required this.caption,
    required this.onTap,
  });

  final Doodle doodle;
  final String title;
  final String caption;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleCard(
      padding: const EdgeInsets.all(Space.lg),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DoodleView(doodle: doodle, size: 44, strokeWidth: 3.4),
          const SizedBox(height: Space.lg),
          Text(title, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: Space.xs + 1),
          Text(caption, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted)),
        ],
      ),
    );
  }
}

/// The one loud element on a screen: the brand card with a single action.
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
    return Container(
      decoration: BoxDecoration(
        // The website's `.colorful-gradient`: the one place the product shows
        // its whole palette at once.
        gradient: tokens.brandGradient,
        borderRadius: BorderRadius.circular(Corners.hero),
        boxShadow: shuleShadow(tokens, raised: true),
      ),
      child: ShuleCard(
        brand: true,
        transparent: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ExcludeSemantics(
                  child: Icon(
                    Icons.auto_awesome_outlined,
                    size: 16,
                    // Full-strength ink. A 12% reduction looked nicer and measured
                    // 3.9:1 at the violet end, which is below AA — the hierarchy
                    // here comes from size and tracking instead.
                    color: tokens.onGradient,
                  ),
                ),
                const SizedBox(width: Space.sm),
                Text(
                  eyebrow,
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: tokens.onGradient, letterSpacing: 1.6),
                ),
              ],
            ),
            const SizedBox(height: Space.lg),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: tokens.onGradient,
                    height: 1.14,
                    fontSize: 25,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: Space.sm),
            Text(
              body,
              // Full ink, because 86% measured 3.92:1 at the violet end. The
              // panel's hierarchy is the heading's size, not a faded paragraph.
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: tokens.onGradient,
                  ),
            ),
            const SizedBox(height: Space.lg + 2),
            // On the gradient the action is a white pill with the blue label —
            // the same inverted button the website uses on its dark blocks.
            FilledButton(
              onPressed: () => onAction(),
              style: FilledButton.styleFrom(
                backgroundColor: tokens.surface,
                foregroundColor: tokens.primary,
                minimumSize: const Size(0, kMinTapTarget),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(Corners.pill),
                ),
                padding: const EdgeInsets.symmetric(horizontal: Space.xl),
              ),
              child: Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}

/// A labelled metric. The number is real, the caption says what it counts.
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
        Text(
          value,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                color: tokens.ink,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
        ),
        const SizedBox(height: 2),
        Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted)),
        if (caption != null) ...[
          const SizedBox(height: 2),
          Text(caption!, style: Theme.of(context).textTheme.labelSmall),
        ],
      ],
    );
  }
}

/// A pill chip with a real selected state, big enough to tap.
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
      child: AnimatedContainer(
        duration: prefs.fast,
        curve: Curves2.standard,
        constraints: const BoxConstraints(minHeight: kMinTapTarget, minWidth: kMinTapTarget),
        decoration: BoxDecoration(
          color: selected ? tokens.primary : tokens.surface,
          borderRadius: BorderRadius.circular(Corners.pill),
          border: Border.all(color: selected ? tokens.primary : tokens.border),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            borderRadius: BorderRadius.circular(Corners.pill),
            onTap: onSelected,
            child: Padding(
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
        ),
      ),
    );
  }
}
