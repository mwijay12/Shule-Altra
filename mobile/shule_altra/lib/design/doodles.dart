/// The app's own doodles, drawn from points rather than traced from a picture.
///
/// This is the Flutter equivalent of `scripts/stickers.mjs` in motion-lab: each
/// mark is a list of hand-placed points on a 0–100 grid, stroked with the ink
/// colour and filled with at most one flat token colour. They are decoration:
/// every one is wrapped in `ExcludeSemantics` by the widget that shows it, and
/// what a drawing means must also be said in words next to it.
///
/// Rules these follow:
///  * strokes only, rounded caps and joins, uniform width;
///  * nothing outside the 0–100 grid, with 8 units of margin;
///  * at most one accent mark (a four-point sparkle) per drawing;
///  * no text inside a drawing, ever.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'tokens.dart';

/// A doodle is a function of size and two colours, so it can be drawn at any
/// size without a raster asset and it follows the theme by itself.
typedef DoodlePainter = void Function(Canvas canvas, Size size, Color ink, Color fill);

/// Which mark to draw.
enum Doodle {
  /// The product: an open book with a graduation cap above it.
  book,

  /// Money and paperwork: a receipt with a torn edge.
  receipt,

  /// A school building with a flag.
  building,

  /// A person's win: a hand holding a report card.
  reportCard,

  /// A small tool: a stack of registers.
  registers,

  /// Three loose sparkles. No backing.
  sparkles,

  /// The registration mark used by the app bar.
  mark,
}

class DoodleView extends StatelessWidget {
  const DoodleView({
    super.key,
    required this.doodle,
    this.size = 72,
    this.color,
    this.fillColor,
    this.strokeWidth = 3.2,
    this.semanticLabel,
  });

  final Doodle doodle;
  final double size;
  final Color? color;
  final Color? fillColor;
  final double strokeWidth;

  /// Leave null when the drawing repeats what the text beside it says.
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final ink = color ?? tokens.primary;
    // The doodle's wash is the accent at low opacity: the violet reads as a
    // hand-drawn highlighter, where a solid violet fill would look like a badge.
    final fill = fillColor ?? tokens.accent.withValues(alpha: 0.16);
    final painted = SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _DoodlePainter(doodle: doodle, ink: ink, fill: fill, strokeWidth: strokeWidth),
      ),
    );
    if (semanticLabel == null) return ExcludeSemantics(child: painted);
    return Semantics(label: semanticLabel, image: true, child: painted);
  }
}

class _DoodlePainter extends CustomPainter {
  _DoodlePainter({
    required this.doodle,
    required this.ink,
    required this.fill,
    required this.strokeWidth,
  });

  final Doodle doodle;
  final Color ink;
  final Color fill;
  final double strokeWidth;

  /// The accent brush, rebuilt on every paint. Only a sparkle may use it, which
  /// is how "one accent per drawing" is enforced rather than remembered.
  Paint? _accent;

  @override
  void paint(Canvas canvas, Size size) {
    final unit = size.width / 100.0;
    canvas.save();
    canvas.scale(unit, unit);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..color = ink
      ..strokeWidth = strokeWidth / unit
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;
    final wash = Paint()
      ..style = PaintingStyle.fill
      ..color = fill
      ..isAntiAlias = true;
    final accent = Paint()
      ..style = PaintingStyle.stroke
      ..color = fill
      ..strokeWidth = strokeWidth / unit
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..isAntiAlias = true;
    _accent = accent;

    switch (doodle) {
      case Doodle.book:
        _book(canvas, stroke, wash);
      case Doodle.receipt:
        _receipt(canvas, stroke, wash);
      case Doodle.building:
        _building(canvas, stroke, wash);
      case Doodle.reportCard:
        _reportCard(canvas, stroke, wash);
      case Doodle.registers:
        _registers(canvas, stroke, wash);
      case Doodle.sparkles:
        _sparkles(canvas, stroke, wash);
      case Doodle.mark:
        _mark(canvas, accent);
    }
    canvas.restore();
  }

