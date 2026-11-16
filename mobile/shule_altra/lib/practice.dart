/// Practice attendance: a register that looks real and stores nothing.
///
/// It is separated from the screen so the rule can be tested without a widget:
/// a practice mark is in-memory, replaceable, clearable, and attached to a
/// fictional learner id that starts with `sample-`.
library;

enum PracticeMark { present, absent, late }

extension PracticeMarkLabel on PracticeMark {
  String get label => switch (this) {
        PracticeMark.present => 'Present',
        PracticeMark.absent => 'Absent',
        PracticeMark.late => 'Late',
      };
}

class PracticeDraft {
  final Map<String, PracticeMark> _marks = {};

  PracticeMark? markFor(String id) => _marks[id];

  int get marked => _marks.length;

  bool get isEmpty => _marks.isEmpty;

  /// Marks are replaced, not appended: one learner has one practice status.
  void mark(String id, PracticeMark value) => _marks[id] = value;

  void clear() => _marks.clear();
}
