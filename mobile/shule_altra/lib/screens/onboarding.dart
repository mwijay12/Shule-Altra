/// The first thing anyone sees.
///
/// Three pages, one promise on each, and a fourth button that is not a promise:
/// the sample preview. The last page is where a school is actually connected, so
/// the two paths — real account and fictional sample — are chosen here, once, in
/// the open, and the app can never drift from one into the other later.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../data/onboarding_store.dart';

import '../design/doodles.dart';
import '../design/motion.dart';
import '../design/theme.dart' show shuleShadow;
import '../design/tokens.dart';
import '../design/widgets.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.onConnect,
    required this.onTrySample,
    this.store,
  });

  /// "Connect my school": try the live gateway.
  final VoidCallback onConnect;

  /// "Explore the sample preview": the labelled fictional preview.
  final VoidCallback onTrySample;

  /// Null disables persistence for injected test apps.
  final OnboardingStore? store;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  int _index = 0;
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    if (widget.store != null) {
      _loading = true;
      unawaited(_loadIntroduction());
    }
  }

  Future<void> _loadIntroduction() async {
    var seen = false;
    try {
      seen = await widget.store!.hasSeenIntroduction();
    } catch (_) {
      // If local preferences are unavailable, show the introduction again.
    }
    if (!mounted) return;
    setState(() {
      _index = seen ? _pages.length - 1 : 0;
      _loading = false;
    });
  }

  Future<void> _rememberIntroduction() async {
    try {
      await widget.store?.markIntroductionSeen();
    } catch (_) {
      // A storage failure must not block the user's choice or connection.
    }
  }

  void _goTo(int index) {
    setState(() => _index = index);
    if (index == _pages.length - 1) unawaited(_rememberIntroduction());
  }

  static const _pages = <({String lead, String title, String body, Doodle doodle})>[
    (
      lead: 'YOUR SCHOOL, CLOSER',
      title: 'Every learner,\nwhere you can see them.',
      body: 'The register you already keep on the web, on the phone in your pocket. '
          'Classes, guardians and balances, without a laptop.',
      doodle: Doodle.book,
    ),
    (
      lead: 'BUILT FOR THE DAY',
      title: 'Not another\ndashboard to learn.',
      body: 'One screen for the register, one for the school day, one for the '
          'details. If you can read a class list, you can use this.',
      doodle: Doodle.registers,
    ),
    (
      lead: 'HONEST BY DEFAULT',
      title: 'Read-only,\nand it says so.',
      body: 'This pilot reads the register and writes nothing. Attendance here is '
          'practice. Offline recording is not built yet, and the app will never '
          'pretend otherwise.',
      doodle: Doodle.reportCard,
    ),
  ];

  void _next() {
    if (_index == _pages.length - 1) {
      widget.onConnect();
      return;
    }
    _goTo(_index + 1);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading introduction')));
    }
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final page = _pages[_index];
    final last = _index == _pages.length - 1;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.xl),
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: constraints.maxHeight - Space.xxl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const BrandBar(),
                  const SizedBox(height: Space.xxl),
                  StickerPop(
                    child: SizedBox(
                      width: double.infinity,
                      child: AspectRatio(
                        aspectRatio: 1.16,
                        child: DecoratedBox(
                          // The brand ramp, not a grey placeholder: the first
                          // screen is the only chance to say what this product
                          // looks like, and a muted box says nothing.
                          decoration: BoxDecoration(
                            gradient: tokens.brandGradient,
                            borderRadius: BorderRadius.circular(Corners.hero),
                            boxShadow: shuleShadow(tokens, raised: true),
                          ),
                          child: Center(
                            child: AnimatedSwitcher(
                              duration: prefs.base,
                              transitionBuilder: (child, animation) => FadeTransition(
                                opacity: animation,
                                child: child,
                              ),
                              child: Image.asset(
                                const [
                                  'assets/images/school_cutout.png',
                                  'assets/images/learning_cutout.png',
                                  'assets/images/connection_cutout.png',
                                ][_index],
                                key: ValueKey(_index),
                                fit: BoxFit.contain,
                                excludeFromSemantics: true,
                                errorBuilder: (context, error, stackTrace) => DoodleView(
                                  doodle: page.doodle,
                                  size: 132,
                                  strokeWidth: 3.4,
                                  color: tokens.onGradient,
                                  fillColor: tokens.onGradient.withValues(alpha: 0.18),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.xxl),
                  AnimatedSwitcher(
                    duration: prefs.base,
                    switchInCurve: Curves2.enter,
                    transitionBuilder: (child, animation) => FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, 0.06),
                          end: Offset.zero,
                        ).animate(animation),
                        child: child,
                      ),
                    ),
                    child: Column(
                      key: ValueKey(_index),
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(page.lead, style: Theme.of(context).textTheme.labelSmall),
                        const SizedBox(height: Space.md),
                        Text(page.title, style: Theme.of(context).textTheme.displaySmall),
                        const SizedBox(height: Space.md),
                        Text(
                          page.body,
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: tokens.inkMuted),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.xl),
                  Semantics(
                    label: 'Page ${_index + 1} of ${_pages.length}',
                    child: Row(
                      children: [
                        for (var i = 0; i < _pages.length; i++)
                          AnimatedContainer(
                            duration: prefs.fast,
                            curve: Curves2.standard,
                            margin: const EdgeInsets.only(right: Space.sm),
                            height: 8,
                            width: i == _index ? 26 : 8,
                            decoration: BoxDecoration(
                              color: i == _index ? tokens.primary : tokens.border,
                              borderRadius: BorderRadius.circular(Corners.pill),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.xl),
                  GradientButton(
                    label: last ? 'Connect my school' : 'Continue',
                    onPressed: _next,
                    icon: last ? Icons.school_outlined : null,
                  ),
                  if (!last)
                    TextButton(
                      onPressed: () => _goTo(_pages.length - 1),
                      child: const Text('Skip introduction'),
                    ),
                  if (last) ...[
                    const SizedBox(height: Space.sm),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: widget.onTrySample,
                        child: const Text('Explore the sample preview'),
                      ),
                    ),
                  ],
                  const SizedBox(height: Space.lg),
                  Text(
                    'The sample preview uses fictional learners. This pilot has no '
                    'payments, no offline capture and no writes.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
