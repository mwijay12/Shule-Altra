import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shule_altra_mobile/school_read_error.dart';

void main() {
  test('classifies actionable errors without leaking server messages', () {
    FirebaseException error(String code) => FirebaseException(plugin: 'test', code: code, message: 'private server details');
    expect(classifySchoolReadProblem(error('permission-denied')), SchoolReadProblem.permission);
    expect(classifySchoolReadProblem(error('unavailable')), SchoolReadProblem.connection);
    expect(classifySchoolReadProblem(error('network-request-failed')), SchoolReadProblem.connection);
    expect(classifySchoolReadProblem(error('user-token-expired')), SchoolReadProblem.session);
    expect(classifySchoolReadProblem(const FormatException()), SchoolReadProblem.invalidSchedule);
    expect(classifySchoolReadProblem(error('other')), SchoolReadProblem.unknown);
    for (final issue in SchoolReadProblem.values) {
      for (final isTimetable in [true, false]) {
        expect(schoolReadGuidance(issue, timetable: isTimetable), isNot(contains('private server details')));
      }
    }
  });
}
