/// Single-school Shule Altra root: adaptive Auto/Light/Dark theme, official
/// app icon onboarding, dedicated Staff Sign-In, and the 4-tab Blue Glass Shell.
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
import '../screens/more.dart';
import '../screens/onboarding.dart';
import '../screens/register.dart';
import '../screens/reports.dart';
import '../screens/school_day.dart';
import '../screens/sign_in.dart';
import '../services/device_services.dart';
import 'session.dart';
import 'theme_controller.dart';

enum AppMode { onboarding, signIn, sample, live, liveUnavailable }

class ShuleApp extends StatefulWidget {
  const ShuleApp({super.key})
      : initialMode = AppMode.onboarding,
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

  /// Null means follow the phone's setting (`ThemeMode.system`) with persisted
  /// user overrides inside More & Settings.
  final ThemeMode? themeMode;

  /// Tests pin the system font scale here. Null follows the phone.
  final double? textScale;

  @override
  State<ShuleApp> createState() => _ShuleAppState();
}

class _ShuleAppState extends State<ShuleApp> {
  late final ThemeController _themeController = ThemeController(
    initial: widget.themeMode ?? ThemeMode.system,
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
                const SizedBox(height: Space.md),
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
                _QuickActionTile(
                  icon: Icons.print_rounded,
                  title: 'Reports & PDF Printing',
                  subtitle: 'Print report cards, fee statements & registers',
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
                  subtitle: 'Campus contacts, wings & school bus routes',
                  onTap: () {
                    Navigator.pop(ctx);
                    Navigator.of(context).push(
                      MaterialPageRoute<void>(builder: (_) => const CampusScreen()),
                    );
                  },
                ),
                const SizedBox(height: Space.xs),
                _QuickActionTile(
                  icon: Icons.brightness_6_rounded,
                  title: 'Theme: ${_themeLabel(_themeController.mode)}',
                  subtitle: 'Tap to cycle Auto (Phone) · Light · Dark',
                  onTap: () {
                    final next = switch (_themeController.mode) {
                      ThemeMode.system => ThemeMode.light,
                      ThemeMode.light => ThemeMode.dark,
                      ThemeMode.dark => ThemeMode.system,
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
        ThemeMode.system => 'Auto (Phone)',
        ThemeMode.light => 'Light',
        ThemeMode.dark => 'Dark',
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
    return switch (_mode) {
      AppMode.onboarding => OnboardingPage(
          onSignIn: _openSignIn,
          onQuickDemo: _enterQuickDemo,
          themeController: _themeController,
        ),
      AppMode.signIn || AppMode.liveUnavailable => SignInScreen(
          session: session,
          workspace: _workspace,
          onAuthenticated: _onAuthenticated,
          onBack: () => setState(() => _mode = AppMode.onboarding),
          themeController: _themeController,
        ),
      AppMode.sample || AppMode.live => _AuthenticatedShell(
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
  }
}

class _AuthenticatedShell extends StatelessWidget {
  const _AuthenticatedShell({
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

  static const _destinations = <ShuleDockItem>[
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
  ];

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final wide = MediaQuery.sizeOf(context).width >= 960;

    final page = switch (tab) {
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
      2 => SchoolDayScreen(
          session: session,
          workspace: workspace,
          initialTab: schoolDayTab,
        ),
      _ => MoreScreen(
          session: session,
          workspace: workspace,
          themeController: themeController,
          onSignOut: onSignOut,
          onShowOnboarding: onReplayOnboarding,
        ),
    };

    final body = AnimatedSwitcher(
      duration: prefs.fast,
      child: KeyedSubtree(key: ValueKey<int>(tab), child: page),
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
                    for (final d in _destinations)
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
                items: _destinations,
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