  void _book(Canvas canvas, Paint stroke, Paint wash) {
    // Cap: a flat parallelogram with a small tassel.
    canvas.drawPath(
      _path([const Offset(30, 22), const Offset(70, 22), const Offset(78, 33), const Offset(38, 33)], close: true),
      wash,
    );
    canvas.drawPath(
      _path([const Offset(30, 22), const Offset(70, 22), const Offset(78, 33), const Offset(38, 33)], close: true),
      stroke,
    );
    canvas.drawLine(const Offset(54, 33), const Offset(54, 40), stroke);
    canvas.drawCircle(const Offset(54, 43), 3, stroke);

    // Open book beneath it.
    final left = _path(
      [const Offset(18, 50), const Offset(50, 55), const Offset(50, 82), const Offset(18, 76)],
      close: true,
    );
    final right = _path(
      [const Offset(82, 50), const Offset(50, 55), const Offset(50, 82), const Offset(82, 76)],
      close: true,
    );
    canvas.drawPath(left, wash);
    canvas.drawPath(right, wash);
    canvas.drawPath(left, stroke);
    canvas.drawPath(right, stroke);
    canvas.drawLine(const Offset(50, 55), const Offset(50, 82), stroke);
    _accentSparkle(canvas, stroke, const Offset(84, 44), 5);
  }

  void _receipt(Canvas canvas, Paint stroke, Paint wash) {
    final body = _path([
      const Offset(30, 16),
      const Offset(70, 16),
      const Offset(70, 80),
      const Offset(62, 74),
      const Offset(54, 80),
      const Offset(46, 74),
      const Offset(38, 80),
      const Offset(30, 74),
    ], close: true);
    canvas.drawPath(body, wash);
    canvas.drawPath(body, stroke);
    // Two ruled amounts, no words.
    canvas.drawLine(const Offset(38, 34), const Offset(62, 34), stroke);
    canvas.drawLine(const Offset(38, 46), const Offset(54, 46), stroke);
    _accentSparkle(canvas, stroke, const Offset(76, 24), 4.5);
  }

  void _building(Canvas canvas, Paint stroke, Paint wash) {
    final body = _path([
      const Offset(24, 44),
      const Offset(50, 26),
      const Offset(76, 44),
      const Offset(76, 82),
      const Offset(24, 82),
    ], close: true);
    canvas.drawPath(body, wash);
    canvas.drawPath(body, stroke);
    // Door.
    canvas.drawPath(
      _path([const Offset(44, 82), const Offset(44, 64), const Offset(56, 64), const Offset(56, 82)], close: false),
      stroke,
    );
    // Flag, the one accent.
    canvas.drawLine(const Offset(50, 26), const Offset(50, 14), stroke);
    final flag = _path([const Offset(50, 14), const Offset(64, 18), const Offset(50, 22)], close: true);
    canvas.drawPath(flag, wash);
    canvas.drawPath(flag, stroke);
  }

  void _reportCard(Canvas canvas, Paint stroke, Paint wash) {
    final card = RRect.fromRectAndRadius(const Rect.fromLTWH(30, 18, 40, 46), const Radius.circular(6));
    canvas.drawRRect(card, wash);
    canvas.drawRRect(card, stroke);
    canvas.drawLine(const Offset(37, 30), const Offset(63, 30), stroke);
    canvas.drawLine(const Offset(37, 39), const Offset(57, 39), stroke);
    canvas.drawLine(const Offset(37, 48), const Offset(60, 48), stroke);
    // A hand beneath the card: a simple mitten, no fingers.
    final hand = _path([
      const Offset(34, 68),
      const Offset(50, 64),
      const Offset(66, 68),
      const Offset(62, 82),
      const Offset(38, 82),
    ], close: true);
    canvas.drawPath(hand, wash);
    canvas.drawPath(hand, stroke);
  }

