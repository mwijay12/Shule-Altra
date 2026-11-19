/// A fictional timetable, separate from the saved school schedule.
library;

import 'package:flutter/material.dart';

import '../data/sample_timetable.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import 'schedule_entry.dart';

class SampleTimetableScreen extends StatefulWidget {
  const SampleTimetableScreen({super.key, required this.initialDay, required this.onDayChanged});
  final String initialDay;
  final ValueChanged<String> onDayChanged;

  @override
  State<SampleTimetableScreen> createState() => _SampleTimetableScreenState();
}

class _SampleTimetableScreenState extends State<SampleTimetableScreen> {
  late String _day = widget.initialDay;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fictional timetable')),
      body: LayoutBuilder(builder: (context, constraints) {
        final gutter = constraints.maxWidth > 760 ? (constraints.maxWidth - 712) / 2 : Space.gutter;
        return ListView(padding: EdgeInsets.fromLTRB(gutter, Space.lg, gutter, Space.xxl), children: [
          const Notice(
            title: 'Sample schedule only',
            body: 'This is fictional even when signed in to a school. It is not the saved school timetable. '
                'Practice marks do not change with the day.',
            tone: NoticeTone.info,
          ),
          const SizedBox(height: Space.xl),
          DropdownButtonFormField<String>(
            value: _day,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Sample day'),
            items: sampleTimetable.keys.map((day) => DropdownMenuItem(value: day, child: Text(day))).toList(),
            onChanged: (day) {
              if (day == null) return;
              setState(() => _day = day);
              widget.onDayChanged(day);
            },
          ),
          const SizedBox(height: Space.xl),
          SectionHead(title: '$_day · sample'),
          const SizedBox(height: Space.md),
          for (final lesson in sampleTimetable[_day]!)
            ScheduleEntry(time: lesson.time, title: lesson.subject, detail: '${lesson.teacher} · fictional'),
        ]);
      }),
    );
  }
}
