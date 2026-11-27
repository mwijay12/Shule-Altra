/// Floating frosted blue glass dock + detached glowing blue action orb.
///
/// Follows the signature geometry shared across the reference apps:
///  * floating stadium capsule (`radius: 999`, side margins, never edge-stuck)
///    using bounded [ShuleGlassBlur] (one of the few surfaces allowed real blur);
///  * all four destinations keep both icon and crisp label visible so every tab
///    is one tap away without guessing;
///  * detached glowing blue circular action orb on the right opening a frosted
///    Quick School Actions sheet relevant to Shule Altra.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'glass.dart';
import 'motion.dart';
import 'tokens.dart';

class ShuleDockItem {
  const ShuleDockItem({
    required this.label,
    required this.icon,
    required this.activeIcon,
  });

  final String label;
  final IconData icon;
  final IconData activeIcon;
}

class ShuleGlassDock extends StatelessWidget {
  const ShuleGlassDock({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelected,
    this.onQuickAction,
    this.quickActionTooltip = 'Quick school actions',
  });

  final List<ShuleDockItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelected;
  final VoidCallback? onQuickAction;
  final String quickActionTooltip;

  static const double _orbSize = 58;
  static const double _gap = 10;
  static const double _dockHeight = 62;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      minimum: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.only(top: 6, bottom: 2),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final maxWidth = math.min(540.0, constraints.maxWidth);
            final edge = maxWidth >= 360 ? 14.0 : 8.0;
            final width = math.max(0.0, maxWidth - edge * 2);
            final showOrbInline =
                onQuickAction != null && width >= 300;

            final dockPill = SizedBox(
              height: _dockHeight,
              child: ShuleGlassBlur(
                radius: Corners.pill,
                padding: const EdgeInsets.all(5),
                sigma: 20,
                child: Row(
                  children: [
                    for (var i = 0; i < items.length; i++)
                      Expanded(
                        child: _DockTile(
                          item: items[i],
                          active: i == selectedIndex,
                          onTap: () => onSelected(i),
                        ),
                      ),
                  ],
                ),
              ),
            );

            final orb = onQuickAction == null
                ? null
                : _BlueQuickOrb(
                    size: _orbSize,
                    tooltip: quickActionTooltip,
                    onTap: onQuickAction!,
                  );

