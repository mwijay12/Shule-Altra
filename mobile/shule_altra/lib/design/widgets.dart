/// The small parts every screen is built from.
///
/// Nothing here knows about data. Each one reads its colours from
/// [ShuleTokens] and its durations from [MotionPrefs], so it looks right in both
/// themes and stops moving when the OS asks it to.
library;

import 'package:flutter/material.dart';

import 'doodles.dart';
import 'motion.dart';
import 'tokens.dart';

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

/// A card. `brand` fills it with the deep green and switches to the light ink.
class ShuleCard extends StatelessWidget {
  const ShuleCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.xl),
    this.brand = false,
    this.onTap,
  });

  final Widget child;
  final EdgeInsets padding;
  final bool brand;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final radius = BorderRadius.circular(Corners.hero);
    final background = brand ? tokens.brandSurface : tokens.surface;
    final content = Padding(padding: padding, child: child);

    return Material(
      color: background,
      borderRadius: radius,
      child: onTap == null
          ? content
          : InkWell(
              borderRadius: radius,
              onTap: onTap,
              child: content,
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
    return ShuleCard(
      brand: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ExcludeSemantics(child: Icon(Icons.auto_awesome_outlined, size: 16, color: tokens.accent)),
              const SizedBox(width: Space.sm),
              Text(
                eyebrow,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.accent),
              ),
            ],
          ),
          const SizedBox(height: Space.lg),
          Text(
            title,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: tokens.onBrand,
                  height: 1.14,
                  fontSize: 25,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: Space.sm),
          Text(
            body,
            // 82% of the ink, not of a pure white: the drawn colour is measured
            // too, at 8.59:1 by day and 9.88:1 at night.
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: tokens.onBrand.withValues(alpha: 0.82),
                ),
          ),
          const SizedBox(height: Space.lg + 2),
          FilledButton.tonal(
            // A method reference, not an inline closure: Flutter passes the
            // ButtonStyleButton's own state to this callback type in some
            // versions, and a closure that ignores it is fine while a tearoff of a
            // VoidCallback method is not. Both are accepted here.
            onPressed: () => onAction(),
            style: FilledButton.styleFrom(
              backgroundColor: tokens.accent,
              foregroundColor: tokens.onAccent,
              minimumSize: const Size(0, kMinTapTarget),
            ),
            child: Text(actionLabel),
          ),
        ],
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
