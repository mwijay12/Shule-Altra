/// The honest page: what this build is, what it is not, and how to leave it.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/school_config.dart';
import '../design/doodles.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({
    super.key,
    required this.session,
    required this.isSample,
    required this.onSignOut,
    required this.onRestart,
    required this.onToggleTheme,
    required this.isDark,
  });

  final AppSession session;
  final bool isSample;
  final VoidCallback onSignOut;
  final VoidCallback onRestart;
  final VoidCallback onToggleTheme;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    const config = SchoolFirebaseConfig.fromEnvironment;

    return ListView(
      padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.xxl),
      children: [
        const BrandBar(),
        const SizedBox(height: Space.xl),
        Text('Built with care,\nand with limits.', style: Theme.of(context).textTheme.displaySmall),
        const SizedBox(height: Space.sm),
        Text(
          'Shule Altra mobile is an early read-only pilot. This page is the whole list of '
          'what it does and does not do, so nobody has to discover it by accident.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
        ),
        const SizedBox(height: Space.xl),
        SectionHead(title: 'Connection', trailing: session.sourceLabel),
        const SizedBox(height: Space.md),
        ShuleCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FactRow(label: 'Mode', value: isSample ? 'Sample preview (fictional data)' : 'Live school read'),
              FactRow(
                label: 'Account',
                value: !session.signedIn
                    ? 'Not signed in'
                    : session.demoIdentity != null
                        ? 'Demo · ${session.demoIdentity!.email}'
                        : (isSample ? 'Sample staff session' : 'Signed in'),
              ),
              FactRow(
                label: 'Firebase',
                value: config.isComplete
                    ? (config.projectMatches ? 'Configured · ${config.projectId}' : 'Project id mismatch')
                    : 'No values in this build',
              ),
              const SizedBox(height: Space.sm),
              Text(
                isSample
                    ? 'The sample preview reads fictional learners from this phone. It never '
                        'contacts Firebase, and switching to the live register starts a new '
                        'sign-in.'
                    : 'Live reads go to the school project over the network. No learner data '
                        'is written to the phone.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              if (session.signedIn) ...[
                const SizedBox(height: Space.lg),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: session.busy ? null : onSignOut,
                    child: const Text('Sign out'),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'What is not here'),
        const SizedBox(height: Space.md),
        const Notice(
          title: 'No writes, no payments, no offline',
          body: 'Attendance cannot be recorded, fees cannot be paid, and nothing works '
              'without a connection. Those are not switched off in this build; they do not '
              'exist in it yet.',
          tone: NoticeTone.caution,
        ),
        const SizedBox(height: Space.md),
        const Notice(
          title: 'No notifications',
          body: 'The app sends nothing and schedules nothing. If something needs your '
              'attention, you will only see it when you open the app.',
        ),
        const SizedBox(height: Space.md),
        const Notice(
          title: 'No caching of learner data',
          body: 'Each register page is read from the school when you ask for it. A signed-out '
              'or offline phone shows a message, not a stored copy of the register.',
          tone: NoticeTone.done,
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Appearance'),
        const SizedBox(height: Space.md),
        ShuleCard(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(isDark ? 'Night theme' : 'Day theme', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(
                      'Both themes are complete. Motion follows the phone\'s own '
                      '"remove animations" setting.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: Space.md),
              Switch(
                value: isDark,
                onChanged: (_) => onToggleTheme(),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Start again'),
        const SizedBox(height: Space.md),
        ShuleCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Returns to onboarding and clears this session. Nothing is saved, so nothing '
                'is lost.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: Space.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onRestart,
                  icon: const Icon(Icons.restart_alt_rounded, size: 20),
                  label: const Text('Back to the start'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.xxl),
        ExcludeSemantics(
          child: Center(
            child: DoodleView(doodle: Doodle.mark, size: 56, color: tokens.inkMuted),
          ),
        ),
        const SizedBox(height: Space.md),
        Center(
          child: Text(
            'Shule Altra · mobile pilot · read-only',
            style: Theme.of(context).textTheme.labelSmall,
          ),
        ),
      ],
    );
  }
}
