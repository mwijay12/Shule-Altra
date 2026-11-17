import 'package:flutter/material.dart';

/// The saved schedule uses the same IDs and fixed period definitions as web.
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
  if (!timetableClasses.contains(className) || !timetableStreams.contains(stream)) throw ArgumentError('Invalid class or stream');
  return 'schedule-${className.replaceAll(' ', '-').toLowerCase()}-${stream.toLowerCase()}';
}

class TimetableSlot {
  final String subject, teacher, room;
  const TimetableSlot(this.subject, this.teacher, this.room);
}

class LiveTimetable {
  final Map<String, TimetableSlot> slots;
  const LiveTimetable(this.slots);

  factory LiveTimetable.parse(Map<String, dynamic> data, String className, String stream) {
    final raw = data['slots'];
    if (data['schemaVersion'] != 1 || data['className'] != className || data['stream'] != stream || raw is! Map) {
      throw const FormatException('Unsupported or mismatched timetable.');
    }
    final slots = <String, TimetableSlot>{};
    for (final entry in raw.entries) {
      final item = entry.value;
      if (entry.key is! String || item is! Map || item['subject'] is! String || item['teacher'] is! String || item['room'] is! String) {
        throw const FormatException('Invalid timetable slot.');
      }
      slots[entry.key as String] = TimetableSlot(item['subject'] as String, item['teacher'] as String, item['room'] as String);
    }
    return LiveTimetable(Map.unmodifiable(slots));
  }

  TimetableSlot? slot(String day, String periodId) => slots['${day.toLowerCase()}_$periodId'];
}

class _TimetableResult {
  final LiveTimetable? schedule;
  final bool failed;
  const _TimetableResult(this.schedule, this.failed);
}

class LiveTimetablePanel extends StatefulWidget {
  final Future<LiveTimetable?> Function(String className, String stream) load;
  final VoidCallback onBack, onSignOut;
  const LiveTimetablePanel({super.key, required this.load, required this.onBack, required this.onSignOut});
  @override State<LiveTimetablePanel> createState() => _LiveTimetablePanelState();
}

class _LiveTimetablePanelState extends State<LiveTimetablePanel> {
  String className = timetableClasses.first, stream = timetableStreams.first, day = timetableDays.first;
  Future<_TimetableResult>? result;
  Future<_TimetableResult> loadSafely() async {
    try { return _TimetableResult(await widget.load(className, stream), false); }
    catch (_) { return const _TimetableResult(null, true); }
  }
  @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(24), children: [
    const Text('School timetable', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800)),
    const SizedBox(height: 6),
    const Text('Saved schedule · online and read-only', style: TextStyle(color: Color(0xff667d75))),
    const SizedBox(height: 16),
    Wrap(spacing: 12, runSpacing: 8, children: [
      DropdownButton<String>(value: className, items: timetableClasses.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) => setState(() { className = value!; result = null; })),
      DropdownButton<String>(value: stream, items: timetableStreams.map((value) => DropdownMenuItem(value: value, child: Text('Stream $value'))).toList(), onChanged: (value) => setState(() { stream = value!; result = null; })),
      DropdownButton<String>(value: day, items: timetableDays.map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) => setState(() => day = value!)),
    ]),
    Wrap(spacing: 8, children: [
      FilledButton.icon(onPressed: () => setState(() => result = loadSafely()), icon: const Icon(Icons.refresh), label: const Text('Load timetable')),
      OutlinedButton(onPressed: widget.onBack, child: const Text('Learner register')),
      OutlinedButton(onPressed: widget.onSignOut, child: const Text('Sign out')),
    ]),
    const SizedBox(height: 12),
    const Text('Showing the last successful server read. Changes by others are not shown until you load again.', style: TextStyle(color: Color(0xff667d75), fontSize: 12)),
    if (result != null) FutureBuilder<_TimetableResult>(future: result, builder: (context, snapshot) {
      if (snapshot.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
      if (snapshot.hasError || snapshot.data?.failed != false) return const Padding(padding: EdgeInsets.only(top: 20), child: Text('Could not load this schedule. Check your connection, permissions and schedule format.'));
      final schedule = snapshot.data!.schedule;
      if (schedule == null) return const Padding(padding: EdgeInsets.only(top: 20), child: Text('No saved schedule for this class and stream.'));
      return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 20), Text('$day · $className $stream', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
        const SizedBox(height: 10),
        ...timetablePeriods.map((period) {
          final slot = period.isBreak ? null : schedule.slot(day, period.id);
          final title = period.isBreak ? period.label : (slot?.subject.trim().isNotEmpty == true ? slot!.subject : 'Not scheduled');
          final details = period.isBreak ? 'Break' : slot == null ? 'No saved lesson' : [slot.teacher, slot.room].where((value) => value.trim().isNotEmpty).join(' · ');
          return Card(child: ListTile(title: Text(title), subtitle: Text('${period.time} · $details'), leading: Icon(period.isBreak ? Icons.free_breakfast_outlined : Icons.menu_book_outlined)));
        }),
      ]);
    }),
  ]);
}
