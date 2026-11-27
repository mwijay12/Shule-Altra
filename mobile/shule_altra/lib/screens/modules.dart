/// Full website-parity & role-specific module screens for Shule Altra:
///  * AnalyticsScreen (animated radial rings, 7D/30D/90D/TERM bar chart, class & NECTA bars)
///  * HostelHubView (dedicated Boarding Master / Hostel Warden home tab)
///  * TransportHubView (dedicated Fleet / Transport Coordinator home tab)
///  * CommunicationsScreen (guardian & staff broadcast composer)
///  * CanteenScreen (POS cards & baskets — supports embedded tab or pushed route)
///  * InventoryScreen (18 tracked school assets)
///  * ShuleGuideScreen (instant offline Q&A on live 150-student register)
///  * AuditTrailScreen (chronological audit trail)
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';

String formatCompactTzs(double amount) {
  if (amount >= 1000000) {
    return 'TZS ${(amount / 1000000).toStringAsFixed(1)}M';
  }
  if (amount >= 1000) {
    return 'TZS ${(amount / 1000).toStringAsFixed(0)}K';
  }
  return formatTzs(amount);
}

/* -------------------------------------------------------------------------- */
/*  Reusable Animated Analytics Primitives                                    */
/* -------------------------------------------------------------------------- */

/// Smooth animated radial donut ring (`CustomPainter` + `TweenAnimationBuilder`).
class AnimatedRingMeter extends StatelessWidget {
  const AnimatedRingMeter({
    super.key,
    required this.fraction,
    required this.label,
    required this.caption,
    required this.color,
    this.size = 96,
  });

  final double fraction;
  final String label;
  final String caption;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final target = fraction.clamp(0.0, 1.0);
    final duration = prefs.reduced ? Duration.zero : const Duration(milliseconds: 780);

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: target),
      duration: duration,
      curve: Curves2.enter,
      builder: (context, value, _) {
        final pct = (value * 100).toStringAsFixed(1);
        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: size,
              height: size,
              child: CustomPaint(
                painter: _RingPainter(
                  progress: value,
                  color: color,
                  trackColor: tokens.blueWash,
                ),
                child: Center(
                  child: Text(
                    '$pct%',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: tokens.ink,
                          fontWeight: FontWeight.w800,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: Space.sm),
            Text(
              label,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            Text(
              caption,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.labelSmall,
            ),
          ],
        );
      },
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
  });

  final double progress;
  final Color color;
  final Color trackColor;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const stroke = 9.5;
    final radius = (size.shortestSide - stroke) / 2;

    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = trackColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke,
    );

    if (progress <= 0) return;
    final sweep = math.pi * 2 * progress;
    final rect = Rect.fromCircle(center: center, radius: radius);
    canvas.drawArc(
      rect,
      -math.pi / 2,
      sweep,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.progress != progress || old.color != color || old.trackColor != trackColor;
}

/// Smooth animated horizontal progress bar for class balances, divisions & wings.
class AnimatedStatBar extends StatelessWidget {
  const AnimatedStatBar({
    super.key,
    required this.fraction,
    required this.color,
    this.height = 10,
    this.delayMs = 0,
  });

