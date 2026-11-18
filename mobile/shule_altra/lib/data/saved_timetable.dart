/// Read-only schedules in the web application's saved timetable format.
library;

const timetableClasses = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
const timetableStreams = ['A', 'B'];
const timetableDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timetablePeriods = <({String id, String label, String time, bool isBreak})>[
  (id: 'p1', label: 'Period 1', time: '08:00 – 08:40', isBreak: false),
  (id: 'p2', label: 'Period 2', time: '08:40 – 09:20', isBreak: false),
  (id: 'p3', label: 'Period 3', time: '09:20 – 10:00', isBreak: false),
  (id: 'b1', label: 'Short break', time: '10:00 – 10:20', isBreak: true),
  (id: 'p4', label: 'Period 4', time: '10:20 – 11:00', isBreak: false),
  (id: 'p5', label: 'Period 5', time: '11:00 – 11:40', isBreak: false),
  (id: 'p6', label: 'Period 6', time: '11:40 – 12:20', isBreak: false),
  (id: 'b2', label: 'Lunch break', time: '12:20 – 13:20', isBreak: true),
  (id: 'p7', label: 'Period 7', time: '13:20 – 14:00', isBreak: false),
  (id: 'p8', label: 'Period 8', time: '14:00 – 14:40', isBreak: false),
];

String timetableId(String className, String stream) {
  if (!timetableClasses.contains(className) || !timetableStreams.contains(stream)) {
    throw ArgumentError('Invalid class or stream');
  }
  return 'schedule-${className.replaceAll(' ', '-').toLowerCase()}-${stream.toLowerCase()}';
}

class TimetableSlot {
  const TimetableSlot(this.subject, this.teacher, this.room);
  final String subject;
  final String teacher;
  final String room;
}

class SavedTimetable {
  const SavedTimetable(this.slots);
  final Map<String, TimetableSlot> slots;

  factory SavedTimetable.parse(Map<String, dynamic> data, String className, String stream) {
    final raw = data['slots'];
    if (data['schemaVersion'] != 1 || data['className'] != className ||
        data['stream'] != stream || raw is! Map) {
      throw const FormatException('Unsupported or mismatched timetable');
    }
    final slots = <String, TimetableSlot>{};
    for (final entry in raw.entries) {
      final item = entry.value;
      if (entry.key is! String || item is! Map || item['subject'] is! String ||
          item['teacher'] is! String || item['room'] is! String) {
        throw const FormatException('Invalid timetable slot');
      }
      slots[entry.key as String] = TimetableSlot(
        item['subject'] as String, item['teacher'] as String, item['room'] as String,
      );
    }
    return SavedTimetable(Map.unmodifiable(slots));
  }

  TimetableSlot? slot(String day, String period) => slots['${day.toLowerCase()}_$period'];
}

/// Separate capability; a sample gateway never quietly reads a real school.
abstract interface class TimetableReader {
  Future<SavedTimetable?> loadTimetable(String className, String stream);
}
