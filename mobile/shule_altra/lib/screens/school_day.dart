/// The school day: practice attendance, and the words that keep it practice.
///
/// This screen is the one place the SVGs implied an action, and the honest
/// answer is that the action does not write. Marks live in memory for the current app session. The screen says so above the list, next to the count, and again
/// under the button — three places, because a person who misses one should meet
/// it again.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../data/sample_gateway.dart';
import '../data/saved_timetable.dart';
import 'saved_timetable.dart';
import 'sample_timetable.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
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

  Future<void> _confirmClear() async {
    final clear = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear practice marks?'),
        content: const Text('This removes the fictional marks from this session. No school records will be changed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep marks')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Clear marks')),
        ],
      ),
    );
    if (clear == true && mounted) setState(() => _draft = PracticeDraft());
  }

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
        Text('Choose a timetable or try the fictional attendance sheet below.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted)),
        const SizedBox(height: Space.xl),
        Container(
          padding: const EdgeInsets.all(Space.lg),
          decoration: BoxDecoration(
            gradient: tokens.washGradient,
            border: Border.all(color: tokens.border),
            borderRadius: BorderRadius.circular(Corners.hero),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Icon(Icons.calendar_month_outlined, color: tokens.primary),
              const SizedBox(width: Space.sm),
              Expanded(child: Text('Timetables', style: Theme.of(context).textTheme.titleMedium)),
            ]),
            const SizedBox(height: Space.sm),
            Text('Start with the fictional schedule, or open a saved school schedule where available.',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: Space.md),
            SizedBox(width: double.infinity, child: OutlinedButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(
                builder: (_) => SampleTimetableScreen(
                  initialDay: _sampleDay,
                  onDayChanged: (day) { if (mounted) setState(() => _sampleDay = day); },
                ),
              )),
              icon: const Icon(Icons.auto_stories_outlined),
              label: const Text('View fictional timetable'),
            )),
            if (widget.session.gateway is TimetableReader) ...[
              const SizedBox(height: Space.sm),
              SizedBox(width: double.infinity, child: OutlinedButton.icon(
                onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => SavedTimetableScreen(
                  session: widget.session, reader: widget.session.gateway as TimetableReader,
                ))),
                icon: const Icon(Icons.school_outlined),
                label: const Text('Open saved school timetable'),
              )),
            ],
          ]),
        ),
        const SizedBox(height: Space.xl),
        const Notice(
          title: 'Practice only, nothing saved',
          body: 'These marks stay in memory when you change tabs. They are not '
              'attendance records, they never reach a school, and returning to the start '
              'or closing the app discards them.',
          tone: NoticeTone.caution,
        ),
        const SizedBox(height: Space.xl),
        SectionHead(
          title: 'Sample attendance',
          trailing: '${_draft.marked} of ${rows.length} marked',
        ),
        const SizedBox(height: Space.sm),
        Semantics(
          label: 'Practice progress: ${_draft.marked} of ${rows.length} fictional learners marked',
          child: ExcludeSemantics(child: LinearProgressIndicator(
            value: _draft.marked / rows.length,
            minHeight: 6,
            borderRadius: BorderRadius.circular(Corners.pill),
            backgroundColor: tokens.mutedSurface,
            color: tokens.primary,
          )),
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
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: mark == PracticeMark.present ? tokens.success :
                            mark == PracticeMark.absent ? tokens.danger : tokens.warning),
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
              onPressed: _draft.isEmpty ? null : _confirmClear,
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
        const SizedBox(height: Space.lg),
        SizedBox(width: double.infinity, child: OutlinedButton.icon(
          onPressed: widget.onOpenRegister,
          icon: const Icon(Icons.menu_book_outlined, size: 20),
          label: const Text('Open learners register'),
        )),
        const SizedBox(height: Space.md),
        Text('The register uses the data path you chose. This practice sheet always uses fictional learners.',
            style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
