/// One learner, read-only, with the fields that exist and honest gaps.
library;

import 'package:flutter/material.dart';

import '../data/learner.dart';
import '../design/doodles.dart';
import '../design/glass.dart';
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
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Space.md, 0, Space.md, Space.md),
        child: ShuleGlassBlur(
          radius: Corners.panel,
          sigma: 24,
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.lg),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.sizeOf(context).height * 0.84,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: tokens.border,
                        borderRadius: BorderRadius.circular(Corners.pill),
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.md),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: tokens.blueWash,
                        child: Text(
                          learner.initials,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                color: tokens.blueInk,
                                fontWeight: FontWeight.w800,
                              ),
                        ),
                      ),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(learner.name, style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: Space.xs + 2,
                              runSpacing: Space.xs,
                              children: [
                                StatusPill(label: learner.className),
                                if (learner.stream.isNotEmpty)
                                  StatusPill(label: 'Stream ${learner.stream}'),
                              ],
                            ),
                          ],
                        ),
                      ),
                      ExcludeSemantics(
                        child: DoodleView(
                          doodle: Doodle.reportCard,
                          size: 42,
                          strokeWidth: 3.2,
                          color: tokens.blueInk,
                        ),
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
                  const SizedBox(height: Space.lg),
                  const SectionHead(title: 'Learner'),
                  const SizedBox(height: Space.sm),
                  ShuleInnerTile(
                    padding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.xs),
                    child: Column(
                      children: [
                        FactRow(label: 'Status', value: learner.status),
                        const Divider(),
                        FactRow(label: 'Class', value: learner.className),
                        const Divider(),
                        FactRow(label: 'Type', value: learner.type),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.lg),
                  const SectionHead(title: 'Guardian'),
                  const SizedBox(height: Space.sm),
                  ShuleInnerTile(
                    padding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.xs),
                    child: Column(
                      children: [
                        FactRow(label: 'Name', value: learner.guardianName),
                        const Divider(),
                        FactRow(label: 'Phone', value: learner.guardianPhone),
                        const Divider(),
                        FactRow(label: 'Email', value: learner.guardianEmail),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.lg),
                  const SectionHead(title: 'Fees'),
                  const SizedBox(height: Space.sm),
                  ShuleInnerTile(
                    padding: const EdgeInsets.symmetric(horizontal: Space.lg, vertical: Space.xs),
                    child: FactRow(
                      label: 'Balance',
                      value: hasBalance
                          ? ((learner.balance == 0) ? 'Paid up' : formatTzs(learner.balance))
                          : 'No fee figures recorded',
                    ),
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
        ),
      ),
    );
  }
}

/// Opens the detail as a frosted glass sheet. Kept here so both entry points
/// behave the same.
Future<void> showLearnerDetail(
  BuildContext context, {
  required Learner learner,
  required bool isSample,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) => LearnerDetailSheet(learner: learner, isSample: isSample),
  );
}
