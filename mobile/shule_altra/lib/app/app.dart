/// Shule Altra mobile root: Light theme default (with Light / Dark / Auto toggle),
/// official app icon onboarding, dedicated Staff Sign-In, and Role-Based Dynamic
/// Blue Glass Bottom Navigation adapting to Admin, Hostel Warden, Bursar,
/// Teacher, Transport Coordinator, and Canteen Manager.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data/demo_credentials.dart';
import '../data/demo_school_store.dart';
import '../data/sample_gateway.dart';
import '../data/school_gateway.dart';
import '../design/dock.dart';
import '../design/glass.dart';
import '../design/motion.dart';
import '../design/theme.dart';
import '../design/tokens.dart';
import '../screens/campus.dart';
import '../screens/home.dart';
import '../screens/modules.dart';
import '../screens/more.dart';
import '../screens/onboarding.dart';
import '../screens/register.dart';
import '../screens/reports.dart';
import '../screens/school_day.dart';
import '../screens/sign_in.dart';
import '../screens/splash.dart';
import '../services/device_services.dart';
import 'session.dart';
import 'theme_controller.dart';

enum AppMode { splash, onboarding, signIn, sample, live, liveUnavailable }

class ShuleApp extends StatefulWidget {
  const ShuleApp({super.key})
      : initialMode = AppMode.splash,
        themeMode = null,
        textScale = null,
        _injected = null;

  const ShuleApp.withGateway({
    super.key,
    required SchoolGateway gateway,
    this.initialMode = AppMode.onboarding,
    this.themeMode,
    this.textScale,
  }) : _injected = gateway;

  final SchoolGateway? _injected;
  final AppMode initialMode;

  /// Null defaults to crisp Light theme (`ThemeMode.light`) with persisted
  /// user overrides (Light / Dark / Auto) inside More & Settings.
  final ThemeMode? themeMode;

  /// Tests pin the system font scale here. Null follows the phone.
  final double? textScale;

  @override
  State<ShuleApp> createState() => _ShuleAppState();
}

class _ShuleAppState extends State<ShuleApp> {
  late final ThemeController _themeController = ThemeController(
    initial: widget.themeMode ?? ThemeMode.light,
    persist: widget.themeMode == null,
  );
  late final ThemeData _light = buildTheme(Brightness.light);
  late final ThemeData _dark = buildTheme(Brightness.dark);
  late final SchoolWorkspace _workspace = SchoolWorkspace();

  late AppMode _mode = widget.initialMode;
  AppSession? _session;
  int _tab = 0;
  SchoolDayTab _schoolDayTab = SchoolDayTab.attendance;

  @override
  void initState() {
    super.initState();
    if (widget.themeMode == null) {
      unawaited(_themeController.load());
    }
    unawaited(ShuleNotificationService.initialize());
    _ensureSession();
  }

  AppSession _ensureSession() {
    final existing = _session;
    if (existing != null) return existing;
    final gateway = widget._injected ?? SampleGateway();
    final session = AppSession(gateway);
    unawaited(session.start());
    _session = session;
    return session;
  }

  @override
  void dispose() {
    _session?.dispose();
    _workspace.dispose();
    _themeController.dispose();
    super.dispose();
  }

  void _openSignIn() {
    _ensureSession();
    setState(() => _mode = AppMode.signIn);
  }

  Future<void> _enterQuickDemo() async {
    final session = _ensureSession();
    _workspace.setActiveStaff(SchoolProfile.demoRoles.first);
    if (session.acceptsDemoCredential) {
      await session.signInWithDemo(
        DemoCredentials.demoEmail,
        DemoCredentials.demoPassword,
      );
    }
    if (!mounted) return;
    setState(() {
      _mode = AppMode.sample;
      _tab = 0;
    });
  }

  void _onAuthenticated() {
    setState(() {
      _mode = AppMode.sample;
      _tab = 0;
    });
  }

  Future<void> _signOut() async {
    final session = _session;
    if (session != null) {
      await session.signOut();
    }
    if (!mounted) return;
    setState(() {
      _mode = AppMode.signIn;
      _tab = 0;
    });
  }

  void _openSchoolDay(SchoolDayTab tab) {
    setState(() {
      _schoolDayTab = tab;
      _tab = 2;
    });
  }

