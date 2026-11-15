/// Ephemeral demo state. These names are fictional and nothing is sent or saved.
enum SampleAttendance { present, absent, late }

class SampleLearner {
  final String id;
  final String name;
  final String className;
  final String initials;
  const SampleLearner(this.id, this.name, this.className, this.initials);
}

const sampleLearners = [
  SampleLearner('sample-1', 'Amina Juma', 'Form 1 A', 'AJ'),
  SampleLearner('sample-2', 'Baraka John', 'Form 2 B', 'BJ'),
  SampleLearner('sample-3', 'Neema Peter', 'Form 3 A', 'NP'),
];

class SampleAttendanceDraft {
  final Map<String, SampleAttendance> _marks = {};

  SampleAttendance? markFor(String learnerId) => _marks[learnerId];
  int get markedCount => _marks.length;
  int get totalCount => sampleLearners.length;

  void mark(String learnerId, SampleAttendance status) {
    if (!sampleLearners.any((learner) => learner.id == learnerId)) {
      throw ArgumentError.value(learnerId, 'learnerId', 'Unknown sample learner');
    }
    _marks[learnerId] = status;
  }

  void clear() => _marks.clear();
}
