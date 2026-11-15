import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/sample_day.dart';

void main() {
  test('practice marks are explicit, replaceable and clearable', () {
    final draft = SampleAttendanceDraft();
    expect(draft.markedCount, 0);
    expect(draft.markFor('sample-1'), isNull);
    draft.mark('sample-1', SampleAttendance.present);
    draft.mark('sample-1', SampleAttendance.absent);
    expect(draft.markedCount, 1);
    expect(draft.markFor('sample-1'), SampleAttendance.absent);
    expect(() => draft.mark('real-student-id', SampleAttendance.present), throwsArgumentError);
    draft.clear();
    expect(draft.markedCount, 0);
    expect(draft.markFor('sample-1'), isNull);
  });
}