  void _openQuickActionsSheet(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final role = _workspace.activeStaff.role;

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
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
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
                Text('Quick school actions', style: Theme.of(ctx).textTheme.headlineSmall),
                Text(
                  'Tailored for ${_workspace.activeStaff.label} (${_workspace.activeStaff.department})',
                  style: Theme.of(ctx).textTheme.bodySmall,
                ),
                const SizedBox(height: Space.md),
                if (role == 'HOSTEL') ...[
                  _QuickActionTile(
                    icon: Icons.bed_rounded,
                    title: 'Boarding Wings & Capacity',
                    subtitle: '5 wings · ${_workspace.boarderCount} boarders housed',
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() => _tab = 0);
                    },
                  ),
                  const SizedBox(height: Space.xs),
                  _QuickActionTile(
                    icon: Icons.groups_rounded,
                    title: 'Boarders Directory',
                    subtitle: 'Inspect wing assignments, guardians & conduct',
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() => _tab = 1);
                    },
                  ),
                  const SizedBox(height: Space.xs),
                ] else ...[
                  _QuickActionTile(
                    icon: Icons.groups_rounded,
                    title: 'Learners & Enrolment',
                    subtitle: 'Search directory, add photos & enrol students',
                    onTap: () {
                      Navigator.pop(ctx);
                      setState(() => _tab = 1);
                    },
                  ),
                  const SizedBox(height: Space.xs),
                ],
                _QuickActionTile(
                  icon: Icons.analytics_outlined,
                  title: 'Animated Analytics',
                  subtitle: 'Collection rings, 7D–TERM trend chart & NECTA divisions',
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => AnalyticsScreen(workspace: _workspace),
                      ),
                    );
                  },
                ),
                const SizedBox(height: Space.xs),
                _QuickActionTile(
                  icon: Icons.print_rounded,
                  title: 'Reports & PDF Printing',
                  subtitle: 'Print Shule Altra report cards, fee statements & registers',
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => ReportsScreen(workspace: _workspace),
                      ),
                    );
                  },
                ),
                const SizedBox(height: Space.xs),
                _QuickActionTile(
                  icon: Icons.domain_rounded,
                  title: 'Staff, Hostels & Transport',
                  subtitle: '16 staff, 5 wings & 5 school bus routes',
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(
                        builder: (_) => CampusScreen(workspace: _workspace),
                      ),
                    );
                  },
                ),
                const SizedBox(height: Space.xs),
                _QuickActionTile(
                  icon: Icons.brightness_6_rounded,
                  title: 'Theme: ${_themeLabel(_themeController.mode)}',
                  subtitle: 'Tap to switch Light · Dark · Auto (Phone)',
                  onTap: () {
                    final next = switch (_themeController.mode) {
                      ThemeMode.light => ThemeMode.dark,
                      ThemeMode.dark => ThemeMode.system,
                      ThemeMode.system => ThemeMode.light,
                    };
                    _themeController.setMode(next);
                    Navigator.pop(ctx);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _themeLabel(ThemeMode mode) => switch (mode) {
        ThemeMode.light => 'Light',
        ThemeMode.dark => 'Dark',
        ThemeMode.system => 'Auto (Phone)',
      };

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _themeController,
      builder: (context, _) {
        return MaterialApp(
          title: 'Shule Altra',
          debugShowCheckedModeBanner: false,
          theme: _light,
          darkTheme: _dark,
          themeMode: _themeController.mode,
          builder: (context, child) {
            final media = MediaQuery.of(context);
            final brightness = Theme.of(context).brightness;
            final overlay = brightness == Brightness.dark
                ? SystemUiOverlayStyle.light.copyWith(
                    statusBarColor: Colors.transparent,
                    systemNavigationBarColor: Colors.transparent,
                  )
                : SystemUiOverlayStyle.dark.copyWith(
                    statusBarColor: Colors.transparent,
                    systemNavigationBarColor: Colors.transparent,
                  );
            final body = AnnotatedRegion<SystemUiOverlayStyle>(
              value: overlay,
              child: child ?? const SizedBox.shrink(),
            );
            if (widget.textScale == null) return body;
            return MediaQuery(
              data: media.copyWith(textScaler: TextScaler.linear(widget.textScale!)),
              child: body,
            );
          },
          home: _buildCurrentRoute(),
        );
      },
    );
  }

  Widget _buildCurrentRoute() {
    final session = _ensureSession();
    final page = switch (_mode) {
      AppMode.splash => SplashScreen(
          key: const ValueKey<AppMode>(AppMode.splash),
          onComplete: () => setState(() => _mode = AppMode.onboarding),
        ),
      AppMode.onboarding => OnboardingPage(
          key: const ValueKey<AppMode>(AppMode.onboarding),
          onSignIn: _openSignIn,
          onQuickDemo: _enterQuickDemo,
          themeController: _themeController,
        ),
      AppMode.signIn || AppMode.liveUnavailable => SignInScreen(
          key: const ValueKey<AppMode>(AppMode.signIn),
          session: session,
          workspace: _workspace,
          onAuthenticated: _onAuthenticated,
          onBack: () => setState(() => _mode = AppMode.onboarding),
          themeController: _themeController,
        ),
      AppMode.sample || AppMode.live => _AuthenticatedShell(
          key: const ValueKey<AppMode>(AppMode.sample),
          session: session,
          workspace: _workspace,
          themeController: _themeController,
          tab: _tab,
          schoolDayTab: _schoolDayTab,
          onSelectTab: (next) => setState(() => _tab = next),
          onOpenSchoolDay: _openSchoolDay,
          onOpenQuickActions: _openQuickActionsSheet,
          onSignOut: _signOut,
          onReplayOnboarding: () => setState(() => _mode = AppMode.onboarding),
        ),
    };

    return Builder(
      builder: (context) {
        final prefs = MotionPrefs.of(context);
        return AnimatedSwitcher(
          duration: prefs.base,
          switchInCurve: Curves2.enter,
          switchOutCurve: Curves2.exit,
          transitionBuilder: (child, animation) {
            if (prefs.reduced) return child;
            final slide = Tween<Offset>(
              begin: const Offset(0.04, 0),
              end: Offset.zero,
            ).animate(animation);
            return FadeTransition(
              opacity: animation,
              child: SlideTransition(position: slide, child: child),
            );
          },
          child: page,
        );
      },
    );
  }
}