  final double fraction;
  final Color color;
  final double height;
  final int delayMs;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final target = fraction.clamp(0.0, 1.0);
    final duration = prefs.reduced
        ? Duration.zero
        : Duration(milliseconds: 560 + delayMs.clamp(0, 280));

    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: target),
      duration: duration,
      curve: Curves2.enter,
      builder: (context, value, _) {
        return ClipRRect(
          borderRadius: BorderRadius.circular(Corners.pill),
          child: Container(
            height: height,
            color: tokens.blueWash,
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: value,
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(Corners.pill),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Interactive animated Fee Collections Trend chart (`7D / 30D / 90D / TERM`).
class AnimatedFeeTrendCard extends StatefulWidget {
  const AnimatedFeeTrendCard({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<AnimatedFeeTrendCard> createState() => _AnimatedFeeTrendCardState();
}

class _AnimatedFeeTrendCardState extends State<AnimatedFeeTrendCard> {
  String _range = '30D';

  static const _ranges = <String>['7D', '30D', '90D', 'TERM'];

  List<({String label, double value})> _seriesFor(String range) {
    final base = widget.workspace.totalCollectedFees / 1000000.0;
    return switch (range) {
      '7D' => [
          (label: 'Mon', value: 1.4),
          (label: 'Tue', value: 2.1),
          (label: 'Wed', value: 1.8),
          (label: 'Thu', value: 2.9),
          (label: 'Fri', value: 3.4),
          (label: 'Sat', value: 1.1),
          (label: 'Sun', value: 0.9),
        ],
      '30D' => [
          (label: 'W1', value: (base * 0.14).clamp(2.5, 18.0)),
          (label: 'W2', value: (base * 0.22).clamp(4.0, 22.0)),
          (label: 'W3', value: (base * 0.19).clamp(3.2, 20.0)),
          (label: 'W4', value: (base * 0.27).clamp(5.0, 26.0)),
          (label: 'Now', value: (base * 0.18).clamp(3.0, 19.0)),
        ],
      '90D' => [
          (label: 'Sep', value: (base * 0.24).clamp(6.0, 24.0)),
          (label: 'Oct', value: (base * 0.36).clamp(9.0, 32.0)),
          (label: 'Nov', value: (base * 0.40).clamp(10.0, 36.0)),
        ],
      _ => [
          (label: 'F1', value: (base * 0.21).clamp(5.0, 25.0)),
          (label: 'F2', value: (base * 0.23).clamp(5.5, 25.0)),
          (label: 'F3', value: (base * 0.28).clamp(7.0, 30.0)),
          (label: 'F4', value: (base * 0.28).clamp(7.0, 30.0)),
        ],
    };
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final series = _seriesFor(_range);
    final maxVal = series.fold<double>(0.1, (m, e) => e.value > m ? e.value : m);
    final totalPeriod = series.fold<double>(0, (s, e) => s + e.value);
    final duration = prefs.reduced ? Duration.zero : const Duration(milliseconds: 520);

    return ShuleGlassCard(
      glowCorner: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Fee collections trend', style: Theme.of(context).textTheme.titleMedium),
                    Text(
                      'TZS ${totalPeriod.toStringAsFixed(1)}M in $_range window',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              StatusPill(
                label: _range,
                background: tokens.blueWash,
                foreground: tokens.blueInk,
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Wrap(
            spacing: Space.xs,
            runSpacing: Space.xs,
            children: [
              for (final r in _ranges)
                ChoicePill(
                  label: r,
                  selected: _range == r,
                  onSelected: () => setState(() => _range = r),
                ),
            ],
          ),
          const SizedBox(height: Space.lg),
          SizedBox(
            height: 156,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < series.length; i++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: TweenAnimationBuilder<double>(
                        key: ValueKey<String>('$_range-$i'),
                        tween: Tween<double>(begin: 0.08, end: (series[i].value / maxVal).clamp(0.12, 1.0)),
                        duration: duration,
                        curve: Curves.easeOutCubic,
                        builder: (context, factor, _) {
                          return Column(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              Text(
                                '${series[i].value.toStringAsFixed(1)}M',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                      color: tokens.blueInk,
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w800,
                                    ),
                              ),
                              const SizedBox(height: 5),
                              Container(
                                height: 102 * factor,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.bottomCenter,
                                    end: Alignment.topCenter,
                                    colors: [tokens.primary, tokens.accent],
                                  ),
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(10),
                                    bottom: Radius.circular(4),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                series[i].label,
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  1. Analytics (`/dashboard/analytics`) — Embedded or Pushed                */
/* -------------------------------------------------------------------------- */

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({
    super.key,
    required this.workspace,
    this.embedded = false,
  });

  final SchoolWorkspace workspace;
  final bool embedded;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final body = ListenableBuilder(
      listenable: workspace,
      builder: (context, _) {
        final byClass = workspace.outstandingByClass;
        final maxClass = byClass.values.fold<double>(1, (m, v) => v > m ? v : m);
        final total = workspace.learners.length;
        final divCounts = <String, int>{
          'Division I': 0,
          'Division II': 0,
          'Division III': 0,
          'Division IV': 0,
          'Division 0': 0,
        };
        for (final l in workspace.learners) {
          final div = workspace.resultFor(l.id).division;
          if (divCounts.containsKey(div)) {
            divCounts[div] = divCounts[div]! + 1;
          }
        }
        final maxDiv = divCounts.values.fold<int>(1, (m, v) => v > m ? v : m);

        return ListView(
          padding: EdgeInsets.fromLTRB(
            Space.lg,
            Space.md,
            Space.lg,
            embedded ? Space.dockClearance : Space.xl,
          ),
          children: [
            if (embedded) ...[
              BrandBar(
                subtitle: '${SchoolProfile.schoolName.toUpperCase()} · ANALYTICS',
                trailing: StatusPill(
                  label: workspace.activeStaff.label,
                  background: tokens.blueWash,
                  foreground: tokens.blueInk,
                ),
              ),
              const SizedBox(height: Space.lg),
            ],
            // Animated dual radial donut rings
            ShuleGlassCard(
              glowCorner: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const StatusPill(label: 'LIVE PULSE · SHULE ALTRA 2026', uppercase: true),
                  const SizedBox(height: Space.md),
                  Row(
                    children: [
                      Expanded(
                        child: AnimatedRingMeter(
                          fraction: workspace.feeCollectionRate / 100.0,
                          label: 'Fee Collection',
                          caption: formatCompactTzs(workspace.totalCollectedFees),
                          color: tokens.primary,
                        ),
                      ),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: AnimatedRingMeter(
                          fraction: workspace.attendanceRate / 100.0,
                          label: 'Presence',
                          caption: '${workspace.absentCount} absent today',
                          color: tokens.success,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            // Animated 7D / 30D / 90D / TERM fee collections chart
            AnimatedFeeTrendCard(workspace: workspace),
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'Outstanding by class', trailing: 'Animated'),
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              child: Column(
                children: [
                  for (var i = 0; i < byClass.entries.length; i++) ...[
                    Builder(
                      builder: (context) {
                        final entry = byClass.entries.elementAt(i);
                        return Padding(
                          padding: const EdgeInsets.only(bottom: Space.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(entry.key, style: Theme.of(context).textTheme.titleSmall),
                                  Text(
                                    formatTzs(entry.value),
                                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                          color: tokens.blueInk,
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              AnimatedStatBar(
                                fraction: entry.value / maxClass,
                                color: tokens.primary,
                                delayMs: i * 65,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'Register composition', trailing: 'Form 1–4'),
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Boarders · ${workspace.boarderCount}', style: Theme.of(context).textTheme.titleSmall),
                      Text('Day scholars · ${workspace.dayScholarCount}', style: Theme.of(context).textTheme.titleSmall),
                    ],
                  ),
                  const SizedBox(height: Space.sm),
                  AnimatedStatBar(
                    fraction: total == 0 ? 0 : workspace.boarderCount / total,
                    color: tokens.primary,
                    height: 12,
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'NECTA CSEE divisions', trailing: '$total learners'),
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              child: Column(
                children: [
                  for (var i = 0; i < divCounts.entries.length; i++) ...[
                    Builder(
                      builder: (context) {
                        final entry = divCounts.entries.elementAt(i);
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(entry.key, style: Theme.of(context).textTheme.bodyMedium),
                                  Text(
                                    '${entry.value} students',
                                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                          color: tokens.blueInk,
                                          fontWeight: FontWeight.w700,
                                        ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 5),
                              AnimatedStatBar(
                                fraction: entry.value / maxDiv,
                                color: i == 0
                                    ? tokens.success
                                    : i <= 2
                                        ? tokens.primary
                                        : tokens.warning,
                                height: 8,
                                delayMs: i * 50,
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ],
              ),
            ),
          ],
        );
      },
    );

    if (embedded) return body;
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Analytics & Forecasts')),
      body: ShuleBackdrop(child: body),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  2. Dedicated Hostel Warden Hub (Role-Based Tab 0 for `HOSTEL`)            */
/* -------------------------------------------------------------------------- */

class HostelHubView extends StatelessWidget {
  const HostelHubView({
    super.key,
    required this.workspace,
    required this.onOpenBoarders,
    required this.onOpenRollCall,
  });

  final SchoolWorkspace workspace;
  final VoidCallback onOpenBoarders;
  final VoidCallback onOpenRollCall;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: workspace,
      builder: (context, _) {
        final staff = workspace.activeStaff;
        final boarders = workspace.learners.where((l) => l.type == 'Boarder').toList();
        final presentBoarders =
            boarders.where((l) => workspace.attendanceFor(l.id) != 'Absent').length;
        final totalCapacity =
            SchoolProfile.hostels.fold<int>(0, (sum, h) => sum + h.capacity);
        final occupancyPct =
            totalCapacity == 0 ? 0.0 : (boarders.length / totalCapacity) * 100.0;

        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            BrandBar(
              subtitle: '${SchoolProfile.schoolName.toUpperCase()} · BOARDING',
              trailing: StatusPill(
                label: staff.label,
                background: tokens.blueWash,
                foreground: tokens.blueInk,
              ),
            ),
            const SizedBox(height: Space.lg),
            BrandPanel(
              eyebrow: 'HOSTEL COMMAND · ${SchoolProfile.termLabel.toUpperCase()}',
              title: 'Boarding Wings & Occupancy',
              body:
                  '${boarders.length} boarders housed across ${SchoolProfile.hostels.length} wings (${occupancyPct.toStringAsFixed(0)}% capacity). $presentBoarders of ${boarders.length} boarders checked in today.',
              actionLabel: 'View ${boarders.length} Boarders',
              onAction: onOpenBoarders,
            ),
            const SizedBox(height: Space.lg),
            Row(
              children: [
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenBoarders,
                    child: MetricBlock(
                      value: '${boarders.length}',
                      label: 'Boarders',
                      caption: '$totalCapacity beds',
                    ),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenRollCall,
                    child: MetricBlock(
                      value: '$presentBoarders',
                      label: 'Checked in',
                      caption: '${boarders.length - presentBoarders} absent',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.lg),
            Row(
              children: [
                const Expanded(
                  child: SectionHead(title: '5 Hostel wings', trailing: 'Live occupancy'),
                ),
                TextButton.icon(
                  onPressed: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Boarding_Register.pdf',
                    build: () => ShulePdfService.buildClassRegisterPdf(
                      title: 'Boarding Hostels Register',
                      learners: boarders,
                      attendanceOf: workspace.attendanceFor,
                    ),
                  ),
                  icon: const Icon(Icons.print_rounded, size: 18),
                  label: const Text('Print PDF'),
                ),
              ],
            ),
            const SizedBox(height: Space.sm),
            for (var i = 0; i < SchoolProfile.hostels.length; i++) ...[
              Builder(
                builder: (context) {
                  final wing = SchoolProfile.hostels[i];
                  final occupied = workspace.hostelOccupancy(wing.name);
                  final ratio = wing.capacity == 0 ? 0.0 : occupied / wing.capacity;
                  return ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenBoarders,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const ShuleGlyph(icon: Icons.bed_rounded, size: 40),
                            const SizedBox(width: Space.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(wing.name, style: Theme.of(context).textTheme.titleSmall),
                                  Text(
                                    '${wing.type} · ${wing.block} · ${wing.rooms} rooms · ${wing.warden}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            StatusPill(
                              label: '$occupied/${wing.capacity}',
                              background: tokens.blueWash,
                              foreground: tokens.blueInk,
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.sm),
                        AnimatedStatBar(
                          fraction: ratio,
                          color: tokens.primary,
                          height: 8,
                          delayMs: i * 60,
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        );
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  3. Dedicated Transport Fleet Hub (Role-Based Tab 0 for `TRANSPORT`)       */
/* -------------------------------------------------------------------------- */

class TransportHubView extends StatelessWidget {
  const TransportHubView({
    super.key,
    required this.workspace,
    required this.onOpenRiders,
  });

  final SchoolWorkspace workspace;
  final VoidCallback onOpenRiders;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: workspace,
      builder: (context, _) {
        final riders = workspace.learners.where((l) => l.type != 'Boarder').toList();
        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            BrandBar(
              subtitle: '${SchoolProfile.schoolName.toUpperCase()} · TRANSPORT',
              trailing: StatusPill(
                label: workspace.activeStaff.label,
                background: tokens.blueWash,
                foreground: tokens.blueInk,
              ),
            ),
            const SizedBox(height: Space.lg),
            BrandPanel(
              eyebrow: 'CAMPUS FLEET · ${SchoolProfile.termLabel.toUpperCase()}',
              title: 'School Bus Routes & Riders',
              body:
                  '${riders.length} day scholars assigned across ${SchoolProfile.routes.length} school bus corridors.',
              actionLabel: 'View ${riders.length} Riders',
              onAction: onOpenRiders,
            ),
            const SizedBox(height: Space.lg),
            Row(
              children: [
                const Expanded(
                  child: SectionHead(title: '5 Bus corridors', trailing: 'Live manifest'),
                ),
                TextButton.icon(
                  onPressed: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Transport_Manifest.pdf',
                    build: () => ShulePdfService.buildClassRegisterPdf(
                      title: 'School Transport Riders Manifest',
                      learners: riders,
                      attendanceOf: workspace.attendanceFor,
                    ),
                  ),
                  icon: const Icon(Icons.print_rounded, size: 18),
                  label: const Text('Print PDF'),
                ),
              ],
            ),
            const SizedBox(height: Space.sm),
            for (var i = 0; i < SchoolProfile.routes.length; i++) ...[
              Builder(
                builder: (context) {
                  final route = SchoolProfile.routes[i];
                  final count = workspace.routeRiders(route.name);
                  return ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenRiders,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const ShuleGlyph(icon: Icons.directions_bus_rounded, size: 40),
                            const SizedBox(width: Space.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(route.name, style: Theme.of(context).textTheme.titleSmall),
                                  Text(
                                    '${route.vehicle} · Departs ${route.departureTime} · ${route.driver}',
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            StatusPill(
                              label: '$count riders',
                              background: tokens.blueWash,
                              foreground: tokens.blueInk,
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.sm),
                        AnimatedStatBar(
                          fraction: (count / 24.0).clamp(0.0, 1.0),
                          color: route.status == 'Active' ? tokens.primary : tokens.warning,
                          height: 8,
                          delayMs: i * 60,
                        ),
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        );
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  4. Communications (`/dashboard/communications`)                           */
/* -------------------------------------------------------------------------- */

class CommunicationsScreen extends StatefulWidget {
  const CommunicationsScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<CommunicationsScreen> createState() => _CommunicationsScreenState();
}

class _CommunicationsScreenState extends State<CommunicationsScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'All Guardians';

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _sendBroadcast() async {
    final t = _title.text.trim();
    final b = _body.text.trim();
    if (t.isEmpty || b.isEmpty) return;
    widget.workspace.addAnnouncement(t, b, audience: _audience);
    await ShuleMediaService.requestNotifications();
    await ShuleNotificationService.sendAlert(title: t, body: b);
    _title.clear();
    _body.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Broadcast dispatched to $_audience.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Communications')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: widget.workspace,
          builder: (context, _) {
            final recipients = switch (_audience) {
              'Fee Balance Follow-up' => widget.workspace.learnersWithBalanceCount,
              'Form 4 Guardians' =>
                widget.workspace.learners.where((l) => l.className == 'Form 4').length,
              'All Staff' => SchoolProfile.staffRoster.length,
              _ => widget.workspace.learners.length,
            };

            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                ShuleGlassCard(
                  glowCorner: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text('Compose notice', style: Theme.of(context).textTheme.titleMedium),
                          ),
                          StatusPill(
                            label: '$recipients recipients',
                            background: tokens.blueWash,
                            foreground: tokens.blueInk,
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.md),
                      DropdownButtonFormField<String>(
                        value: _audience,
                        decoration: const InputDecoration(labelText: 'Audience'),
                        items: const [
                          'All Guardians',
                          'Fee Balance Follow-up',
                          'Form 4 Guardians',
                          'All Staff',
                        ]
                            .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                            .toList(),
                        onChanged: (v) => setState(() => _audience = v ?? _audience),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: _title,
                        decoration: const InputDecoration(
                          labelText: 'Subject',
                          hintText: 'e.g. Term 2 Fee Balance Reminder',
                        ),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: _body,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Message',
                          hintText: 'Write your guardian or staff announcement…',
                        ),
                      ),
                      const SizedBox(height: Space.md),
                      GradientButton(
                        label: 'Send broadcast & notification',
                        icon: Icons.send_rounded,
                        onPressed: _sendBroadcast,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                SectionHead(
                  title: 'Recent broadcasts',
                  trailing: '${widget.workspace.announcements.length} messages',
                ),
                const SizedBox(height: Space.sm),
                for (final item in widget.workspace.announcements) ...[
                  ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.title, style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 4),
                        Text(item.body, style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 6),
                        Text('${item.audience} · ${item.timeLabel}', style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.sm),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  5. Canteen POS (`/dashboard/canteen`) — Embedded or Pushed                */
/* -------------------------------------------------------------------------- */

class CanteenScreen extends StatefulWidget {
  const CanteenScreen({
    super.key,
    required this.workspace,
    this.embedded = false,
  });

  final SchoolWorkspace workspace;
  final bool embedded;

  @override
  State<CanteenScreen> createState() => _CanteenScreenState();
}

class _CanteenScreenState extends State<CanteenScreen> {
  String? _selectedLearnerId;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final body = ListenableBuilder(
      listenable: widget.workspace,
      builder: (context, _) {
        final sampleLearners = widget.workspace.learners.take(20).toList();
        final activeId = _selectedLearnerId ?? sampleLearners.first.id;
        final activeLearner = widget.workspace.learners.firstWhere(
          (l) => l.id == activeId,
          orElse: () => sampleLearners.first,
        );
        final totalSales = widget.workspace.canteenSales
            .fold<double>(0, (sum, s) => sum + s.amount);

        return ListView(
          padding: EdgeInsets.fromLTRB(
            Space.lg,
            Space.md,
            Space.lg,
            widget.embedded ? Space.dockClearance : Space.xl,
          ),
          children: [
            if (widget.embedded) ...[
              BrandBar(
                subtitle: '${SchoolProfile.schoolName.toUpperCase()} · CANTEEN POS',
                trailing: StatusPill(
                  label: widget.workspace.activeStaff.label,
                  background: tokens.blueWash,
                  foreground: tokens.blueInk,
                ),
              ),
              const SizedBox(height: Space.lg),
            ],
            ShuleGlassCard(
              glowCorner: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: MetricBlock(
                          value: formatTzs(totalSales),
                          label: 'Canteen sales',
                        ),
                      ),
                      MetricBlock(
                        value: '${widget.workspace.canteenSales.length}',
                        label: 'Baskets',
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  DropdownButtonFormField<String>(
                    value: activeLearner.id,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Select student card'),
                    items: sampleLearners
                        .map(
                          (l) => DropdownMenuItem(
                            value: l.id,
                            child: Text('${l.name} (${l.id})', overflow: TextOverflow.ellipsis),
                          ),
                        )
                        .toList(),
                    onChanged: (v) => setState(() => _selectedLearnerId = v),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'Tap item to charge card', trailing: '8 items'),
            const SizedBox(height: Space.sm),
            Wrap(
              spacing: Space.sm,
              runSpacing: Space.sm,
              children: [
                for (final item in SchoolProfile.canteenMenu)
                  ActionChip(
                    backgroundColor: tokens.blueWash,
                    side: BorderSide(color: tokens.border),
                    avatar: Icon(Icons.restaurant_rounded, size: 16, color: tokens.blueInk),
                    label: Text(
                      '${item.item} · ${formatTzs(item.amount)}',
                      style: TextStyle(color: tokens.blueInk, fontWeight: FontWeight.w700),
                    ),
                    onPressed: () {
                      widget.workspace.recordCanteenSale(
                        learner: activeLearner,
                        menuItem: item,
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Charged ${item.item} to ${activeLearner.name}.'),
                        ),
                      );
                    },
                  ),
              ],
            ),
            const SizedBox(height: Space.lg),
            SectionHead(
              title: 'Recent canteen sales',
              trailing: '${widget.workspace.canteenSales.length} receipts',
            ),
            const SizedBox(height: Space.sm),
            for (final sale in widget.workspace.canteenSales.take(15)) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.fastfood_rounded, size: 38),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sale.studentName, style: Theme.of(context).textTheme.titleSmall),
                          Text('${sale.item} · ${sale.timeLabel}', style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                    Text(
                      formatTzs(sale.amount),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: tokens.blueInk,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        );
      },
    );

    if (widget.embedded) return body;
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Canteen Cards & Baskets')),
      body: ShuleBackdrop(child: body),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  6. Inventory & Assets (`/dashboard/assets`)                               */
/* -------------------------------------------------------------------------- */

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _category = 'All';

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final categories = <String>{'All', ...widget.workspace.assets.map((a) => a.category)}.toList();
    final filtered = _category == 'All'
        ? widget.workspace.assets
        : widget.workspace.assets.where((a) => a.category == _category).toList();
    final totalValue = filtered.fold<double>(0, (sum, a) => sum + a.value);

    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Inventory & Assets')),
      body: ShuleBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
          children: [
            ShuleGlassCard(
              glowCorner: true,
              child: Row(
                children: [
                  Expanded(
                    child: MetricBlock(
                      value: '${filtered.length}',
                      label: 'Assets tracked',
                    ),
                  ),
                  Expanded(
                    child: MetricBlock(
                      value: formatCompactTzs(totalValue),
                      label: 'Valuation',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final cat in categories) ...[
                    ChoicePill(
                      label: cat,
                      selected: _category == cat,
                      onSelected: () => setState(() => _category = cat),
                    ),
                    const SizedBox(width: Space.xs),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            for (final asset in filtered) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.inventory_2_outlined, size: 40),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(asset.name, style: Theme.of(context).textTheme.titleSmall),
                          Text(
                            '${asset.tag} · ${asset.category} · ${asset.location}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: Space.xs,
                            children: [
                              StatusPill(
                                label: asset.status,
                                background: asset.status == 'Operational'
                                    ? tokens.success.withValues(alpha: 0.14)
                                    : tokens.warning.withValues(alpha: 0.16),
                                foreground:
                                    asset.status == 'Operational' ? tokens.success : tokens.warning,
                              ),
                              StatusPill(
                                label: '${asset.condition} · ${formatTzs(asset.value)}',
                                background: tokens.blueWash,
                                foreground: tokens.blueInk,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  7. Shule Guide (`/dashboard/ai-tools`)                                    */
/* -------------------------------------------------------------------------- */

class ShuleGuideScreen extends StatefulWidget {
  const ShuleGuideScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<ShuleGuideScreen> createState() => _ShuleGuideScreenState();
}

class _ShuleGuideScreenState extends State<ShuleGuideScreen> {
  final _input = TextEditingController();
  final List<({String q, String a})> _history = [];

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _ask(String question) {
    final q = question.trim();
    if (q.isEmpty) return;
    final lower = q.toLowerCase();
    final w = widget.workspace;
    String answer;

    if (lower.contains('owe') || lower.contains('balance') || lower.contains('follow')) {
      final top = w.topFollowUpQueue.take(3).map((l) => '${l.name} (${formatTzs(l.balance)})').join(', ');
      answer =
          '${w.learnersWithBalanceCount} learners have an open balance totalling ${formatTzs(w.totalOutstandingFees)} (${w.feeCollectionRate.toStringAsFixed(1)}% collected). Highest balances: $top.';
    } else if (lower.contains('absent') || lower.contains('attend') || lower.contains('present')) {
      final absentNames = w.learners
          .where((l) => w.attendanceFor(l.id) == 'Absent')
          .map((l) => '${l.name} (${l.className})')
          .join(', ');
      answer =
          'Register presence is ${w.attendanceRate.toStringAsFixed(1)}%. ${w.presentCount} present, ${w.lateCount} late, and ${w.absentCount} absent today: $absentNames.';
    } else if (lower.contains('disput') || lower.contains('pending') || lower.contains('ledger')) {
      answer =
          'Finance ledger has ${w.transactions.length} entries: ${w.verifiedReceiptCount} Verified, ${w.pendingReceiptCount} Pending (${formatTzs(w.pendingPaymentsAmount)}), and ${w.disputedReceiptCount} Disputed.';
    } else if (lower.contains('hostel') || lower.contains('board')) {
      answer =
          'There are ${w.boarderCount} boarders across 5 wings (Kilimanjaro, Serengeti, Lake Victoria, Zanzibar, Ruaha) and ${w.dayScholarCount} day scholars across 5 bus routes.';
    } else {
      answer =
          '${SchoolProfile.schoolName} currently manages ${w.learners.length} O-Level learners (Form 1–4), ${w.attendanceRate.toStringAsFixed(1)}% present today, with ${formatCompactTzs(w.totalCollectedFees)} collected and ${formatCompactTzs(w.totalOutstandingFees)} outstanding.';
    }

    setState(() {
      _history.insert(0, (q: q, a: answer));
      _input.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Shule Guide · Local Help')),
      body: ShuleBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
          children: [
            ShuleGlassCard(
              glowCorner: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Ask your live school register', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: Space.xs),
                  Text(
                    'Answers instantly offline from your live 150-learner workspace.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.xs,
                    runSpacing: Space.xs,
                    children: [
                      for (final prompt in const [
                        'Who owes the highest balances?',
                        'Who is absent today?',
                        'How many disputed ledger entries?',
                        'Boarding and transport summary',
                      ])
                        ActionChip(
                          backgroundColor: tokens.blueWash,
                          side: BorderSide(color: tokens.border),
                          label: Text(
                            prompt,
                            style: TextStyle(color: tokens.blueInk, fontWeight: FontWeight.w700),
                          ),
                          onPressed: () => _ask(prompt),
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          onSubmitted: _ask,
                          decoration: const InputDecoration(
                            hintText: 'Ask about balances, attendance, hostels…',
                          ),
                        ),
                      ),
                      const SizedBox(width: Space.xs),
                      IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: tokens.primary,
                          foregroundColor: tokens.onPrimary,
                        ),
                        onPressed: () => _ask(_input.text),
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            for (final item in _history) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.q, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: tokens.blueInk)),
                    const SizedBox(height: 6),
                    Text(item.a, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  8. Audit Trail (`/dashboard/audit`)                                       */
/* -------------------------------------------------------------------------- */

class AuditTrailScreen extends StatelessWidget {
  const AuditTrailScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Audit Trail')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: workspace,
          builder: (context, _) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                Notice(
                  tone: NoticeTone.info,
                  title: 'Who changed what, and when',
                  body:
                      'Every payment, verification, enrolment, attendance change and broadcast is recorded here automatically.',
                ),
                const SizedBox(height: Space.lg),
                for (final entry in workspace.auditTrail) ...[
                  ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const ShuleGlyph(icon: Icons.history_rounded, size: 38),
                        const SizedBox(width: Space.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(entry.action, style: Theme.of(context).textTheme.titleSmall),
                              Text(entry.target, style: Theme.of(context).textTheme.bodySmall),
                              const SizedBox(height: 3),
                              Text(
                                '${entry.actor} · ${entry.timeLabel}',
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.sm),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}
