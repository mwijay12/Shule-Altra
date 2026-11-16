/// The app root: theme, gateway choice, onboarding, and the four screens.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../data/firebase_gateway.dart';
import '../data/learner.dart';
import '../data/sample_gateway.dart';
import '../data/school_gateway.dart';
import '../design/motion.dart';
import '../design/theme.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../screens/home.dart';
import '../screens/learner_detail.dart';
import '../screens/more.dart';
import '../screens/onboarding.dart';
import '../screens/register.dart';
import '../screens/school_day.dart';
import 'session.dart';

/// Which data path the app was started with. Chosen before the first frame, and
/// never swapped at runtime: a person must always know whether they are looking
/// at their school or at fictional learners.
enum AppMode { onboarding, sample, live, liveUnavailable }

class ShuleApp extends StatefulWidget {
  const ShuleApp({super.key})
      : initialMode = AppMode.onboarding,
        themeMode = null,
        _injected = null;

  /// A gateway may be injected by a test. When it is, the app starts in
  /// [initialMode] (onboarding unless the test says otherwise), uses that gateway
  /// for the sample path too, and [themeMode] can pin the theme instead of
  /// following the phone.
  const ShuleApp.withGateway({
    super.key,
    required SchoolGateway gateway,
    this.initialMode = AppMode.onboarding,
    this.themeMode,
    this.textScale,
  }) : _injected = gateway;

  final SchoolGateway? _injected;
  final AppMode initialMode;

  /// Null means "follow the phone's setting", which is what ships.
  final ThemeMode? themeMode;

  /// Tests pin the system font scale here. Null follows the phone.
  final double? textScale;

  @override
  State<ShuleApp> createState() => _ShuleAppState();
}

class _ShuleAppState extends State<ShuleApp> {
  late ThemeMode _themeMode = widget.themeMode ?? ThemeMode.system;

  // Built once: a new ThemeData on every tab change would restart Flutter's
  // implicit theme animations and re-lay out the whole app.
  late final ThemeData _light = buildTheme(Brightness.light);
  late final ThemeData _dark = buildTheme(Brightness.dark);
  AppMode? _mode;
  AppSession? _session;
  String? _liveProblem;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
    final injected = widget._injected;
    // Onboarding has no data path yet, so no session is started for it.
    if (injected != null && widget.initialMode != AppMode.onboarding) {
      _startSession(injected);
    }
  }

  void _startSession(SchoolGateway gateway) {
    final session = AppSession(gateway);
    session.start();
    _session = session;
  }

  @override
  void dispose() {
    _session?.dispose();
    super.dispose();
  }

  Future<void> _connectLive() async {
    setState(() {
      _mode = AppMode.live;
      _liveProblem = null;
      _tab = 0;
    });
    try {
      final live = await LiveSchool.boot();
      // An async gap: this widget may be gone by now, and because _session was
      // disposed with it, starting a session here would leak a change notifier.
      if (!mounted) {
        unawaited(live.gateway.dispose());
        return;
      }
      setState(() => _startSession(live.gateway));
    } on GatewayFailure catch (error) {
      if (!mounted) return;
      setState(() {
        _mode = AppMode.liveUnavailable;
        _liveProblem = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _mode = AppMode.liveUnavailable;
        _liveProblem = 'Firebase could not start for a reason this build does not recognise. '
            'Nothing was connected.';
      });
    }
  }

  void _useSample() {
    // A test injects one gateway and both paths use it; the shipped app always
    // gets the real sample gateway here.
    final gateway = widget._injected ?? SampleGateway();
    setState(() {
      _mode = AppMode.sample;
      _liveProblem = null;
      _tab = 0;
      _session?.dispose();
      _session = null;
      _startSession(gateway);
    });
  }

  void _restart() {
    setState(() {
      _session?.dispose();
      _session = null;
      _mode = AppMode.onboarding;
      _liveProblem = null;
      _tab = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Shule Altra',
      debugShowCheckedModeBanner: false,
      theme: _light,
      darkTheme: _dark,
      themeMode: _themeMode,
      // MaterialApp installs the theme; the switch below therefore reads motion
      // preferences from a context that already has both themes available.
      home: Builder(
        builder: (context) {
          final scaled = widget.textScale == null
              ? _screen()
              : MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(widget.textScale!)),
                  child: _screen(),
                );
          return AnimatedSwitcher(
            duration: MotionPrefs.of(context).base,
            child: scaled,
          );
        },
      ),
    );
  }

  Widget _screen() {
    final mode = _mode ?? AppMode.onboarding;
    switch (mode) {
      case AppMode.onboarding:
        return OnboardingPage(
          key: const ValueKey('onboarding'),
          onConnect: _connectLive,
          onTrySample: _useSample,
        );
      case AppMode.liveUnavailable:
        return _LiveUnavailable(
          key: const ValueKey('liveUnavailable'),
          problem: _liveProblem ?? 'This build cannot connect to a school.',
          onSample: _useSample,
          onBack: _restart,
        );
      case AppMode.sample:
      case AppMode.live:
        final session = _session;
        if (session == null) {
          // Connecting: say so, and say which path is being tried.
          return const _Connecting(key: ValueKey('connecting'));
        }
        return _Shell(
          key: ValueKey('shell-${mode.name}'),
          session: session,
          isSample: mode == AppMode.sample,
          tab: _tab,
          isDark: _themeMode == ThemeMode.dark,
          onTab: (value) => setState(() => _tab = value),
          onToggleTheme: () => setState(
            () => _themeMode = _themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark,
          ),
          onRestart: _restart,
        );
    }
  }
}