/// Role-based navigation shell — automatically adapts the bottom glass dock
/// destinations and pages to the signed-in staff role.
class _AuthenticatedShell extends StatelessWidget {
  const _AuthenticatedShell({
    super.key,
    required this.session,
    required this.workspace,
    required this.themeController,
    required this.tab,
    required this.schoolDayTab,
    required this.onSelectTab,
    required this.onOpenSchoolDay,
    required this.onOpenQuickActions,
    required this.onSignOut,
    required this.onReplayOnboarding,
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final ThemeController themeController;
  final int tab;
  final SchoolDayTab schoolDayTab;
  final ValueChanged<int> onSelectTab;
  final ValueChanged<SchoolDayTab> onOpenSchoolDay;
  final void Function(BuildContext) onOpenQuickActions;
  final VoidCallback onSignOut;
  final VoidCallback onReplayOnboarding;

  List<ShuleDockItem> _destinationsFor(String role) => switch (role) {
        'HOSTEL' => const [
            ShuleDockItem(
              label: 'Hostels',
              icon: Icons.bed_outlined,
              activeIcon: Icons.bed_rounded,
            ),
            ShuleDockItem(
              label: 'Boarders',
              icon: Icons.groups_outlined,
              activeIcon: Icons.groups_rounded,
            ),
            ShuleDockItem(
              label: 'Roll Call',
              icon: Icons.fact_check_outlined,
              activeIcon: Icons.fact_check_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
        'BURSAR' => const [
            ShuleDockItem(
              label: 'Finance',
              icon: Icons.account_balance_wallet_outlined,
              activeIcon: Icons.account_balance_wallet_rounded,
            ),
            ShuleDockItem(
              label: 'Balances',
              icon: Icons.receipt_long_outlined,
              activeIcon: Icons.receipt_long_rounded,
            ),
            ShuleDockItem(
              label: 'Analytics',
              icon: Icons.analytics_outlined,
              activeIcon: Icons.analytics_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
        'TEACHER' => const [
            ShuleDockItem(
              label: 'Academics',
              icon: Icons.workspace_premium_outlined,
              activeIcon: Icons.workspace_premium_rounded,
            ),
            ShuleDockItem(
              label: 'Attendance',
              icon: Icons.fact_check_outlined,
              activeIcon: Icons.fact_check_rounded,
            ),
            ShuleDockItem(
              label: 'Timetable',
              icon: Icons.calendar_today_outlined,
              activeIcon: Icons.calendar_today_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
        'TRANSPORT' => const [
            ShuleDockItem(
              label: 'Routes',
              icon: Icons.directions_bus_outlined,
              activeIcon: Icons.directions_bus_rounded,
            ),
            ShuleDockItem(
              label: 'Riders',
              icon: Icons.groups_outlined,
              activeIcon: Icons.groups_rounded,
            ),
            ShuleDockItem(
              label: 'Roll Call',
              icon: Icons.fact_check_outlined,
              activeIcon: Icons.fact_check_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
        'CANTEEN' => const [
            ShuleDockItem(
              label: 'POS',
              icon: Icons.restaurant_outlined,
              activeIcon: Icons.restaurant_rounded,
            ),
            ShuleDockItem(
              label: 'Cards',
              icon: Icons.badge_outlined,
              activeIcon: Icons.badge_rounded,
            ),
            ShuleDockItem(
              label: 'Analytics',
              icon: Icons.analytics_outlined,
              activeIcon: Icons.analytics_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
        _ => const [
            ShuleDockItem(
              label: 'Home',
              icon: Icons.home_outlined,
              activeIcon: Icons.home_rounded,
            ),
            ShuleDockItem(
              label: 'Learners',
              icon: Icons.groups_outlined,
              activeIcon: Icons.groups_rounded,
            ),
            ShuleDockItem(
              label: 'School Day',
              icon: Icons.calendar_today_outlined,
              activeIcon: Icons.calendar_today_rounded,
            ),
            ShuleDockItem(
              label: 'More',
              icon: Icons.tune_outlined,
              activeIcon: Icons.tune_rounded,
            ),
          ],
      };

  Widget _pageFor(String role) {
    if (tab == 3) {
      return MoreScreen(
        session: session,
        workspace: workspace,
        themeController: themeController,
        onSignOut: onSignOut,
        onShowOnboarding: onReplayOnboarding,
      );
    }

    return switch (role) {
      'HOSTEL' => switch (tab) {
          0 => HostelHubView(
              workspace: workspace,
              onOpenBoarders: () => onSelectTab(1),
              onOpenRollCall: () => onSelectTab(2),
            ),
          1 => RegisterScreen(
              session: session,
              workspace: workspace,
              initialStatusFilter: 'Boarder',
              headerTitle: 'Boarders',
            ),
          _ => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.attendance,
            ),
        },
      'BURSAR' => switch (tab) {
          0 => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.finance,
            ),
          1 => RegisterScreen(
              session: session,
              workspace: workspace,
              initialStatusFilter: 'Owes fees',
              headerTitle: 'Fee Balances',
            ),
          _ => AnalyticsScreen(
              workspace: workspace,
              embedded: true,
            ),
        },
      'TEACHER' => switch (tab) {
          0 => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.academics,
            ),
          1 => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.attendance,
            ),
          _ => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.timetable,
            ),
        },
      'TRANSPORT' => switch (tab) {
          0 => TransportHubView(
              workspace: workspace,
              onOpenRiders: () => onSelectTab(1),
            ),
          1 => RegisterScreen(
              session: session,
              workspace: workspace,
              initialStatusFilter: 'Day',
              headerTitle: 'Bus Riders',
            ),
          _ => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: SchoolDayTab.attendance,
            ),
        },
      'CANTEEN' => switch (tab) {
          0 => CanteenScreen(
              workspace: workspace,
              embedded: true,
            ),
          1 => RegisterScreen(
              session: session,
              workspace: workspace,
              headerTitle: 'Student Cards',
            ),
          _ => AnalyticsScreen(
              workspace: workspace,
              embedded: true,
            ),
        },
      _ => switch (tab) {
          0 => HomeScreen(
              session: session,
              workspace: workspace,
              onOpenLearners: () => onSelectTab(1),
              onOpenSchoolDay: onOpenSchoolDay,
              onOpenMore: () => onSelectTab(3),
            ),
          1 => RegisterScreen(
              session: session,
              workspace: workspace,
            ),
          _ => SchoolDayScreen(
              session: session,
              workspace: workspace,
              initialTab: schoolDayTab,
            ),
        },
    };
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final wide = MediaQuery.sizeOf(context).width >= 960;

    return ListenableBuilder(
      listenable: workspace,
      builder: (context, _) {
        final role = workspace.activeStaff.role;
        final destinations = _destinationsFor(role);
        final page = _pageFor(role);

        final body = AnimatedSwitcher(
          duration: prefs.fast,
          child: KeyedSubtree(key: ValueKey<String>('$role-$tab'), child: page),
        );

        if (wide) {
          return Scaffold(
            backgroundColor: tokens.canvas,
            body: ShuleBackdrop(
              child: SafeArea(
                child: Row(
                  children: [
                    NavigationRail(
                      selectedIndex: tab,
                      onDestinationSelected: onSelectTab,
                      labelType: NavigationRailLabelType.all,
                      backgroundColor: Colors.transparent,
                      destinations: [
                        for (final d in destinations)
                          NavigationRailDestination(
                            icon: Icon(d.icon),
                            selectedIcon: Icon(d.activeIcon),
                            label: Text(d.label),
                          ),
                      ],
                    ),
                    const VerticalDivider(width: 1),
                    Expanded(
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 960),
                          child: body,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: tokens.canvas,
          body: ShuleBackdrop(
            child: Stack(
              children: [
                SafeArea(bottom: false, child: body),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 0,
                  child: ShuleGlassDock(
                    items: destinations,
                    selectedIndex: tab,
                    onSelected: onSelectTab,
                    quickActionTooltip: 'Quick school actions',
                    onQuickAction: () => onOpenQuickActions(context),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
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
