/// Motion, held to one rule: the OS decides whether anything moves.
///
/// [MotionPrefs] reads `MediaQuery.disableAnimationsOf`, which is true when the
/// phone's "Remove animations" / "Reduce motion" setting is on. When it is true
/// every duration here becomes zero and every reveal starts already finished,
/// so nothing is hidden waiting for an animation that will not run.
library;

import 'package:flutter/material.dart';

import 'tokens.dart';

@immutable
class MotionPrefs {
  const MotionPrefs({required this.reduced});

  /// Read the current setting. Do not cache this across frames: the setting can
  /// change while the app is open.
  factory MotionPrefs.of(BuildContext context) {
    return MotionPrefs(reduced: MediaQuery.disableAnimationsOf(context));
  }

  /// True when the OS asks for no animation.
  final bool reduced;

  Duration get fast => reduced ? Duration.zero : Motion.fast;
  Duration get base => reduced ? Duration.zero : Motion.base;
  Duration get slow => reduced ? Duration.zero : Motion.slow;
  Duration get pop => reduced ? Duration.zero : Motion.pop;
  Duration get stagger => reduced ? Duration.zero : Motion.stagger;

  /// Stagger index `i`, clamped so a long list does not take seconds to appear.
  Duration delay(int index) {
    if (reduced) return Duration.zero;
    return Motion.stagger * index.clamp(0, 6);
  }
}

/// Fades and lifts a child in once, on first build.
///
/// Geometry only ever moves on `transform` and the fade on `opacity`, which is
/// what keeps a list of these cheap on a low-end phone. The stagger is done by
/// widening the animation and holding still through an [Interval], not by
/// scheduling a timer: a pending timer would outlive a test frame and make
/// `pumpAndSettle` unreliable.
class Rise extends StatefulWidget {
  const Rise({
    super.key,
    required this.child,
    this.index = 0,
    this.distance = 14,
  });

  final Widget child;

  /// Position in a group, used for the stagger.
  final int index;

  /// How far it travels. Kept small: content that flies in is a distraction.
  final double distance;

  @override
  State<Rise> createState() => _RiseState();
}

class _RiseState extends State<Rise> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;

    final prefs = MotionPrefs.of(context);
    if (prefs.reduced) return; // nothing to animate; build() draws it at rest

    final delay = prefs.delay(widget.index);
    final controller = AnimationController(
      vsync: this,
      duration: delay + Motion.slow,
    );
    _controller = controller;
    controller.forward();
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    if (controller == null) return widget.child;

    final begin = controller.duration == Duration.zero
        ? 0.0
        : MotionPrefs.of(context).delay(widget.index).inMicroseconds /
            controller.duration!.inMicroseconds;

    final curve = CurvedAnimation(
      parent: controller,
      curve: Interval(begin, 1, curve: Curves2.enter),
    );

    return AnimatedBuilder(
      animation: curve,
      builder: (context, child) {
        final t = curve.value;
        return Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, widget.distance * (1 - t)),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// The small "ink draws on paper" pop for a doodle.
///
/// Under reduced motion it is simply there, at rest, with no scale change: the
/// drawing itself is never hidden behind a script or an animation.
class StickerPop extends StatefulWidget {
  const StickerPop({super.key, required this.child, this.alignment = Alignment.center});

  final Widget child;
  final Alignment alignment;

  @override
  State<StickerPop> createState() => _StickerPopState();
}

class _StickerPopState extends State<StickerPop> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: Motion.pop,
    value: 0,
  );
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (MotionPrefs.of(context).reduced || MediaQuery.of(context).disableAnimations) {
      _controller.value = 1;
    } else {
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final animation = CurvedAnimation(parent: _controller, curve: Curves2.pop);
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        final scale = 0.86 + 0.14 * animation.value;
        return Opacity(
          opacity: animation.value.clamp(0.0, 1.0),
          child: Transform.scale(scale: scale, alignment: widget.alignment, child: child),
        );
      },
      child: widget.child,
    );
  }
}
