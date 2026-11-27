/// Phase 1 Flat/Duotone Blue Parallax Onboarding for Shule Altra.
///
/// Highlights:
///  * Zero purple/violet gradients, zero stock 3D renders, zero AI-slop glass.
///  * Three bespoke flat/duotone cobalt & azure vector scenes with live
///    horizontal parallax driven by `PageController` (transform-only 60fps).
///  * Staggered text reveal on each page change (`180–320ms`, `easeOutCubic`).
///  * Morphing cobalt pill page indicator + `HapticFeedback.selectionClick()`.
///  * Smooth `Hero(tag: 'shule-brand-shield')` hand-off into Staff Sign-In.
///  * Strictly honours `MediaQuery.disableAnimationsOf(context)`.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app/theme_controller.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

enum _SlideScene { command, documents, roles }

class _OnboardingSlide {
  const _OnboardingSlide({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.scene,
    required this.metrics,
  });

  final String eyebrow;
  final String title;
  final String body;
  final _SlideScene scene;
  final List<String> metrics;
}

const List<_OnboardingSlide> _slides = <_OnboardingSlide>[
  _OnboardingSlide(
    eyebrow: 'SCHOOL COMMAND DESK',
    title: 'Your school,\nin clear view.',
    body:
        'Follow daily attendance, fee collections, and NECTA CSEE performance across Form 1 to Form 4 from one reliable workspace.',
    scene: _SlideScene.command,
    metrics: ['150 learners', '96.7% present', 'Form 1–4'],
  ),
  _OnboardingSlide(
    eyebrow: 'OFFICIAL DOCUMENTS & PDFS',
    title: 'Instant PDF print\nin one tap.',
    body:
        'Generate official Shule Altra report cards, TZS fee statements, ID cards, and timetables ready for Android printing or sharing.',
    scene: _SlideScene.documents,
    metrics: ['Report cards', 'Fee statements', 'Student IDs'],
  ),
  _OnboardingSlide(
    eyebrow: 'ROLE-BASED WORKSPACES',
    title: 'Tailored to every\nschool role.',
    body:
        'Every staff member gets tools built for their daily desk — from Head Master and Bursar to Hostel Warden, Teacher, Transport, and Canteen.',
    scene: _SlideScene.roles,
    metrics: ['6 staff roles', 'Offline-ready', 'ClickPesa'],
  ),
];

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.onSignIn,
    required this.onQuickDemo,
    this.themeController,
  });

  final VoidCallback onSignIn;
  final VoidCallback onQuickDemo;
  final ThemeController? themeController;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  double _pageOffset = 0.0;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  void _onScroll() {
    if (!_controller.hasClients) return;
    final next = _controller.page ?? _page.toDouble();
    if ((next - _pageOffset).abs() > 0.001) {
      setState(() => _pageOffset = next);
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onScroll);
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < _slides.length - 1) {
      HapticFeedback.selectionClick();
      final prefs = MotionPrefs.of(context);
      if (prefs.reduced) {
        _controller.jumpToPage(_page + 1);
      } else {
        _controller.animateToPage(
          _page + 1,
          duration: prefs.base,
          curve: Curves2.enter,
        );
      }
    } else {
      HapticFeedback.lightImpact();
      widget.onSignIn();
    }
  }

  void _cycleTheme() {
    final ctrl = widget.themeController;
    if (ctrl == null) return;
    HapticFeedback.selectionClick();
    final next = switch (ctrl.mode) {
      ThemeMode.light => ThemeMode.dark,
      ThemeMode.dark => ThemeMode.system,
      ThemeMode.system => ThemeMode.light,
    };
    ctrl.setMode(next);
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final prefs = MotionPrefs.of(context);
    final themeCtrl = widget.themeController;
    final isLast = _page == _slides.length - 1;

    return Scaffold(
      backgroundColor: tokens.canvas,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top brand header with Hero Shield + Theme toggle + Skip
                Padding(
                  padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xs),
                  child: Row(
                    children: [
                      const Hero(
                        tag: 'shule-brand-shield',
                        child: ShuleLogoMark(size: 40),
                      ),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Shule Altra',
                              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.4,
                                    height: 1.1,
                                  ),
                            ),
                            Text(
                              'SCHOOL MANAGEMENT',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: tokens.blueInk,
                                    fontSize: 10,
                                    letterSpacing: 1.1,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      if (themeCtrl != null)
                        ListenableBuilder(
                          listenable: themeCtrl,
                          builder: (context, _) {
                            final icon = switch (themeCtrl.mode) {
                              ThemeMode.system => Icons.brightness_auto_rounded,
                              ThemeMode.light => Icons.light_mode_rounded,
                              ThemeMode.dark => Icons.dark_mode_rounded,
                            };
                            return IconButton(
                              tooltip: 'Switch appearance',
                              onPressed: _cycleTheme,
                              icon: Icon(icon, color: tokens.inkMuted, size: 22),
                            );
                          },
                        ),
                      if (!isLast)
                        TextButton(
                          onPressed: () {
                            HapticFeedback.selectionClick();
                            widget.onSignIn();
                          },
                          child: const Text('Skip'),
                        ),
                    ],
                  ),
                ),

                // Swipeable Flat/Duotone Blue Parallax Canvas
                Expanded(
                  child: PageView.builder(
                    controller: _controller,
                    itemCount: _slides.length,
                    onPageChanged: (index) {
                      if (index != _page) {
                        HapticFeedback.selectionClick();
                        setState(() => _page = index);
                      }
                    },
                    itemBuilder: (context, index) {
                      final item = _slides[index];
                      final delta = prefs.reduced ? 0.0 : (index - _pageOffset).clamp(-1.0, 1.0);
                      return SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.md),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _FlatBlueStage(
                              scene: item.scene,
                              parallaxDelta: delta,
                              metrics: item.metrics,
                            ),
                            const SizedBox(height: Space.xl),
                            // Staggered text reveal (eyebrow -> Outfit display -> Plus Jakarta body)
                            KeyedSubtree(
                              key: ValueKey<int>(_page == index ? index : -index - 1),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Rise(
                                    delay: Duration.zero,
                                    offsetY: 8,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: Space.md,
                                        vertical: 5,
                                      ),
                                      decoration: BoxDecoration(
                                        color: tokens.blueWash,
                                        borderRadius: BorderRadius.circular(Corners.chip),
                                        border: Border.all(color: tokens.border),
                                      ),
                                      child: Text(
                                        item.eyebrow,
                                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                                              color: tokens.blueInk,
                                              letterSpacing: 1.0,
                                            ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: Space.md),
                                  Rise(
                                    delay: prefs.delay(1),
                                    offsetY: 12,
                                    child: Text(
                                      item.title,
                                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                                            fontSize: 32,
                                            height: 1.1,
                                          ),
                                    ),
                                  ),
                                  const SizedBox(height: Space.md),
                                  Rise(
                                    delay: prefs.delay(2),
                                    offsetY: 12,
                                    child: Text(
                                      item.body,
                                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                                            color: tokens.inkMuted,
                                          ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

                // Morphing cobalt pill indicator + disciplined primary/secondary CTAs
                Padding(
                  padding: const EdgeInsets.fromLTRB(Space.lg, Space.xs, Space.lg, Space.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          for (var i = 0; i < _slides.length; i++) ...[
                            AnimatedContainer(
                              duration: prefs.fast,
                              curve: Curves2.enter,
                              height: 7,
                              width: i == _page ? 32 : 8,
                              decoration: BoxDecoration(
                                color: i == _page ? tokens.primary : tokens.glassBorder,
                                borderRadius: BorderRadius.circular(Corners.pill),
                              ),
                            ),
                            if (i < _slides.length - 1) const SizedBox(width: Space.sm),
                          ],
                          const Spacer(),
                          Text(
                            '0${_page + 1} / 0${_slides.length}',
                            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                  color: tokens.inkMuted,
                                  fontFeatures: const [FontFeature.tabularFigures()],
                                ),
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.lg),
                      GradientButton(
                        label: isLast ? 'Sign in to Shule Altra' : 'Next',
                        icon: isLast ? Icons.login_rounded : Icons.arrow_forward_rounded,
                        onPressed: _next,
                      ),
                      const SizedBox(height: Space.sm),
                      SizedBox(
                        height: 48,
                        child: OutlinedButton(
                          onPressed: () {
                            HapticFeedback.lightImpact();
                            widget.onQuickDemo();
                          },
                          child: const Text('Explore with demo account'),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Flat/Duotone Blue Vector Illustration Stage with live horizontal parallax.
class _FlatBlueStage extends StatelessWidget {
  const _FlatBlueStage({
    required this.scene,
    required this.parallaxDelta,
    required this.metrics,
  });

  final _SlideScene scene;
  final double parallaxDelta;
  final List<String> metrics;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final bgShift = parallaxDelta * 18;
    final fgShift = parallaxDelta * 36;

    return Container(
      height: 248,
      decoration: BoxDecoration(
        color: tokens.surface,
        borderRadius: BorderRadius.circular(Corners.hero),
        border: Border.all(color: tokens.border, width: 1.2),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Layer 1 (Background architectural grid & duotone wash — slow parallax)
          Positioned.fill(
            child: Transform.translate(
              offset: Offset(bgShift, 0),
              child: CustomPaint(
                painter: _DuotoneBackdropPainter(
                  wash: tokens.blueWash,
                  soft: tokens.glowSoft,
                  line: tokens.border,
                ),
              ),
            ),
          ),
          // Layer 2 (Foreground bespoke flat/duotone blue vector scene — faster parallax)
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.lg, Space.lg, 48),
              child: Transform.translate(
                offset: Offset(fgShift, 0),
                child: CustomPaint(
                  painter: _DuotoneScenePainter(
                    scene: scene,
                    primary: tokens.primary,
                    deep: tokens.blueHeroStart,
                    azure: tokens.glowDeep,
                    soft: tokens.glowSoft,
                    wash: tokens.blueWash,
                    surface: tokens.surface,
                    ink: tokens.ink,
                    onPrimary: tokens.onPrimary,
                    border: tokens.border,
                  ),
                ),
              ),
            ),
          ),
          // Bottom crisp metric pills (zero clutter, clear product vocabulary)
          Positioned(
            left: Space.md,
            right: Space.md,
            bottom: Space.md,
            child: Wrap(
              spacing: Space.sm,
              runSpacing: Space.xs,
              alignment: WrapAlignment.center,
              children: [
                for (final label in metrics)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: tokens.surface,
                      borderRadius: BorderRadius.circular(Corners.chip),
                      border: Border.all(color: tokens.border),
                    ),
                    child: Text(
                      label,
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: tokens.blueInk,
                            letterSpacing: 0.2,
                          ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _DuotoneBackdropPainter extends CustomPainter {
  const _DuotoneBackdropPainter({
    required this.wash,
    required this.soft,
    required this.line,
  });

  final Color wash;
  final Color soft;
  final Color line;

  @override
  void paint(Canvas canvas, Size size) {
    // Soft geometric quarter-disc top right
    canvas.drawCircle(
      Offset(size.width * 0.88, size.height * 0.16),
      size.height * 0.44,
      Paint()..color = wash,
    );
    // Subtle secondary disc bottom left
    canvas.drawCircle(
      Offset(size.width * 0.14, size.height * 0.86),
      size.height * 0.30,
      Paint()..color = soft.withValues(alpha: 0.45),
    );
    // Crisp architectural dot grid (flat editorial craft)
    final dotPaint = Paint()..color = line;
    for (var x = 24.0; x < size.width - 16; x += 28) {
      for (var y = 24.0; y < size.height - 44; y += 28) {
        canvas.drawCircle(Offset(x, y), 1.3, dotPaint);
      }
    }
  }

  @override
  bool shouldRepaint(_DuotoneBackdropPainter old) =>
      old.wash != wash || old.soft != soft || old.line != line;
}

class _DuotoneScenePainter extends CustomPainter {
  const _DuotoneScenePainter({
    required this.scene,
    required this.primary,
    required this.deep,
    required this.azure,
    required this.soft,
    required this.wash,
    required this.surface,
    required this.ink,
    required this.onPrimary,
    required this.border,
  });

  final _SlideScene scene;
  final Color primary;
  final Color deep;
  final Color azure;
  final Color soft;
  final Color wash;
  final Color surface;
  final Color ink;
  final Color onPrimary;
  final Color border;

  @override
  void paint(Canvas canvas, Size size) {
    switch (scene) {
      case _SlideScene.command:
        _paintCommand(canvas, size);
      case _SlideScene.documents:
        _paintDocuments(canvas, size);
      case _SlideScene.roles:
        _paintRoles(canvas, size);
    }
  }

  void _paintCommand(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Main flat dashboard card
    final card = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx, cy), width: 204, height: 124),
      const Radius.circular(16),
    );
    canvas.drawRRect(card, Paint()..color = surface);
    canvas.drawRRect(
      card,
      Paint()
        ..color = border
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );

    // Top cobalt header strip
    final topStrip = RRect.fromRectAndCorners(
      Rect.fromLTWH(card.left, card.top, card.width, 32),
      topLeft: const Radius.circular(16),
      topRight: const Radius.circular(16),
    );
    canvas.drawRRect(topStrip, Paint()..color = deep);

    // Three metric bar columns inside card (cobalt + azure duotone)
    final heights = [36.0, 52.0, 44.0, 62.0];
    for (var i = 0; i < heights.length; i++) {
      final bar = RRect.fromRectAndRadius(
        Rect.fromLTWH(
          card.left + 20 + (i * 26),
          card.bottom - 16 - heights[i],
          16,
          heights[i],
        ),
        const Radius.circular(5),
      );
      canvas.drawRRect(bar, Paint()..color = i == 3 ? primary : soft);
    }

    // Floating Cobalt Shield badge on top-right
    final badgeCenter = Offset(card.right - 6, card.top + 8);
    canvas.drawCircle(badgeCenter, 24, Paint()..color = primary);
    canvas.drawCircle(
      badgeCenter,
      24,
      Paint()
        ..color = surface
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
    final check = Path()
      ..moveTo(badgeCenter.dx - 8, badgeCenter.dy)
      ..lineTo(badgeCenter.dx - 2, badgeCenter.dy + 6)
      ..lineTo(badgeCenter.dx + 9, badgeCenter.dy - 6);
    canvas.drawPath(
      check,
      Paint()
        ..color = onPrimary
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round,
    );

    // Right-side summary lines
    for (var i = 0; i < 3; i++) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(card.left + 132, card.top + 48 + (i * 18), i == 0 ? 52 : 40, 8),
          const Radius.circular(4),
        ),
        Paint()..color = i == 0 ? azure : wash,
      );
    }
  }

  void _paintDocuments(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // Back stacked sheet (flat duotone offset)
    final back = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx + 18, cy + 6), width: 132, height: 146),
      const Radius.circular(14),
    );
    canvas.drawRRect(back, Paint()..color = soft);

    // Front official A4 document sheet
    final sheet = RRect.fromRectAndRadius(
      Rect.fromCenter(center: Offset(cx - 10, cy - 2), width: 136, height: 150),
      const Radius.circular(14),
    );
    canvas.drawRRect(sheet, Paint()..color = surface);
    canvas.drawRRect(
      sheet,
      Paint()
        ..color = border
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.6,
    );

    // Official cobalt letterhead band + azure accent stripe
    canvas.drawRRect(
      RRect.fromRectAndCorners(
        Rect.fromLTWH(sheet.left, sheet.top, sheet.width, 30),
        topLeft: const Radius.circular(14),
        topRight: const Radius.circular(14),
      ),
      Paint()..color = deep,
    );
    canvas.drawRect(
      Rect.fromLTWH(sheet.left, sheet.top + 30, sheet.width * 0.65, 4),
      Paint()..color = primary,
    );
    canvas.drawRect(
      Rect.fromLTWH(sheet.left + sheet.width * 0.65, sheet.top + 30, sheet.width * 0.35, 4),
      Paint()..color = azure,
    );

    // Structured table rows inside sheet
    for (var row = 0; row < 4; row++) {
      final y = sheet.top + 48 + (row * 22);
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(sheet.left + 14, y, row.isEven ? 68 : 54, 8),
          const Radius.circular(4),
        ),
        Paint()..color = row == 0 ? ink.withValues(alpha: 0.7) : soft,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(sheet.right - 34, y, 20, 8),
          const Radius.circular(4),
        ),
        Paint()..color = row == 0 ? primary : azure.withValues(alpha: 0.6),
      );
    }

    // Floating verification seal bottom-right
    final seal = Offset(sheet.right + 10, sheet.bottom - 18);
    canvas.drawCircle(seal, 22, Paint()..color = primary);
    canvas.drawCircle(
      seal,
      22,
      Paint()
        ..color = surface
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: seal, width: 16, height: 12),
        const Radius.circular(3),
      ),
      Paint()..color = onPrimary,
    );
  }

  void _paintRoles(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;

    // 3 interlocking role cards representing Admin / Hostel / Bursar desks
    final tiles = [
      (dx: -68.0, dy: -16.0, active: false),
      (dx: 68.0, dy: -16.0, active: false),
      (dx: 0.0, dy: 14.0, active: true),
    ];

    for (final t in tiles) {
      final rect = RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(cx + t.dx, cy + t.dy), width: 102, height: 84),
        const Radius.circular(14),
      );
      canvas.drawRRect(rect, Paint()..color = t.active ? primary : surface);
      canvas.drawRRect(
        rect,
        Paint()
          ..color = t.active ? deep : border
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.6,
      );

      // Avatar circle
      canvas.drawCircle(
        Offset(rect.left + 22, rect.top + 24),
        10,
        Paint()..color = t.active ? onPrimary.withValues(alpha: 0.25) : wash,
      );
      canvas.drawCircle(
        Offset(rect.left + 22, rect.top + 24),
        4.5,
        Paint()..color = t.active ? onPrimary : primary,
      );

      // Role text lines
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(rect.left + 14, rect.top + 46, 62, 8),
          const Radius.circular(4),
        ),
        Paint()..color = t.active ? onPrimary : deep,
      );
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(rect.left + 14, rect.top + 60, 42, 6),
          const Radius.circular(3),
        ),
        Paint()..color = t.active ? onPrimary.withValues(alpha: 0.65) : soft,
      );
    }
  }

  @override
  bool shouldRepaint(_DuotoneScenePainter old) =>
      old.scene != scene || old.primary != primary || old.surface != surface;
}