            return Center(
              heightFactor: 1,
              child: SizedBox(
                width: width,
                child: showOrbInline && orb != null
                    ? Row(
                        children: [
                          Expanded(child: dockPill),
                          const SizedBox(width: _gap),
                          orb,
                        ],
                      )
                    : dockPill,
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DockTile extends StatelessWidget {
  const _DockTile({
    required this.item,
    required this.active,
    required this.onTap,
  });

  final ShuleDockItem item;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final fg = active ? tokens.onPrimary : tokens.inkMuted;

    return Semantics(
      button: true,
      selected: active,
      label: item.label,
      child: PressableScale(
        onTap: onTap,
        scale: 0.94,
        haptic: true,
        child: AnimatedContainer(
          duration: prefs.base,
          curve: Curves2.standard,
          margin: const EdgeInsets.symmetric(horizontal: 1),
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          decoration: BoxDecoration(
            color: active ? tokens.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(Corners.pill),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: tokens.primary.withValues(alpha: 0.28),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.max,
            children: [
              Icon(
                active ? item.activeIcon : item.icon,
                size: 20,
                color: fg,
              ),
              const SizedBox(height: 2),
              Flexible(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    item.label,
                    maxLines: 1,
                    softWrap: false,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: fg,
                      fontSize: 10.5,
                      fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                      height: 1.05,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Detached circular glowing blue quick-action orb.
class _BlueQuickOrb extends StatelessWidget {
  const _BlueQuickOrb({
    required this.size,
    required this.tooltip,
    required this.onTap,
  });

  final double size;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final dark = tokens.brightness == Brightness.dark;
    return Semantics(
      button: true,
      label: tooltip,
      child: Tooltip(
        message: tooltip,
        child: PressableScale(
          key: const Key('shule-quick-orb'),
          onTap: onTap,
          scale: 0.92,
          haptic: true,
          child: SizedBox.square(
            dimension: size,
            child: DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: tokens.glowDeep.withValues(alpha: dark ? 0.42 : 0.36),
                    blurRadius: 22,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: CustomPaint(
                painter: _BlueOrbPainter(
                  start: tokens.blueHeroEnd,
                  mid: tokens.primary,
                  end: tokens.blueHeroStart,
                  rimLight: dark
                      ? const Color(0x99FFFFFF)
                      : const Color(0xE6FFFFFF),
                  iconColor: tokens.onPrimary,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BlueOrbPainter extends CustomPainter {
  const _BlueOrbPainter({
    required this.start,
    required this.mid,
    required this.end,
    required this.rimLight,
    required this.iconColor,
  });

  final Color start;
  final Color mid;
  final Color end;
  final Color rimLight;
  final Color iconColor;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final center = rect.center;
    final radius = size.shortestSide / 2;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-0.35, -0.40),
          radius: 1.15,
          colors: [start, mid, end],
          stops: const [0.0, 0.54, 1.0],
        ).createShader(rect),
    );

    canvas.drawCircle(
      center,
      radius - 0.8,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4
        ..shader = LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [rimLight, rimLight.withValues(alpha: 0.18)],
        ).createShader(rect),
    );

    _sparkle(canvas, center + const Offset(-2.5, 1.0), 10.5, iconColor);
    _sparkle(canvas, center + const Offset(9.5, -8.5), 3.6, iconColor);
  }

  void _sparkle(Canvas canvas, Offset origin, double r, Color color) {
    final d = r * 0.22;
    final path = Path()
      ..moveTo(origin.dx, origin.dy - r)
      ..quadraticBezierTo(origin.dx + d, origin.dy - d, origin.dx + r, origin.dy)
      ..quadraticBezierTo(origin.dx + d, origin.dy + d, origin.dx, origin.dy + r)
      ..quadraticBezierTo(origin.dx - d, origin.dy + d, origin.dx - r, origin.dy)
      ..quadraticBezierTo(origin.dx - d, origin.dy - d, origin.dx, origin.dy - r)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_BlueOrbPainter old) {
    return old.start != start ||
        old.mid != mid ||
        old.end != end ||
        old.rimLight != rimLight ||
        old.iconColor != iconColor;
  }
}

/// Frosted glass Quick School Actions sheet launched from the blue orb.
Future<void> showShuleQuickSheet(
  BuildContext context, {
  required String sourceLabel,
  required bool isDark,
  required VoidCallback onOpenRegister,
  required VoidCallback onOpenDay,
  required VoidCallback onOpenMore,
  required VoidCallback onToggleTheme,
  VoidCallback? onOpenSavedTimetable,
}) {
  return showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) {
      final tokens = ShuleTokens.of(sheetContext);
      void run(VoidCallback action) {
        Navigator.of(sheetContext).pop();
        action();
      }

      return Padding(
        padding: const EdgeInsets.fromLTRB(Space.md, 0, Space.md, Space.md),
        child: ShuleGlassBlur(
          radius: Corners.panel,
          sigma: 24,
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.lg),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: tokens.border,
                      borderRadius: BorderRadius.circular(Corners.pill),
                    ),
                  ),
                ),
                const SizedBox(height: Space.md),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Quick school actions',
                            style: Theme.of(sheetContext).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 4),
                          StatusPill(
                            label: sourceLabel,
                            icon: Icons.school_outlined,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Close',
                      onPressed: () => Navigator.of(sheetContext).pop(),
                      icon: Icon(Icons.close_rounded, color: tokens.inkMuted),
                    ),
                  ],
                ),
                const SizedBox(height: Space.lg),
                _QuickSheetTile(
                  icon: Icons.people_outline_rounded,
                  title: 'Learner register',
                  subtitle: 'Search, filter and inspect learners page by page',
                  onTap: () => run(onOpenRegister),
                ),
                const SizedBox(height: Space.sm),
                _QuickSheetTile(
                  icon: Icons.event_note_outlined,
                  title: 'School day & practice',
                  subtitle: 'Practice roll call and view the sample timetable',
                  onTap: () => run(onOpenDay),
                ),
                if (onOpenSavedTimetable != null) ...[
                  const SizedBox(height: Space.sm),
                  _QuickSheetTile(
                    icon: Icons.calendar_month_outlined,
                    title: 'Saved school timetable',
                    subtitle: 'Read-only class schedule from your school',
                    onTap: () => run(onOpenSavedTimetable),
                  ),
                ],
                const SizedBox(height: Space.sm),
                _QuickSheetTile(
                  icon: isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  title: isDark ? 'Switch to Day theme' : 'Switch to Night theme',
                  subtitle: 'Blue glass theme adapts cleanly day and night',
                  onTap: () => run(onToggleTheme),
                ),
                const SizedBox(height: Space.sm),
                _QuickSheetTile(
                  icon: Icons.tune_outlined,
                  title: 'Connection & limits',
                  subtitle: 'Inspect session source, Firebase config or sign out',
                  onTap: () => run(onOpenMore),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class _QuickSheetTile extends StatelessWidget {
  const _QuickSheetTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleInnerTile(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: Space.md, vertical: Space.md),
      child: Row(
        children: [
          ShuleGlyph(icon: icon, size: 40),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 2),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
        ],
      ),
    );
  }
}
