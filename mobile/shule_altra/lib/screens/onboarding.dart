/// Single-school Shule Altra onboarding — showcases the official Shule Altra
/// app icon, adaptive Day/Night theme toggle, and leads into dedicated staff
/// sign-in (with zero "Connect my school" multi-tenant clutter).
library;

import 'package:flutter/material.dart';

import '../app/theme_controller.dart';
import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/motion.dart';
import '../design/theme.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.onSignIn,
    required this.onQuickDemo,
    this.themeController,
  });

  /// Opens the dedicated single-school Staff Sign-In screen.
  final VoidCallback onSignIn;

  /// Enters immediately with the Administrator demo session.
  final VoidCallback onQuickDemo;

  /// Optional theme controller for quick Auto / Light / Dark switching.
  final ThemeController? themeController;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pages = PageController();
  int _index = 0;

  static const _slides = <_Slide>[
    _Slide(
      eyebrow: 'SHULE ALTRA · ELIMU KWANZA',
      title: 'Your school,\nin your pocket',
      body:
          'Manage Shule Altra learners, guardians, daily attendance, boarding hostels and TZS fees in one crisp workspace.',
      image: 'assets/images/school_cutout.png',
      icon: Icons.school_rounded,
      badge: 'Form 1 – 4 · Live Workspace',
    ),
    _Slide(
      eyebrow: 'ACADEMICS · FINANCE · PRINTING',
      title: 'Grades, fees &\ninstant PDF print',
      body:
          'Compute NECTA CSEE divisions, record mobile money or bank payments, and print report cards, fee statements and student IDs.',
      image: 'assets/images/learning_cutout.png',
      icon: Icons.print_rounded,
      badge: 'Android Print & PDF Ready',
    ),
    _Slide(
      eyebrow: 'PHOTOS · ALERTS · STAFF ROLES',
      title: 'Built for daily\nschool operations',
      body:
          'Attach learner passport photos from your gallery or camera, receive school notifications, and sign in as Admin, Teacher or Bursar.',
      image: 'assets/images/connection_cutout.png',
      icon: Icons.notifications_active_rounded,
      badge: 'Gallery · Camera · Alerts',
    ),
  ];

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _next() {
    final prefs = MotionPrefs.of(context);
    if (_index < _slides.length - 1) {
      if (prefs.reduced) {
        _pages.jumpToPage(_index + 1);
      } else {
        _pages.nextPage(duration: prefs.base, curve: Curves2.enter);
      }
    } else {
      widget.onSignIn();
    }
  }

  void _cycleTheme() {
    final controller = widget.themeController;
    if (controller == null) return;
    final next = switch (controller.mode) {
      ThemeMode.system => ThemeMode.light,
      ThemeMode.light => ThemeMode.dark,
      ThemeMode.dark => ThemeMode.system,
    };
    controller.setMode(next);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final last = _index == _slides.length - 1;
    final currentMode = widget.themeController?.mode ?? ThemeMode.light;
    final modeLabel = switch (currentMode) {
      ThemeMode.system => 'Auto',
      ThemeMode.light => 'Light',
      ThemeMode.dark => 'Dark',
    };
    final modeIcon = switch (currentMode) {
      ThemeMode.system => Icons.brightness_auto_rounded,
      ThemeMode.light => Icons.light_mode_rounded,
      ThemeMode.dark => Icons.dark_mode_rounded,
    };

    return Scaffold(
      backgroundColor: tokens.canvas,
      body: ShuleBackdrop(
        child: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.lg),
                child: Column(
                  children: [
                    BrandBar(
                      subtitle: SchoolProfile.schoolName.toUpperCase(),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (widget.themeController != null)
                            Semantics(
                              button: true,
                              label: 'Theme mode $modeLabel. Tap to switch.',
                              child: PressableScale(
                                onTap: _cycleTheme,
                                child: Container(
                                  height: 36,
                                  padding: const EdgeInsets.symmetric(horizontal: 10),
                                  decoration: BoxDecoration(
                                    color: tokens.blueWash,
                                    borderRadius: BorderRadius.circular(Corners.pill),
                                    border: Border.all(color: tokens.border),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(modeIcon, size: 15, color: tokens.blueInk),
                                      const SizedBox(width: 5),
                                      Text(
                                        modeLabel,
                                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                              color: tokens.blueInk,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          if (!last) ...[
                            const SizedBox(width: Space.xs),
                            TextButton(
                              onPressed: widget.onSignIn,
                              style: TextButton.styleFrom(
                                minimumSize: const Size(kMinTapTarget, 40),
                                foregroundColor: tokens.blueInk,
                              ),
                              child: const Text('Skip'),
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: Space.md),
                    Expanded(
                      child: PageView.builder(
                        controller: _pages,
                        itemCount: _slides.length,
                        onPageChanged: (i) => setState(() => _index = i),
                        itemBuilder: (context, i) => _SlideView(slide: _slides[i]),
                      ),
                    ),
                    const SizedBox(height: Space.md),
                    _PageDots(count: _slides.length, active: _index),
                    const SizedBox(height: Space.lg),
                    GradientButton(
                      label: last ? 'Sign in to Shule Altra' : 'Next',
                      icon: last ? Icons.login_rounded : Icons.arrow_forward_rounded,
                      onPressed: _next,
                    ),
                    const SizedBox(height: Space.sm),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: widget.onQuickDemo,
                        icon: const Icon(Icons.bolt_rounded, size: 18),
                        label: const Text('Explore with demo account'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Slide {
  const _Slide({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.image,
    required this.icon,
    required this.badge,
  });

  final String eyebrow;
  final String title;
  final String body;
  final String image;
  final IconData icon;
  final String badge;
}

class _SlideView extends StatelessWidget {
  const _SlideView({required this.slide});

  final _Slide slide;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Flagship sapphire glass hero frame with prominent Shule Altra app icon.
                Container(
                  height: 236,
                  decoration: BoxDecoration(
                    gradient: tokens.brandGradient,
                    borderRadius: BorderRadius.circular(Corners.hero),
                    border: Border.all(color: tokens.onGradient.withValues(alpha: 0.18)),
                    boxShadow: shuleShadow(tokens, raised: true),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(Corners.hero),
                    child: Stack(
                      children: [
                        Positioned(
                          right: -28,
                          top: -28,
                          child: Container(
                            width: 170,
                            height: 170,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.11),
                            ),
                          ),
                        ),
                        Positioned(
                          left: -34,
                          bottom: -44,
                          child: Container(
                            width: 150,
                            height: 150,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.08),
                            ),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(Space.lg),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 6,
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.18),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: Colors.white.withValues(alpha: 0.28),
                                        ),
                                      ),
                                      child: const ShuleLogoMark(size: 56, radius: 15),
                                    ),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Shule Altra',
                                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                                color: tokens.onGradient,
                                                fontWeight: FontWeight.w800,
                                              ),
                                        ),
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 10,
                                            vertical: 5,
                                          ),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.18),
                                            borderRadius: BorderRadius.circular(Corners.pill),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                slide.icon,
                                                size: 13,
                                                color: tokens.onGradient,
                                              ),
                                              const SizedBox(width: 5),
                                              Flexible(
                                                child: Text(
                                                  slide.badge,
                                                  maxLines: 1,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: Theme.of(context)
                                                      .textTheme
                                                      .labelSmall
                                                      ?.copyWith(
                                                        color: tokens.onGradient,
                                                        fontWeight: FontWeight.w700,
                                                      ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: Space.sm),
                              Expanded(
                                flex: 5,
                                child: Center(
                                  child: Image.asset(
                                    slide.image,
                                    height: 170,
                                    fit: BoxFit.contain,
                                    errorBuilder: (_, __, ___) => Icon(
                                      slide.icon,
                                      size: 72,
                                      color: tokens.onGradient.withValues(alpha: 0.9),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: Space.xl),
                Align(
                  alignment: Alignment.centerLeft,
                  child: StatusPill(
                    label: slide.eyebrow,
                    background: tokens.blueWash,
                    foreground: tokens.blueInk,
                    uppercase: true,
                  ),
                ),
                const SizedBox(height: Space.md),
                Text(
                  slide.title,
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        height: 1.08,
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: Space.md),
                Text(
                  slide.body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: tokens.inkMuted,
                        height: 1.5,
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

class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.active});

  final int count;
  final int active;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (i) {
        final on = i == active;
        return AnimatedContainer(
          duration: prefs.fast,
          curve: Curves2.standard,
          width: on ? 26 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: on ? tokens.primary : tokens.border,
            borderRadius: BorderRadius.circular(Corners.pill),
          ),
        );
      }),
    );
  }
}
