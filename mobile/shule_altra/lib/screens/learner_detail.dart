/// One learner, read-only, with the fields that exist and honest gaps.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../design/doodles.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';

class LearnerDetailSheet extends StatelessWidget {
  const LearnerDetailSheet({super.key, required this.learner, required this.isSample});

  final Learner learner;
  final bool isSample;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final hasBalance = learner.balance != null;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Space.gutter, 0, Space.gutter, Space.xl),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: tokens.mutedSurface,
                    child: Text(
                      learner.initials,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: tokens.ink),
                    ),
                  ),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(learner.name, style: Theme.of(context).textTheme.headlineSmall),
                        const SizedBox(height: 2),
                        Text(learner.className, style: Theme.of(context).textTheme.bodySmall),
                      ],
                    ),
                  ),
                  ExcludeSemantics(
                    child: DoodleView(doodle: Doodle.reportCard, size: 44, strokeWidth: 3.2),
                  ),
                ],
              ),
              const SizedBox(height: Space.lg),
              if (isSample)
                const Notice(
                  title: 'Sample learner',
                  body: 'A fictional record for trying the app. It is not a real learner and '
                      'nothing here can be saved, marked or paid.',
                  tone: NoticeTone.caution,
                )
              else
                const Notice(
                  title: 'Read-only snapshot',
                  body: 'Taken from the page that loaded a moment ago. It can be out of date '
                      'already; go back and reload the register for newer details.',
                ),
              const SizedBox(height: Space.xl),
              const SectionHead(title: 'Learner'),
              FactRow(label: 'Status', value: learner.status),
              FactRow(label: 'Class', value: learner.className),
              FactRow(label: 'Stream', value: learner.stream),
              FactRow(label: 'Attendance', value: learner.attendanceStatus),
              Text('Stored status has no date and may not be from today.', style: Theme.of(context).textTheme.bodySmall),
              FactRow(label: 'Type', value: learner.type),
              const SizedBox(height: Space.md),
              const SectionHead(title: 'Guardian'),
              FactRow(label: 'Name', value: learner.guardianName),
              FactRow(label: 'Phone', value: learner.guardianPhone),
              FactRow(label: 'Email', value: learner.guardianEmail),
              const SizedBox(height: Space.md),
              const SectionHead(title: 'Fees'),
              FactRow(
                label: 'Balance',
                value: hasBalance
                    ? ((learner.balance == 0) ? 'Paid up' : formatTzs(learner.balance))
                    : 'No fee figures recorded',
              ),
              const SizedBox(height: Space.lg),
              Text(
                isSample
                    ? 'Sample preview · fictional data · nothing leaves this phone.'
                    : 'Read-only pilot · no editing, marking or payment from this screen.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Opens the detail as a sheet. Kept here so both entry points behave the same.
Future<void> showLearnerDetail(
  BuildContext context, {
  required Learner learner,
  required bool isSample,
  required AppSession session,
}) {
  final revision = session.dataRevision;
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => AnimatedBuilder(
      animation: session,
      builder: (context, _) => session.dataRevision == revision && session.signedIn
          ? LearnerDetailSheet(learner: learner, isSample: isSample)
          : const SafeArea(child: Padding(
              padding: EdgeInsets.all(Space.gutter),
              child: Notice(title: 'Session changed', body: 'Learner details were cleared. Close this sheet and sign in again if needed.'),
            )),
    ),
  );
}
