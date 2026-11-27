/// Settings, Appearance (Auto / Light / Dark), Device Permissions
/// (Notifications, Gallery/Photos, Camera, Printing), Role Switcher & Account.
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

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
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
              '${SchoolProfile.schoolName} · Single-school mobile app',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: Space.lg),
            // Signed-in staff card + quick role switcher
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
                  Text('Switch staff role', style: Theme.of(context).textTheme.labelMedium),
                  const SizedBox(height: Space.xs),
                  Wrap(
                    spacing: Space.xs,
                    runSpacing: Space.xs,
                    children: [
                      for (final role in SchoolProfile.demoRoles)
                        ChoicePill(
                          label: role.label,
                          selected: staff.email == role.email,
                          onSelected: () => widget.workspace.setActiveStaff(role),
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
                    'Choose Auto to follow your phone\'s light or dark theme automatically, or pick Light / Dark manually.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      ChoicePill(
                        label: 'Auto (Phone)',
                        selected: currentMode == ThemeMode.system,
                        onSelected: () => widget.themeController.setMode(ThemeMode.system),
                      ),
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
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              padding: const EdgeInsets.all(Space.md),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => ReportsScreen(workspace: widget.workspace),
                ),
              ),
              child: Row(
                children: [
                  const ShuleGlyph(icon: Icons.print_rounded, size: 42),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Printing & Official PDFs', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                        Text(
                          'Report cards, fee statements, ID cards & class registers',
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
            const SectionHead(title: 'School directory & tools'),
            const SizedBox(height: Space.sm),
            ShuleGlassCard(
              padding: const EdgeInsets.all(Space.md),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const CampusScreen()),
              ),
              child: Row(
                children: [
                  const ShuleGlyph(icon: Icons.domain_rounded, size: 40),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Staff, Hostels & Transport', style: Theme.of(context).textTheme.titleSmall),
                        Text('Contacts, boarding wings & bus routes', style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
                ],
              ),
            ),
            const SizedBox(height: Space.sm),
            if (widget.onShowOnboarding != null) ...[
              const SizedBox(height: Space.sm),
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: widget.onShowOnboarding,
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.slideshow_rounded, size: 40),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Replay welcome tour', style: Theme.of(context).textTheme.titleSmall),
                          Text('View the Shule Altra onboarding screens again', style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
                  ],
                ),
              ),
            ],
          ],
        );
      },
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
                  onPressed: onExtraAction,
                  child: Text(extraActionLabel!),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
