/// Command Deck home screen — mirrors the Shule Altra web dashboard for
/// Mwalimu Nyerere Secondary School with live KPIs, notifications bell,
/// full website module navigation, and announcements.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_school_store.dart';
import '../design/doodles.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../services/device_services.dart';
import 'campus.dart';
import 'reports.dart';
import 'school_day.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.session,
    required this.workspace,
    required this.onOpenLearners,
    required this.onOpenSchoolDay,
    required this.onOpenMore,
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final VoidCallback onOpenLearners;
  final ValueChanged<SchoolDayTab> onOpenSchoolDay;
  final VoidCallback onOpenMore;

  void _openNotificationsSheet(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: tokens.canvas,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(Corners.hero)),
          border: Border.all(color: tokens.glassBorder),
        ),
        padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
        child: ListenableBuilder(
          listenable: workspace,
          builder: (ctx, _) => Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 4.5,
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
                    child: Text('School notifications', style: Theme.of(ctx).textTheme.headlineSmall),
                  ),
                  TextButton(
                    onPressed: workspace.markAllAnnouncementsRead,
                    child: const Text('Mark read'),
                  ),
                ],
              ),
              const SizedBox(height: Space.sm),
              for (final item in workspace.announcements.take(5)) ...[
                ShuleGlassCard(
                  padding: const EdgeInsets.all(Space.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              item.title,
                              style: Theme.of(ctx).textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ),
                          if (item.unread)
                            StatusPill(
                              label: 'NEW',
                              background: tokens.blueWash,
                              foreground: tokens.blueInk,
                              uppercase: true,
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(item.body, style: Theme.of(ctx).textTheme.bodySmall),
                      const SizedBox(height: 4),
                      Text(
                        '${item.audience} · ${item.timeLabel}',
                        style: Theme.of(ctx).textTheme.labelSmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.sm),
              ],
              const SizedBox(height: Space.sm),
              GradientButton(
                label: 'Send test phone notification',
                icon: Icons.notifications_active_rounded,
                onPressed: () async {
                  await ShuleMediaService.requestNotifications();
                  final sent = await ShuleNotificationService.sendAlert(
                    title: 'Shule Altra · ${SchoolProfile.schoolName}',
                    body:
                        'Attendance is at ${workspace.attendanceRate.toStringAsFixed(0)}% today with ${workspace.learners.length} active learners.',
                  );
                  if (!ctx.mounted) return;
                  ScaffoldMessenger.of(ctx).showSnackBar(
                    SnackBar(
                      content: Text(
                        sent
                            ? 'Sent Android notification.'
                            : 'Notification triggered (native alerts appear on Android devices).',
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([workspace, session]),
      builder: (context, _) {
        final staff = workspace.activeStaff;
        final unread = workspace.unreadAnnouncements;

        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            BrandBar(
              subtitle: SchoolProfile.schoolName.toUpperCase(),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  StatusPill(
                    label: staff.label,
                    background: tokens.blueWash,
                    foreground: tokens.blueInk,
                  ),
                  const SizedBox(width: Space.xs),
                  Semantics(
                    button: true,
                    label: 'Notifications ($unread unread)',
                    child: InkWell(
                      borderRadius: BorderRadius.circular(Corners.pill),
                      onTap: () => _openNotificationsSheet(context),
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: tokens.innerSurface,
                              shape: BoxShape.circle,
                              border: Border.all(color: tokens.border),
                            ),
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.notifications_none_rounded,
                              size: 20,
                              color: tokens.blueInk,
                            ),
                          ),
                          if (unread > 0)
                            Positioned(
                              right: -2,
                              top: -2,
                              child: Container(
                                width: 18,
                                height: 18,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: tokens.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '$unread',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            BrandPanel(
              eyebrow: '${SchoolProfile.termLabel.toUpperCase()} · ${staff.title.toUpperCase()}',
              title: SchoolProfile.schoolName,
              body:
                  'Welcome back, ${staff.fullName}. ${workspace.learners.length} learners enrolled, ${workspace.attendanceRate.toStringAsFixed(0)}% present today and ${workspace.feeCollectionRate.toStringAsFixed(0)}% of Term 2 fees collected.',
              actionLabel: 'Open Learners',
              onAction: onOpenLearners,
            ),
            const SizedBox(height: Space.lg),
            // Live KPI trio matching web Command Deck
            Row(
              children: [
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenLearners,
                    child: MetricBlock(
                      value: '${workspace.learners.length}',
                      label: 'Learners',
                      caption: 'Form 1–4',
                    ),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: () => onOpenSchoolDay(SchoolDayTab.attendance),
                    child: MetricBlock(
                      value: '${workspace.attendanceRate.toStringAsFixed(0)}%',
                      label: 'Present',
                      caption: '${workspace.presentCount} today',
                    ),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                    child: MetricBlock(
                      value: '${workspace.feeCollectionRate.toStringAsFixed(0)}%',
                      label: 'Fees paid',
                      caption: 'Term 2',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.xl),
            const SectionHead(title: 'School workspace', trailing: 'Website parity'),
            const SizedBox(height: Space.md),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth >= 680 ? 3 : 2;
                const spacing = Space.md;
                final tileWidth = (constraints.maxWidth - spacing * (columns - 1)) / columns;
                final tiles = <Widget>[
                  FeatureTile(
                    doodle: Doodle.backpack,
                    icon: Icons.groups_rounded,
                    title: 'Learners',
                    caption: 'Directory, enrolment, photos & IDs',
                    onTap: onOpenLearners,
                  ),
                  FeatureTile(
                    doodle: Doodle.pencil,
                    icon: Icons.fact_check_rounded,
                    title: 'Attendance',
                    caption: 'Form 1–4 daily roll call',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.attendance),
                  ),
                  FeatureTile(
                    doodle: Doodle.book,
                    icon: Icons.account_balance_wallet_rounded,
                    title: 'Finance',
                    caption: 'TZS payments & defaulters',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                  ),
                  FeatureTile(
                    doodle: Doodle.sparkles,
                    icon: Icons.workspace_premium_rounded,
                    title: 'Academics',
                    caption: 'NECTA grades & divisions',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.academics),
                  ),
                  FeatureTile(
                    doodle: Doodle.paperPlane,
                    icon: Icons.calendar_today_rounded,
                    title: 'Timetable',
                    caption: 'Weekly Form 1–4 schedule',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.timetable),
                  ),
                  FeatureTile(
                    doodle: Doodle.sparkles,
                    icon: Icons.print_rounded,
                    title: 'Reports & Print',
                    caption: 'Official PDF report cards & registers',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ReportsScreen(workspace: workspace),
                      ),
                    ),
                  ),
                ];

                return Wrap(
                  spacing: spacing,
                  runSpacing: spacing,
                  children: [
                    for (final tile in tiles) SizedBox(width: tileWidth, child: tile),
                  ],
                );
              },
            ),
            const SizedBox(height: Space.lg),
            ShuleGlassCard(
              padding: const EdgeInsets.all(Space.md),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const CampusScreen()),
              ),
              child: Row(
                children: [
                  const ShuleGlyph(icon: Icons.domain_rounded, size: 42),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Staff, Hostels & Transport', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                        Text(
                          '8 staff · 4 boarding wings · 4 school bus routes',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
                ],
              ),
            ),
            const SizedBox(height: Space.xl),
            SectionHead(
              title: 'Announcements',
              trailing: unread > 0 ? '$unread new' : 'All read',
            ),
            const SizedBox(height: Space.sm),
            for (final ann in workspace.announcements.take(2)) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: () => _openNotificationsSheet(context),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(ann.title, style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 3),
                    Text(ann.body, style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 4),
                    Text('${ann.audience} · ${ann.timeLabel}', style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        );
      },
    );
  }
}
