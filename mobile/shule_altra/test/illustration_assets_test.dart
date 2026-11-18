import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bundled cutouts have real transparent corners', () async {
    for (final asset in ['assets/images/school_cutout.png', 'assets/images/learning_cutout.png']) {
      final data = await rootBundle.load(asset);
      final codec = await ui.instantiateImageCodec(data.buffer.asUint8List());
      final image = (await codec.getNextFrame()).image;
      final rgba = (await image.toByteData(format: ui.ImageByteFormat.rawRgba))!;
      final alpha = rgba.getUint8(3);
      expect(alpha, 0, reason: '$asset must have a transparent background, not a printed checkerboard');
      image.dispose();
      codec.dispose();
    }
  });
}
