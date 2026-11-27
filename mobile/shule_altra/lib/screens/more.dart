/// Settings, Appearance (Auto / Light / Dark), Device Permissions
/// (Notifications, Gallery/Photos, Camera, Printing), Role Switcher &
/// full website module launchers.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../app/theme_controller.dart';
import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../services/device_services.dart';
import 'campus.dart';
import 'modules.dart';
import 'reports.dart';

class MoreScreen extends StatefulWidget {
  const MoreScreen({
    super.key,
    required this.session,
    required this.workspace,
    required this.themeController,
    required this.onSignOut,
    this.onShowOnboarding,
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final ThemeController themeController;
  final VoidCallback onSignOut;
  final VoidCallback? onShowOnboarding;

  @override
  State<MoreScreen> createState() => _MoreScreenState();
}

class _MoreScreenState extends State<MoreScreen> {
  DevicePermissionSnapshot _perms = DevicePermissionSnapshot.initial;
  String? _deviceFeedback;

  @override
  void initState() {
    super.initState();
    _refreshPermissions();
  }

  Future<void> _refreshPermissions() async {
    final snap = await ShuleMediaService.readStatus();
    if (!mounted) return;
    setState(() => _perms = snap);
  }

  Future<void> _requestNotificationPerm() async {
    final status = await ShuleMediaService.requestNotifications();
    await _refreshPermissions();
    if (!mounted) return;
    setState(() => _deviceFeedback = 'Notifications permission: $status');
  }

  Future<void> _sendTestAlert() async {
    await ShuleMediaService.requestNotifications();
    final sent = await ShuleNotificationService.sendAlert(
      title: 'Shule Altra Notification Test',
      body: '${SchoolProfile.schoolName} alerts are active on this phone.',
    );
    await _refreshPermissions();
    if (!mounted) return;
    setState(
      () => _deviceFeedback = sent
          ? 'Test school notification sent to your status bar.'
          : 'Notification queued (native status-bar banners appear on Android phones).',
    );
  }

  Future<void> _requestGalleryPerm() async {
    final status = await ShuleMediaService.requestPhotos();
    await _refreshPermissions();
    if (!mounted) return;
    setState(() => _deviceFeedback = 'Gallery & Photos permission: $status');
  }

  Future<void> _requestCameraPerm() async {
    final status = await ShuleMediaService.requestCamera();
    await _refreshPermissions();
    if (!mounted) return;
    setState(() => _deviceFeedback = 'Camera permission: $status');
  }

  void _push(Widget screen) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([widget.workspace, widget.themeController, widget.session]),
      builder: (context, _) {
        final staff = widget.workspace.activeStaff;
        final currentMode = widget.themeController.mode;

        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            Text(
              'More & Settings',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 28),
            ),
            Text(
              '${SchoolProfile.schoolName} · Full website parity',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: Space.lg),
            ShuleGlassCard(
              glowCorner: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const ShuleLogoMark(size: 46),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              staff.fullName,
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15),
                            ),
                            Text(
                              '${staff.title} · ${staff.email}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  Text('Switch staff role (adapts bottom bar)', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: Space.xs),
                  Wrap(
                    spacing: Space.xs,
                    runSpacing: Space.xs,
                    children: [
                      for (final role in SchoolProfile.demoRoles)
                        ChoicePill(
                          label: role.label,
                          selected: staff.email == role.email,
                          onSelected: () {
                            widget.workspace.setActiveStaff(role);
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  'Switched to ${role.label} — bottom navigation updated for ${role.department}.',
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  OutlinedButton.icon(
                    onPressed: widget.onSignOut,
                    icon: const Icon(Icons.logout_rounded, size: 18),
                    label: const Text('Sign out'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.xl),
            const SectionHead(title: 'Appearance', trailing: 'Adapts to phone'),
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Light theme is enabled by default for crisp readability. Switch to Dark or Auto (Phone) anytime.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      ChoicePill(
                        label: 'Light',
                        selected: currentMode == ThemeMode.light,
                        onSelected: () => widget.themeController.setMode(ThemeMode.light),
                      ),
                      ChoicePill(
                        label: 'Dark',
                        selected: currentMode == ThemeMode.dark,
                        onSelected: () => widget.themeController.setMode(ThemeMode.dark),
                      ),
                      ChoicePill(
                        label: 'Auto (Phone)',
                        selected: currentMode == ThemeMode.system,
                        onSelected: () => widget.themeController.setMode(ThemeMode.system),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.xl),
            const SectionHead(title: 'Device permissions', trailing: 'Android ready'),
            const SizedBox(height: Space.sm),
            if (_deviceFeedback != null) ...[
              Notice(
                tone: NoticeTone.done,
                title: 'Device capability',
                body: _deviceFeedback!,
              ),
              const SizedBox(height: Space.sm),
            ],
            _PermissionRow(
              icon: Icons.notifications_active_outlined,
              title: 'Notifications',
              subtitle: 'School notices, attendance reminders & fee alerts',
              status: _perms.notifications,
              onAllow: _requestNotificationPerm,
              extraActionLabel: 'Test alert',
              onExtraAction: _sendTestAlert,
            ),
            const SizedBox(height: Space.sm),
            _PermissionRow(
              icon: Icons.photo_library_outlined,
              title: 'Gallery & Photos',
              subtitle: 'Pick learner passport photos from phone gallery',
              status: _perms.photos,
              onAllow: _requestGalleryPerm,
            ),
            const SizedBox(height: Space.sm),
            _PermissionRow(
              icon: Icons.photo_camera_outlined,
              title: 'Camera',
              subtitle: 'Capture student ID photos on campus',
              status: _perms.camera,
              onAllow: _requestCameraPerm,
            ),
            const SizedBox(height: Space.xl),
            const SectionHead(title: 'All school modules', trailing: 'Website parity'),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.analytics_outlined,
              title: 'Analytics & Forecasts',
              subtitle: 'Outstanding by class, boarders/day split & NECTA divisions',
              onTap: () => _push(AnalyticsScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.campaign_outlined,
              title: 'Communications',
              subtitle: 'Guardian & staff notices with live notifications',
              onTap: () => _push(CommunicationsScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.restaurant_rounded,
              title: 'Canteen Cards & Baskets',
              subtitle: 'POS checkout & recent canteen sales',
              onTap: () => _push(CanteenScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.inventory_2_outlined,
              title: 'Inventory & Assets',
              subtitle: '${widget.workspace.assets.length} tracked institutional assets',
              onTap: () => _push(InventoryScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.domain_rounded,
              title: 'Staff, Hostels & Transport',
              subtitle: '16 staff · 5 boarding wings · 5 school bus routes',
              onTap: () => _push(CampusScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.auto_awesome_rounded,
              title: 'Shule Guide',
              subtitle: 'Ask live questions about balances, attendance & hostels',
              onTap: () => _push(ShuleGuideScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.print_rounded,
              title: 'Printing & Official PDFs',
              subtitle: 'Report cards, fee statements, ID cards & class registers',
              onTap: () => _push(ReportsScreen(workspace: widget.workspace)),
            ),
            const SizedBox(height: Space.sm),
            _ModuleRow(
              icon: Icons.history_rounded,
              title: 'Audit Trail',
              subtitle: '${widget.workspace.auditTrail.length} logged institutional actions',
              onTap: () => _push(AuditTrailScreen(workspace: widget.workspace)),
            ),
            if (widget.onShowOnboarding != null) ...[
              const SizedBox(height: Space.sm),
              _ModuleRow(
                icon: Icons.slideshow_rounded,
                title: 'Replay welcome tour',
                subtitle: 'View the Shule Altra onboarding screens again',
                onTap: widget.onShowOnboarding!,
              ),
            ],
          ],
        );
      },
    );
  }
}

class _ModuleRow extends StatelessWidget {
  const _ModuleRow({
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
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.md),
      onTap: onTap,
      child: Row(
        children: [
          ShuleGlyph(icon: icon, size: 40),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleSmall),
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

class _PermissionRow extends StatelessWidget {
  const _PermissionRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.status,
    required this.onAllow,
    this.extraActionLabel,
    this.onExtraAction,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final String status;
  final VoidCallback onAllow;
  final String? extraActionLabel;
  final VoidCallback? onExtraAction;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final allowed = status == 'Allowed';
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              ShuleGlyph(icon: icon, size: 40),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleSmall),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              StatusPill(
                label: status,
                background: allowed
                    ? tokens.success.withValues(alpha: 0.14)
                    : tokens.blueWash,
                foreground: allowed ? tokens.success : tokens.blueInk,
              ),
            ],
          ),
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.sm,
            runSpacing: Space.xs,
            children: [
              OutlinedButton(
                onPressed: onAllow,
                child: Text(allowed ? 'Recheck permission' : 'Allow $title'),
              ),
              if (extraActionLabel != null && onExtraAction != null)
                FilledButton.tonal(
                  style: FilledButton.styleFrom(
                    backgroundColor: tokens.blueWash,
                    foregroundColor: tokens.blueInk,
                  ),
                  onPressed: onExtraAction,
                  child: Text(
                    extraActionLabel!,
                    style: TextStyle(color: tokens.blueInk, fontWeight: FontWeight.w700),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