class _Shell extends StatelessWidget {
  const _Shell({
    super.key,
    required this.session,
    required this.isSample,
    required this.tab,
    required this.isDark,
    required this.onTab,
    required this.onToggleTheme,
    required this.onRestart,
  });

  final AppSession session;
  final bool isSample;
  final int tab;
  final bool isDark;
  final ValueChanged<int> onTab;
  final VoidCallback onToggleTheme;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);

    void openLearner(Learner learner) {
      showLearnerDetail(context, learner: learner, isSample: isSample);
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: AnimatedBuilder(
          animation: session,
          builder: (context, _) => switch (tab) {
            0 => HomeScreen(
                session: session,
                onOpenRegister: () => onTab(1),
                onOpenDay: () => onTab(2),
                onOpenMore: () => onTab(3),
              ),
            1 => RegisterScreen(
                session: session,
                onSignIn: session.signIn,
                onOpenLearner: openLearner,
              ),
            2 => SchoolDayScreen(
                session: session,
                onOpenRegister: () => onTab(1),
              ),
            _ => MoreScreen(
                session: session,
                isSample: isSample,
                onSignOut: session.signOut,
                onRestart: onRestart,
                onToggleTheme: onToggleTheme,
                isDark: isDark,
              ),
          },
        ),
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: tokens.border)),
        ),
        child: NavigationBar(
          selectedIndex: tab,
          onDestinationSelected: onTab,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.grid_view_outlined),
              selectedIcon: Icon(Icons.grid_view_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_outline_rounded),
              selectedIcon: Icon(Icons.people_rounded),
              label: 'Learners',
            ),
            NavigationDestination(
              icon: Icon(Icons.event_note_outlined),
              selectedIcon: Icon(Icons.event_note_rounded),
              label: 'Day',
            ),
            NavigationDestination(
              icon: Icon(Icons.more_horiz_rounded),
              selectedIcon: Icon(Icons.more_horiz_rounded),
              label: 'More',
            ),
          ],
        ),
      ),
    );
  }
}

class _Connecting extends StatelessWidget {
  const _Connecting({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(Space.gutter),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox.square(
                  dimension: 28,
                  child: CircularProgressIndicator(strokeWidth: 2.6),
                ),
                const SizedBox(height: Space.lg),
                Text(
                  'Starting Firebase and checking the connection…',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LiveUnavailable extends StatelessWidget {
  const _LiveUnavailable({
    super.key,
    required this.problem,
    required this.onSample,
    required this.onBack,
  });

  final String problem;
  final VoidCallback onSample;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.gutter, Space.xl, Space.gutter, Space.xxl),
          children: [
            Text('Connecting to your school', style: Theme.of(context).textTheme.displaySmall),
            const SizedBox(height: Space.lg),
            Notice(title: 'This build is not connected', body: problem, tone: NoticeTone.danger),
            const SizedBox(height: Space.xl),
            Text(
              'The live path needs Firebase values that match your school\'s project, an '
              'Android app registered for this package name, and a Google sign-in client for '
              'the same signing key. Until all three exist, nothing here will pretend to '
              'reach a school.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
            ),
            const SizedBox(height: Space.xl),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: onSample,
                child: const Text('Use the sample preview instead'),
              ),
            ),
            const SizedBox(height: Space.sm),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: onBack,
                child: const Text('Back to the start'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