  void _registers(Canvas canvas, Paint stroke, Paint wash) {
    for (var i = 0; i < 3; i++) {
      final offset = 6.0 * i;
      final book = RRect.fromRectAndRadius(
        Rect.fromLTWH(22 + offset, 22 + offset, 34, 46),
        const Radius.circular(5),
      );
      canvas.drawRRect(book, wash);
      canvas.drawRRect(book, stroke);
      canvas.drawLine(Offset(28 + offset, 34 + offset), Offset(50 + offset, 34 + offset), stroke);
    }
    _accentSparkle(canvas, stroke, const Offset(78, 30), 4.5);
  }

  void _sparkles(Canvas canvas, Paint stroke, Paint wash) {
    _accentSparkle(canvas, stroke, const Offset(30, 34), 9);
    _accentSparkle(canvas, stroke, const Offset(60, 62), 6);
    _accentSparkle(canvas, stroke, const Offset(74, 28), 4.5);
  }

  /// The brand mark: a rounded square holding an open book in the accent.
  void _mark(Canvas canvas, Paint accent) {
    final tile = RRect.fromRectAndRadius(const Rect.fromLTWH(10, 10, 80, 80), const Radius.circular(24));
    canvas.drawRRect(tile, Paint()..color = ink);
    canvas.drawPath(
      _path([
        const Offset(30, 38),
        const Offset(50, 44),
        const Offset(70, 38),
        const Offset(70, 66),
        const Offset(50, 72),
        const Offset(30, 66),
      ], close: true),
      accent,
    );
    canvas.drawLine(const Offset(50, 44), const Offset(50, 72), accent);
  }

  /// A four-point sparkle: the only accent a doodle may carry.
  ///
  /// It always draws with the accent brush, so a caller cannot accidentally turn
  /// the one accent mark into a second ink line.
  void _accentSparkle(Canvas canvas, Paint stroke, Offset centre, double radius) {
    final brush = _accent ?? stroke;
    final waist = radius * 0.28;
    final path = _path([
      Offset(centre.dx, centre.dy - radius),
      Offset(centre.dx + waist, centre.dy - waist),
      Offset(centre.dx + radius, centre.dy),
      Offset(centre.dx + waist, centre.dy + waist),
      Offset(centre.dx, centre.dy + radius),
      Offset(centre.dx - waist, centre.dy + waist),
      Offset(centre.dx - radius, centre.dy),
      Offset(centre.dx - waist, centre.dy - waist),
    ], close: true);
    canvas.drawPath(path, brush);
  }

  Path _path(List<Offset> points, {required bool close}) {
    final path = Path();
    if (points.isEmpty) return path;
    path.moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    if (close) path.close();
    return path;
  }

  @override
  bool shouldRepaint(_DoodlePainter old) {
    return old.doodle != doodle ||
        old.ink != ink ||
        old.fill != fill ||
        old.strokeWidth != strokeWidth;
  }
}

/// A soft irregular blob behind a doodle, the way a sticker sits on its paper.
///
/// Pure decoration: it carries no meaning and is skipped by a screen reader.
class BlobBacking extends StatelessWidget {
  const BlobBacking({super.key, required this.child, this.seed = 3, this.size = 96});

  final Widget child;

  /// Changing this changes the blob's outline, so two stickers on one screen do
  /// not have the same silhouette.
  final int seed;

  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: CustomPaint(
          painter: _BlobPainter(color: tokens.mutedSurface, seed: seed),
          child: Center(child: child),
        ),
      ),
    );
  }
}

class _BlobPainter extends CustomPainter {
  _BlobPainter({required this.color, required this.seed});

  final Color color;
  final int seed;

  @override
  void paint(Canvas canvas, Size size) {
    final random = math.Random(seed);
    final centre = size.center(Offset.zero);
    final radius = size.width * 0.46;
    final path = Path();
    const steps = 12;
    for (var i = 0; i < steps; i++) {
      final angle = (math.pi * 2 * i) / steps;
      final wobble = 0.86 + random.nextDouble() * 0.2;
      final point = centre + Offset(math.cos(angle), math.sin(angle)) * radius * wobble;
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    path.close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(_BlobPainter old) => old.color != color || old.seed != seed;
}
