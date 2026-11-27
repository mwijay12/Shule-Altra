/// Command Deck home screen — mirrors `https://shule-direct-pro.vercel.app/dashboard`
/// with exact 150-learner KPIs, disputed ledger alert, top-6 Follow-Up Queue,
/// latest ClickPesa/Accounts office ledger stream, and all 17 website modules.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_school_store.dart';
import '../design/doodles.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';
import 'campus.dart';
import 'learner_detail.dart';
import 'modules.dart';
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
          builder: (ctx, _) => SingleChildScrollView(
            child: Column(
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
                          'Register presence ${workspace.attendanceRate.toStringAsFixed(1)}% · ${workspace.learners.length} learners · ${formatCompactTzs(workspace.totalOutstandingFees)} outstanding.',
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
      ),
    );
  }

  void _push(BuildContext context, Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([workspace, session]),
      builder: (context, _) {
        final staff = workspace.activeStaff;
        final unread = workspace.unreadAnnouncements;
        final followUp = workspace.topFollowUpQueue;
        final disputed = workspace.disputedReceiptCount;

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
              eyebrow: 'COMMAND DECK · ${SchoolProfile.termLabel.toUpperCase()}',
              title: 'Habari za asubuhi, ${staff.label}',
              body:
                  '${SchoolProfile.schoolName} · ${workspace.learners.length} learners (${workspace.boarderCount} boarders, ${workspace.dayScholarCount} day), ${workspace.attendanceRate.toStringAsFixed(1)}% register presence, ${formatCompactTzs(workspace.totalOutstandingFees)} outstanding.',
              actionLabel: 'Open Learners',
              onAction: onOpenLearners,
            ),
            if (disputed > 0) ...[
              const SizedBox(height: Space.md),
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: tokens.warning, size: 22),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: Text(
                        '$disputed disputed ledger ${disputed == 1 ? 'entry' : 'entries'} awaiting finance review',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: tokens.warning,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
                  ],
                ),
              ),
            ],
            const SizedBox(height: Space.lg),
            // Exact 4 Command Deck KPIs matching shule-direct-pro.vercel.app
            Row(
              children: [
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: onOpenLearners,
                    child: MetricBlock(
                      value: '${workspace.learners.length}',
                      label: 'Enrolled',
                      caption: '${workspace.boarderCount} boarders · ${workspace.dayScholarCount} day',
                    ),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: () => onOpenSchoolDay(SchoolDayTab.attendance),
                    child: MetricBlock(
                      value: '${workspace.attendanceRate.toStringAsFixed(1)}%',
                      label: 'Presence',
                      caption: '${workspace.absentCount} absent today',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.sm),
            Row(
              children: [
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                    child: MetricBlock(
                      value: formatCompactTzs(workspace.totalOutstandingFees),
                      label: 'Outstanding',
                      caption: '${workspace.learnersWithBalanceCount} learners',
                    ),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                    child: MetricBlock(
                      value: '${workspace.feeCollectionRate.toStringAsFixed(1)}%',
                      label: 'Fee Collection',
                      caption: '${workspace.verifiedReceiptCount} verified receipts',
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Space.lg),
            // Animated Fee Collections chart right on the Command Deck
            AnimatedFeeTrendCard(workspace: workspace),
            const SizedBox(height: Space.xl),
            // Exact Follow-Up Queue matching live website top 6 balances
            SectionHead(
              title: 'Follow-up queue',
              trailing: 'Top ${followUp.length} balances',
            ),
            const SizedBox(height: Space.sm),
            for (final learner in followUp.take(6)) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: () => showLearnerDetail(
                  context: context,
                  workspace: workspace,
                  learnerId: learner.id,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            learner.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${learner.id} · ${learner.className} · Paid ${formatTzs(workspace.paidFor(learner))}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: Space.xs),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          formatTzs(learner.balance),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                color: tokens.blueInk,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                        Text('Fee statement', style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.xs),
            ],
            const SizedBox(height: Space.lg),
            // Latest Ledger Stream matching website CP-2026-* receipts
            SectionHead(
              title: 'Latest ledger stream',
              trailing: '${workspace.transactions.length} receipts',
            ),
            const SizedBox(height: Space.sm),
            for (final tx in workspace.transactions.take(4)) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.receipt_long_rounded, size: 38),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tx.studentName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          Text(
                            '${tx.controlNumber} · ${tx.paymentMethod} · ${tx.status}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      formatTzs(tx.amount),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: tx.status == 'Disputed' ? tokens.danger : tokens.success,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.xs),
            ],
            const SizedBox(height: Space.xl),
            const SectionHead(title: 'All school modules', trailing: 'Full website parity'),
            const SizedBox(height: Space.md),
            LayoutBuilder(
              builder: (context, constraints) {
                final columns = constraints.maxWidth >= 680 ? 3 : 2;
                const spacing = Space.md;
                final tileWidth = (constraints.maxWidth - spacing * (columns - 1)) / columns;
                final tiles = <Widget>[
                  FeatureTile(
                    doodle: Doodle.building,
                    icon: Icons.groups_rounded,
                    title: 'Students',
                    caption: '${workspace.learners.length} O-Level · Form 1–4',
                    onTap: onOpenLearners,
                  ),
                  FeatureTile(
                    doodle: Doodle.book,
                    icon: Icons.fact_check_rounded,
                    title: 'Attendance',
                    caption: '${workspace.attendanceRate.toStringAsFixed(1)}% daily roll call',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.attendance),
                  ),
                  FeatureTile(
                    doodle: Doodle.receipt,
                    icon: Icons.account_balance_wallet_rounded,
                    title: 'Finance',
                    caption: 'Ledger, ClickPesa & expenses',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.finance),
                  ),
                  FeatureTile(
                    doodle: Doodle.reportCard,
                    icon: Icons.workspace_premium_rounded,
                    title: 'Academics',
                    caption: 'NECTA scores & divisions',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.academics),
                  ),
                  FeatureTile(
                    doodle: Doodle.sparkles,
                    icon: Icons.calendar_today_rounded,
                    title: 'Timetable',
                    caption: 'Weekly Form 1–4 lessons',
                    onTap: () => onOpenSchoolDay(SchoolDayTab.timetable),
                  ),
                  FeatureTile(
                    doodle: Doodle.reportCard,
                    icon: Icons.analytics_outlined,
                    title: 'Analytics',
                    caption: 'By-class balances & trends',
                    onTap: () => _push(context, AnalyticsScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.sparkles,
                    icon: Icons.campaign_outlined,
                    title: 'Communications',
                    caption: 'Guardian & staff notices',
                    onTap: () => _push(context, CommunicationsScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.receipt,
                    icon: Icons.restaurant_rounded,
                    title: 'Canteen POS',
                    caption: 'Student cards & baskets',
                    onTap: () => _push(context, CanteenScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.building,
                    icon: Icons.inventory_2_outlined,
                    title: 'Inventory',
                    caption: '${workspace.assets.length} school assets & stock',
                    onTap: () => _push(context, InventoryScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.building,
                    icon: Icons.domain_rounded,
                    title: 'Hostels & Fleet',
                    caption: '5 wings · 5 bus routes · 16 staff',
                    onTap: () => _push(context, CampusScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.sparkles,
                    icon: Icons.auto_awesome_rounded,
                    title: 'Shule Guide',
                    caption: 'Ask live school register',
                    onTap: () => _push(context, ShuleGuideScreen(workspace: workspace)),
                  ),
                  FeatureTile(
                    doodle: Doodle.reportCard,
                    icon: Icons.print_rounded,
                    title: 'Reports & Audit',
                    caption: 'Official PDFs & audit trail',
                    onTap: () => _push(context, ReportsScreen(workspace: workspace)),
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
              onTap: () => _push(context, AuditTrailScreen(workspace: workspace)),
              child: Row(
                children: [
                  const ShuleGlyph(icon: Icons.history_rounded, size: 40),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Audit trail', style: Theme.of(context).textTheme.titleSmall),
                        Text(
                          '${workspace.auditTrail.length} logged events · Who changed what, and when',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}
