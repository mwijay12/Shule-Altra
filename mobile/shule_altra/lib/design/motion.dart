/// Shule Altra Motion Spec — disciplined, responsive, reduced-motion safe.
///
/// Motion rules:
///  * Micro-feedback (press scale, haptics): 150ms (`Curves.easeOutCubic`)
///  * State & tab transitions: 240ms (`Curves.easeOutCubic`)
///  * Screen & staggered card reveals: 340ms (`Curves.easeOutCubic`)
///  * Brand shield / checkmark spring pop: 380ms (`Curves.easeOutBack`)
///  * Transform & opacity first (60fps), plus intentional animated values for
///    vector path drawing, count-up figures, and morphing page indicators.
///  * Always honours `MediaQuery.disableAnimationsOf(context)`.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

abstract final class Curves2 {
  static const Curve enter = Curves.easeOutCubic;
  static const Curve exit = Curves.easeInCubic;
  static const Curve spring = Curves.easeOutBack;
  static const Curve bounce = Curves.easeOutBack;
}

@immutable
class MotionPrefs {
  const MotionPrefs({required this.reduced});

  factory MotionPrefs.of(BuildContext context) {
    return MotionPrefs(reduced: MediaQuery.disableAnimationsOf(context));
  }

  final bool reduced;

  /// Micro interaction (press-scale, pill morph).
  Duration get micro => reduced ? Duration.zero : const Duration(milliseconds: 150);

  /// Fast state transition (tab swap, chip selection).
  Duration get fast => reduced ? Duration.zero : const Duration(milliseconds: 220);

  /// Standard reveal (text & card entrance).
  Duration get base => reduced ? Duration.zero : const Duration(milliseconds: 320);

  /// Deliberate emphasis (splash completion, hero hand-off).
  Duration get slow => reduced ? Duration.zero : const Duration(milliseconds: 380);

  /// Spring pop (checkmark / badge confirmation).
  Duration get pop => reduced ? Duration.zero : const Duration(milliseconds: 380);

  /// Stagger interval between sibling elements.
  Duration get stagger => reduced ? Duration.zero : const Duration(milliseconds: 45);

  /// Stagger delay clamped at 6 items so long lists stay immediate.
  Duration delay(int index) {
    if (reduced || index <= 0) return Duration.zero;
    final capped = index > 6 ? 6 : index;
    return stagger * capped;
  }
}

/// Tactile press-scale wrapper (`0.97` scale over 150ms + optional light haptic).
/// Respects reduced motion cleanly.
class PressScale extends StatefulWidget {
  const PressScale({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.97,
    this.haptic = true,
  });

  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final bool haptic;

  @override
  State<PressScale> createState() => _PressScaleState();
}

class _PressScaleState extends State<PressScale> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  void _handleTap() {
    if (widget.onTap == null) return;
    if (widget.haptic) {
      HapticFeedback.lightImpact();
    }
    widget.onTap!();
  }

  @override
  Widget build(BuildContext context) {
    final prefs = MotionPrefs.of(context);
    final activeScale = (!prefs.reduced && _pressed && widget.onTap != null)
        ? widget.scale
        : 1.0;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: widget.onTap == null ? null : (_) => _setPressed(true),
      onTapUp: widget.onTap == null ? null : (_) => _setPressed(false),
      onTapCancel: widget.onTap == null ? null : () => _setPressed(false),
      onTap: widget.onTap == null ? null : _handleTap,
      child: AnimatedScale(
        scale: activeScale,
        duration: prefs.micro,
        curve: Curves2.enter,
        child: widget.child,
      ),
    );
  }
}

/// Subtle staggered entrance: slides up `12px` and fades in once.
/// Under reduced motion, returns `child` directly with zero controller cost.
class Rise extends StatefulWidget {
  const Rise({
    super.key,
    required this.child,
    this.delay = Duration.zero,
    this.offsetY = 12,
  });

  final Widget child;
  final Duration delay;
  final double offsetY;

  @override
  State<Rise> createState() => _RiseState();
}

class _RiseState extends State<Rise> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  Timer? _timer;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final prefs = MotionPrefs.of(context);
    if (prefs.reduced) return;

    final controller = AnimationController(vsync: this, duration: prefs.base);
    _controller = controller;
    if (widget.delay == Duration.zero) {
      controller.forward();
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) return widget.child;

    final curved = CurvedAnimation(parent: controller, curve: Curves2.enter);
    return AnimatedBuilder(
      animation: curved,
      child: widget.child,
      builder: (context, child) {
        final t = curved.value;
        return Opacity(
          opacity: t.clamp(0.0, 1.0),
          child: Transform.translate(
            offset: Offset(0, widget.offsetY * (1 - t)),
            child: child,
          ),
        );
      },
    );
  }
}

/// Subtle spring pop for completion badges & checkmarks.
class StickerPop extends StatefulWidget {
  const StickerPop({
    super.key,
    required this.child,
    this.delay = Duration.zero,
  });

  final Widget child;
  final Duration delay;

  @override
  State<StickerPop> createState() => _StickerPopState();
}

class _StickerPopState extends State<StickerPop> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  Timer? _timer;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    final prefs = MotionPrefs.of(context);
    if (prefs.reduced) return;

    final controller = AnimationController(vsync: this, duration: prefs.pop);
    _controller = controller;
    if (widget.delay == Duration.zero) {
      controller.forward();
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) return widget.child;

    final curved = CurvedAnimation(parent: controller, curve: Curves2.spring);
    return AnimatedBuilder(
      animation: curved,
      child: widget.child,
      builder: (context, child) {
        final scale = 0.84 + 0.16 * curved.value;
        return Opacity(
          opacity: controller.value.clamp(0.0, 1.0),
          child: Transform.scale(scale: scale, child: child),
        );
      },
    );
  }
}
