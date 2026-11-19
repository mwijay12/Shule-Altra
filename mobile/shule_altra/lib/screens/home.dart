/// The home workspace. Page summaries are deliberately not school-wide totals.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../design/doodles.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({
    super.key,
    required this.session,
    this.isSample = false,
    required this.onOpenRegister,
    required this.onOpenDay,
    required this.onOpenMore,
  });

  final AppSession session;
  final bool isSample;
  final VoidCallback onOpenRegister;
  final VoidCallback onOpenDay;
  final VoidCallback onOpenMore;

  @override
  Widget build(BuildContext context) {
    final rows = session.rows;
    final hasPage = session.signedIn && session.state == LoadState.ready;
    final unknownBalances = rows.where((row) => row.balance == null).length;
    final unknownClasses = rows.where((row) => row.className == Learner.missingClass || row.className.trim().isEmpty).length;
    final classes = <String>{for (final row in rows) if (row.className != Learner.missingClass && row.className.trim().isNotEmpty) row.className};
    final withFees = rows.where((row) => (row.balance ?? 0) > 0).length;
    final owed = rows.fold<double>(0, (sum, row) => sum + ((row.balance ?? 0) > 0 ? row.balance! : 0));

    return LayoutBuilder(builder: (context, constraints) {
      // Keep the workspace readable on tablets without changing phone gutters.
      final gutter = constraints.maxWidth > 760 ? (constraints.maxWidth - 712) / 2 : Space.gutter;
      return ListView(
        padding: EdgeInsets.fromLTRB(gutter, Space.lg, gutter, Space.xxl),
        children: [
          const BrandBar(),
          const SizedBox(height: Space.xl),
          _WelcomePanel(session: session, isSample: isSample, onOpenRegister: onOpenRegister),
          const SizedBox(height: Space.xxl),
          const SectionHead(title: 'Page overview'),
          const SizedBox(height: Space.sm),
          Text('${session.sourceLabel} · loaded page only, not the whole school.',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: Space.md),
          ShuleCard(
            child: hasPage
                ? _Metrics(rows: rows, classes: classes.length, unknownClasses: unknownClasses,
                    withFees: withFees, owed: owed, unknownBalances: unknownBalances)
                : _OverviewPlaceholder(session: session),
          ),
          if (hasPage && session.lastReadAt != null) ...[
            const SizedBox(height: Space.sm),
            Text(
              'Page read on this device ${localDateTime(session.lastReadAt!)} · reload in Learners for newer data.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          const SizedBox(height: Space.xxl),
          const SectionHead(title: 'Quick actions'),
          const SizedBox(height: Space.md),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(child: FeatureTile(doodle: Doodle.book, title: 'Learners',
                    caption: 'Search the loaded page', onTap: onOpenRegister)),
                const SizedBox(width: Space.md),
                Expanded(child: FeatureTile(doodle: Doodle.registers, title: 'School day',
                    caption: 'Practice and timetable', onTap: onOpenDay)),
              ],
            ),
          ),
          const SizedBox(height: Space.xl),
          Notice(
            title: 'A read-only pilot',
            body: 'No payments, attendance recording, offline capture or school data writes. '
                'Practice marks are fictional and disappear when you return to the start or close the app.',
            tone: NoticeTone.info,
          ),
          const SizedBox(height: Space.md),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onOpenMore,
              icon: const Icon(Icons.info_outline_rounded),
              label: const Text('About this build'),
            ),
          ),
        ],
      );
    });
  }
}

class _WelcomePanel extends StatelessWidget {
  const _WelcomePanel({required this.session, required this.isSample, required this.onOpenRegister});
  final AppSession session;
  final bool isSample;
  final VoidCallback onOpenRegister;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final intro = !session.resolved
        ? 'Checking your session…'
        : isSample
            ? 'Fictional learners only. This preview does not connect to a school.'
            : session.signedIn
                ? 'Read-only access. School permissions decide what you can see.'
                : 'Use your school’s Google account to open the read-only register.';
    return Container(
      padding: const EdgeInsets.all(Space.xl),
      decoration: BoxDecoration(
        gradient: tokens.washGradient,
        border: Border.all(color: tokens.border),
        borderRadius: BorderRadius.circular(Corners.hero),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(isSample ? 'SAMPLE WORKSPACE' : 'SCHOOL WORKSPACE',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.primary)),
                const SizedBox(height: Space.sm),
                Text('A clearer start\nto your school day.', style: Theme.of(context).textTheme.headlineSmall),
              ])),
              const SizedBox(width: Space.sm),
              SizedBox(
                width: MediaQuery.textScalerOf(context).scale(1) > 1.3 ? 70 : 100,
                height: 104,
                child: Image.asset('assets/images/learning_cutout.png', fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  errorBuilder: (context, error, stack) => const DoodleView(doodle: Doodle.book, size: 64)),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text(intro, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted)),
          const SizedBox(height: Space.lg),
          GradientButton(
            label: session.signedIn ? 'Open the register' : 'Sign in',
            onPressed: session.resolved ? onOpenRegister : null,
            icon: Icons.arrow_forward_rounded,
          ),
        ],
      ),
    );
  }
}

class _OverviewPlaceholder extends StatelessWidget {
  const _OverviewPlaceholder({required this.session});
  final AppSession session;

  @override
  Widget build(BuildContext context) {
    final message = !session.resolved ? 'Checking your session before showing a summary.' :
        !session.signedIn ? 'Sign in and load the register to see a page summary.' :
        session.state == LoadState.loading ? 'Reading your register…' :
        session.state == LoadState.failed ? 'The register could not be read. Open Learners to try again.' :
        'Open Learners to load a page before showing a summary.';
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(Icons.insights_outlined, color: ShuleTokens.of(context).primary),
      const SizedBox(width: Space.md),
      Expanded(child: Text(message, style: Theme.of(context).textTheme.bodyMedium)),
    ]);
  }
}

class _Metrics extends StatelessWidget {
  const _Metrics({required this.rows, required this.classes, required this.unknownClasses,
    required this.withFees, required this.owed, required this.unknownBalances});
  final List<Learner> rows;
  final int classes;
  final int unknownClasses;
  final int withFees;
  final double owed;
  final int unknownBalances;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    if (rows.isEmpty) {
      return Text('This page has no learners. It does not tell you the size of the whole school.',
          style: Theme.of(context).textTheme.bodyMedium);
    }
    final allClassesMissing = unknownClasses == rows.length;
    final allBalancesMissing = unknownBalances == rows.length;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: MetricBlock(value: '${rows.length}', label: 'learners on page')),
        Expanded(child: MetricBlock(value: allClassesMissing ? '—' : '$classes', label: 'recorded classes')),
        Expanded(child: MetricBlock(value: allBalancesMissing ? '—' : '$withFees', label: 'recorded balances due')),
      ]),
      const SizedBox(height: Space.lg),
      Container(height: 1, color: tokens.border),
      const SizedBox(height: Space.md),
      Text(
        allBalancesMissing ? 'Balances are not recorded for this page.' :
        owed == 0 ? (unknownBalances > 0 ? 'No recorded open balance; some balances are unavailable.' : 'No open balance on this page.') :
        '${formatTzs(owed)} in positive balances on this page${unknownBalances > 0 ? ' · some balances unavailable' : ''}.',
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.ink),
      ),
      if (unknownClasses > 0) ...[
        const SizedBox(height: Space.sm),
        Text('$unknownClasses ${unknownClasses == 1 ? 'learner has' : 'learners have'} no recorded class.',
            style: Theme.of(context).textTheme.bodySmall),
      ],
    ]);
  }
}
