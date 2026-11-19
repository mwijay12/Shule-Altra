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
    final hasPage = session.signedIn && session.state == LoadState.ready;
    final unknownBalances = rows.where((row) => row.balance == null).length;
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
              Text('Your school workspace', style: Theme.of(context).textTheme.titleMedium?.copyWith(color: tokens.primary)),
              const SizedBox(height: Space.sm),
              Text('A clearer start\nto your school day.', style: Theme.of(context).textTheme.displaySmall),
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
            actionLabel: session.signedIn ? 'Open the register' : 'Sign in',
            onAction: onOpenRegister,
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
            child: hasPage
                ? _Metrics(rows: rows, classes: classes.length, withFees: withFees, owed: owed, unknownBalances: unknownBalances)
                : Text(
                    !session.signedIn ? 'Sign in and load the register to see a page summary.' :
                    session.state == LoadState.loading ? 'Reading your register…' :
                    session.state == LoadState.failed ? 'The register could not be read. Open Learners to try again.' :
                    'Open Learners to load a page before showing a summary.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
                  ),
          ),
        ),
        const SizedBox(height: Space.xs),
        Padding(
          padding: const EdgeInsets.only(top: Space.sm),
          child: Text(
            hasPage
                ? 'Counts cover the ${countLabel(rows.length)} on the page you loaded, '
                    'not the whole school.'
                : 'No figures are shown until a page is read.',
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
    required this.unknownBalances,
  });

  final List<Learner> rows;
  final int classes;
  final int withFees;
  final double owed;
  final int unknownBalances;

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
                unknownBalances == rows.length && rows.isNotEmpty
                    ? 'Balances are not recorded for this page.'
                    : owed == 0
                        ? (unknownBalances > 0 ? 'No recorded open balance; some balances are unavailable.' : 'No open balance on this page.')
                        : '${formatTzs(owed)} outstanding on this page${unknownBalances > 0 ? ' · some balances unavailable' : ''}.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.ink),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
