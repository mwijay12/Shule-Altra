import 'live_school.dart';
import 'live_timetable.dart';

/// Completely local, fictional data for trying the real workspace layouts.
/// This gateway never calls Firebase and cannot write attendance.
class SampleSchoolGateway implements SchoolGateway {
  const SampleSchoolGateway();

  static const _rows = [
    LiveLearner('Amina Juma', 'Form 1', recordId: 'sample-001', stream: 'A', attendanceStatus: 'Present'),
    LiveLearner('Baraka John', 'Form 2', recordId: 'sample-002', stream: 'B', attendanceStatus: 'Late'),
    LiveLearner('Neema Peter', 'Form 3', recordId: 'sample-003', attendanceStatus: 'Absent'),
  ];

  @override Stream<String?> get sessionUid => Stream.value('fictional-preview');
  @override Future<void> signInWithGoogle() async => throw UnsupportedError('Sample preview cannot sign in.');
  @override Future<void> signOut() async {}

  @override Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''}) async {
    if (after != null && (after is! int || after < 0)) throw ArgumentError('Invalid sample cursor');
    final matches = _rows.where((row) => row.name.startsWith(namePrefix)).toList();
    final start = after as int? ?? 0;
    if (start > matches.length) throw ArgumentError('Invalid sample cursor');
    final end = start + 2 < matches.length ? start + 2 : matches.length;
    return LearnerPage(matches.sublist(start, end), end < matches.length ? end : null);
  }

  @override Future<LiveTimetable?> loadTimetable(String className, String stream) async {
    if (className != 'Form 1' || stream != 'A') return null;
    return const LiveTimetable({
      'monday_p1': TimetableSlot('Mathematics', 'Sample teacher', 'Sample room'),
      'monday_p2': TimetableSlot('English', 'Sample teacher', 'Sample room'),
      'tuesday_p1': TimetableSlot('Biology', 'Sample teacher', 'Sample room'),
    });
  }
}
