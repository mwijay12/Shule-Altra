import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/sample_school_gateway.dart';

void main() {
  test('fictional gateway uses local prefix search, pages and sample schedule', () async {
    const gateway = SampleSchoolGateway();
    final first = await gateway.loadLearners();
    expect(first.rows.map((row) => row.name), ['Amina Juma', 'Baraka John']);
    expect(first.nextCursor, 2);
    final second = await gateway.loadLearners(after: first.nextCursor);
    expect(second.rows.single.name, 'Neema Peter');
    expect(second.nextCursor, isNull);
    expect((await gateway.loadLearners(namePrefix: 'amina')).rows, isEmpty);
    expect((await gateway.loadLearners(namePrefix: 'Ami')).rows.single.name, 'Amina Juma');
    expect((await gateway.loadTimetable('Form 1', 'A'))?.slot('Monday', 'p1')?.subject, 'Mathematics');
    expect(await gateway.loadTimetable('Form 4', 'B'), isNull);
    await expectLater(gateway.signInWithGoogle(), throwsUnsupportedError);
    await expectLater(gateway.loadLearners(after: 'wrong'), throwsArgumentError);
  });
}
