/// The screen after sign-in: where you are, and the one thing to do next.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../design/doodles.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.session,
    required this.onOpenRegister,
    required this.onOpenDay,
    required this.onOpenMore,
  });

  final AppSession session;
  final VoidCallback onOpenRegister;
  final VoidCallback onOpenDay;
  final VoidCallback onOpenMore;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final rows = session.rows;
    final classes = <String>{for (final row in rows) row.className};
    final withFees = rows.where((row) => (row.balance ?? 0) > 0).length;
    final owed = rows.fold<double>(0, (sum, row) => sum + (row.balance ?? 0));

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.xxl),
      children: [
        const BrandBar(),
        const SizedBox(height: Space.xl),
        Rise(
          index: 0,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('ASSEMBLY, THEN CLASS', style: Theme.of(context).textTheme.labelSmall),
              const SizedBox(height: Space.sm),
              Text('A little more room\nfor what matters.', style: Theme.of(context).textTheme.displaySmall),
            ],
          ),
        ),
        const SizedBox(height: Space.xl),
        Rise(
          index: 1,
          child: BrandPanel(
            eyebrow: session.signedIn ? 'YOUR REGISTER' : 'NOT SIGNED IN',
            title: session.signedIn ? 'The register is\none tap away.' : 'Sign in to read\nyour school.',
            body: session.signedIn
                ? 'Read-only. Your school rules still decide which learners you can see.'
                : 'Use the Google account your school already uses. Nothing is cached on the phone.',
            actionLabel: session.signedIn ? 'Open the register' : 'Check the connection',
            onAction: session.signedIn ? onOpenRegister : onOpenMore,
          ),
        ),
        const SizedBox(height: Space.xl),
        // The data source is named on the screen itself, signed in or not: a
        // person must never have to guess whether these figures are real.
        SectionHead(title: 'This session', trailing: session.sourceLabel),
        const SizedBox(height: Space.md),
        Rise(
          index: 2,
          child: ShuleCard(
            child: session.signedIn
                ? _Metrics(rows: rows, classes: classes.length, withFees: withFees, owed: owed)
                : Text(
                    'Nothing has been read yet, so there is nothing to count. '
                    'Load the register and these figures fill in from the page you loaded.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
                  ),
          ),
        ),
        const SizedBox(height: Space.xs),
        Padding(
          padding: const EdgeInsets.only(top: Space.sm),
          child: Text(
            session.signedIn
                ? 'Counts cover the ${countLabel(rows.length)} on the page you loaded, '
                    'not the whole school.'
                : 'No figures are shown before a read, on purpose.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Where to go'),
        const SizedBox(height: Space.md),
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Rise(
                  index: 3,
                  child: FeatureTile(
                    doodle: Doodle.book,
                    title: 'Learners',
                    caption: 'The register, page by page',
                    onTap: onOpenRegister,
                  ),
                ),
              ),
              const SizedBox(width: Space.md),
              Expanded(
                child: Rise(
                  index: 4,
                  child: FeatureTile(
                    doodle: Doodle.registers,
                    title: 'School day',
                    caption: 'Practice attendance',
                    onTap: onOpenDay,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.xl),
        Rise(
          index: 5,
          child: Notice(
            title: session.signedIn ? 'What is not here yet' : 'This build',
            body: session.signedIn
                ? 'No payments, no offline capture and no writes of any kind. Closing the '
                    'app ends the practice attendance sheet.'
                : 'If this build has no Firebase values, connecting will say so plainly '
                    'instead of failing silently. The sample preview always works.',
          ),
        ),
      ],
    );
  }
}

class _Metrics extends StatelessWidget {
  const _Metrics({
    required this.rows,
    required this.classes,
    required this.withFees,
    required this.owed,
  });

  final List<Learner> rows;
  final int classes;
  final int withFees;
  final double owed;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final divider = Container(width: 1, color: tokens.border, height: 44);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: MetricBlock(value: '${rows.length}', label: 'on this page')),
            divider,
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: Space.md),
                child: MetricBlock(value: '$classes', label: classes == 1 ? 'class' : 'classes'),
              ),
            ),
            divider,
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(left: Space.md),
                child: MetricBlock(
                  value: '$withFees',
                  label: withFees == 1 ? 'balance open' : 'balances open',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: Space.lg),
        Container(height: 1, color: tokens.border),
        const SizedBox(height: Space.md),
        Row(
          children: [
            Expanded(
              child: Text(
                owed == 0
                    ? 'No open balance on this page.'
                    : '${formatTzs(owed)} outstanding on this page.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.ink),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
