/// The school day: practice attendance, and the words that keep it practice.
///
/// This screen is the one place the SVGs implied an action, and the honest
/// answer is that the action does not write. Marks live in memory for the length
/// of the visit. The screen says so above the list, next to the count, and again
/// under the button — three places, because a person who misses one should meet
/// it again.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../data/sample_gateway.dart';
import '../data/sample_timetable.dart';
import '../data/saved_timetable.dart';
import 'saved_timetable.dart';
import '../design/doodles.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../practice.dart';

class SchoolDayScreen extends StatefulWidget {
  const SchoolDayScreen({super.key, required this.session, required this.onOpenRegister});

  final AppSession session;
  final VoidCallback onOpenRegister;

  @override
  State<SchoolDayScreen> createState() => _SchoolDayScreenState();
}

class _SchoolDayScreenState extends State<SchoolDayScreen> {
  /// Replaced, not mutated in place: clearing a sheet that another build already
  /// holds must produce a new one, and `setState(_draft.clear)` would pass a
  /// void callback where Flutter expects a rebuild factory.
  PracticeDraft _draft = PracticeDraft();
  String _sampleDay = 'Monday';

  /// The practice sheet always uses fictional learners, whoever is signed in.
  /// Marking a real learner's name, even locally, invites a person to believe a
  /// record exists.
  List<Learner> get _rows => SampleGateway.sampleLearners;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final rows = _rows;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.xxl),
      children: [
        const BrandBar(),
        const SizedBox(height: Space.xl),
        Text('The school day', style: Theme.of(context).textTheme.displaySmall),
        const SizedBox(height: Space.sm),
        Text(
          'A practice sheet. It looks and behaves like a register, and it is not one.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
        ),
        const SizedBox(height: Space.xl),
        const Notice(
          title: 'Practice only, nothing saved',
          body: 'These marks live in memory while this screen is open. They are not '
              'attendance records, they never reach a school, and closing the app '
              'discards them.',
          tone: NoticeTone.caution,
        ),
        if (widget.session.gateway is TimetableReader) ...[
          const SizedBox(height: Space.md),
          OutlinedButton.icon(
            onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => SavedTimetableScreen(
              session: widget.session, reader: widget.session.gateway as TimetableReader,
            ))),
            icon: const Icon(Icons.calendar_month_outlined),
            label: const Text('Open saved school timetable'),
          ),
        ],
        const SizedBox(height: Space.xl),
        SectionHead(
          title: 'Sample attendance',
          trailing: '${_draft.marked} of ${rows.length} marked',
        ),
        const SizedBox(height: Space.md),
        ...rows.asMap().entries.map((entry) {
          final learner = entry.value;
          final mark = _draft.markFor(learner.id);
          return Rise(
            index: entry.key,
            child: Container(
              margin: const EdgeInsets.only(bottom: Space.sm),
              padding: const EdgeInsets.all(Space.lg),
              decoration: BoxDecoration(
                color: tokens.surface,
                borderRadius: BorderRadius.circular(Corners.panel),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 18,
                        backgroundColor: tokens.mutedSurface,
                        child: Text(
                          learner.initials,
                          style: Theme.of(context).textTheme.labelLarge?.copyWith(color: tokens.ink),
                        ),
                      ),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(learner.name, style: Theme.of(context).textTheme.titleMedium),
                            Text(
                              '${learner.className} · sample',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (mark != null) ...[
                    const SizedBox(height: Space.sm),
                    Text(
                      'Marked ${mark.label.toLowerCase()}',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.success),
                    ),
                  ],
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      for (final value in PracticeMark.values)
                        ChoicePill(
                          label: value.label,
                          selected: mark == value,
                          semanticHint: 'Practice mark for ${learner.name}, not saved',
                          onSelected: () => setState(() => _draft.mark(learner.id, value)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
        const SizedBox(height: Space.md),
        Row(
          children: [
            TextButton.icon(
              onPressed: _draft.isEmpty ? null : () => setState(() => _draft = PracticeDraft()),
              icon: const Icon(Icons.restart_alt_rounded, size: 20),
              label: const Text('Clear practice marks'),
            ),
          ],
        ),
        const SizedBox(height: Space.md),
        Notice(
          title: 'Why this is not an attendance tool yet',
          body: 'Recording attendance safely means an offline queue, conflict handling, a '
              'signed-in staff identity and a write path the school has agreed to. None of '
              'that exists in this pilot, so this screen practices and does not record.',
          tone: NoticeTone.info,
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Fictional timetable'),
        const SizedBox(height: Space.sm),
        const Notice(
          title: 'Sample schedule only',
          body: 'This is fictional even when signed in to a school. It is not the '
              'saved school timetable. Practice marks do not change with the day.',
          tone: NoticeTone.info,
        ),
        const SizedBox(height: Space.md),
        DropdownButtonFormField<String>(
          value: _sampleDay,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Sample day'),
          items: sampleTimetable.keys
              .map((day) => DropdownMenuItem(value: day, child: Text(day)))
              .toList(),
          onChanged: (day) {
            if (day != null) setState(() => _sampleDay = day);
          },
        ),
        const SizedBox(height: Space.md),
        for (final lesson in sampleTimetable[_sampleDay]!)
          Card(
            child: ListTile(
              leading: const Icon(Icons.menu_book_outlined),
              title: Text(lesson.subject),
              subtitle: Text('${lesson.time} · ${lesson.teacher} · fictional'),
            ),
          ),
        const SizedBox(height: Space.lg),
        OutlinedButton.icon(
          onPressed: widget.onOpenRegister,
          icon: const Icon(Icons.menu_book_outlined, size: 20),
          label: const Text('Go to the real register'),
        ),
        const SizedBox(height: Space.md),
        Text(
          'The register is read-only too. This practice sheet always uses the same '
          'fictional sample learners — ${countLabel(rows.length)} — whichever account '
          'is signed in.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.only(top: Space.lg),
            child: Center(
              child: DoodleView(doodle: Doodle.registers, size: 56, color: tokens.inkMuted),
            ),
          ),
        ),
      ],
    );
  }
}
