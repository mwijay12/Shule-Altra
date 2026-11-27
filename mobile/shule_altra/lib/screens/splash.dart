/// Phase 1 Animated Brand Splash — pure 60fps vector Shield draw-in, spring
/// Checkmark pop with light haptic tick, and Outfit wordmark fade-up.
///
/// Respects `MediaQuery.disableAnimationsOf(context)` so reduced-motion users
/// see the finished brand mark immediately without movement.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({
    super.key,
    required this.onComplete,
    this.holdDuration = const Duration(milliseconds: 280),
  });

  final VoidCallback onComplete;
  final Duration holdDuration;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1280),
  );
  Timer? _doneTimer;
  bool _started = false;
  bool _hapticFired = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;

    final prefs = MotionPrefs.of(context);
    if (prefs.reduced) {
      _controller.value = 1.0;
      _doneTimer = Timer(const Duration(milliseconds: 120), _finish);
      return;
    }

    _controller.addListener(_onTick);
    _controller.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _doneTimer = Timer(widget.holdDuration, _finish);
      }
    });
    _controller.forward();
  }

  void _onTick() {
    if (!_hapticFired && _controller.value >= 0.56) {
      _hapticFired = true;
      HapticFeedback.lightImpact();
    }
  }

  void _finish() {
    if (!mounted) return;
    widget.onComplete();
  }

  @override
  void dispose() {
    _doneTimer?.cancel();
    _controller.removeListener(_onTick);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);

    final shieldCurve = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.48, curve: Curves2.enter),
    );
    final fillCurve = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.32, 0.58, curve: Curves2.enter),
    );
    final checkDrawCurve = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.50, 0.76, curve: Curves2.enter),
    );
    final checkSpringCurve = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.52, 0.84, curve: Curves2.spring),
    );
    final wordmarkCurve = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.64, 0.96, curve: Curves2.enter),
    );

    return Scaffold(
      backgroundColor: tokens.canvas,
      body: SafeArea(
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, _) {
              final checkScale = 0.72 + (0.28 * checkSpringCurve.value);
              final textOpacity = wordmarkCurve.value.clamp(0.0, 1.0);
              final textOffset = 14.0 * (1.0 - textOpacity);

              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Hero(
                    tag: 'shule-brand-shield',
                    child: Container(
                      width: 108,
                      height: 108,
                      decoration: BoxDecoration(
                        color: tokens.blueWash,
                        borderRadius: BorderRadius.circular(Corners.hero),
                        border: Border.all(color: tokens.border),
                      ),
                      alignment: Alignment.center,
                      child: ShuleShieldMark(
                        size: 68,
                        shieldProgress: shieldCurve.value,
                        fillOpacity: fillCurve.value,
                        checkProgress: checkDrawCurve.value,
                        checkScale: checkScale,
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.xl),
                  Opacity(
                    opacity: textOpacity,
                    child: Transform.translate(
                      offset: Offset(0, textOffset),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Shule Altra',
                            style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                  color: tokens.ink,
                                  letterSpacing: -0.9,
                                ),
                          ),
                          const SizedBox(height: Space.xs),
                          Text(
                            'SCHOOL OPERATIONS · TANZANIA',
                            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                  color: tokens.blueInk,
                                  letterSpacing: 1.4,
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
