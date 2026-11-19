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
    required this.onThemeChanged,
    required this.themeMode,
    required this.appearanceNotice,
    required this.appearancePersistent,
  });

  final AppSession session;
  final bool isSample;
  final VoidCallback onSignOut;
  final VoidCallback onRestart;
  final ValueChanged<ThemeMode> onThemeChanged;
  final ThemeMode themeMode;
  final String? appearanceNotice;
  final bool appearancePersistent;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    const config = SchoolFirebaseConfig.fromEnvironment;

    Future<void> confirmRestart() async {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Return to the start?'),
          content: Text(session.signedIn
              ? 'You will be signed out. Fictional practice marks will be discarded. No school records are changed.'
              : 'Return to the school or sample choice. Fictional practice marks will be discarded. No school records are changed.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Stay here')),
            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sign out and return')),
          ],
        ),
      );
      if (confirmed == true && context.mounted && !session.busy && session.resolved) {
        onRestart();
      }
    }

    return LayoutBuilder(builder: (context, constraints) {
      final gutter = constraints.maxWidth > 760 ? (constraints.maxWidth - 712) / 2 : Space.gutter;
      return ListView(
      padding: EdgeInsets.fromLTRB(gutter, Space.lg, gutter, Space.xxl),
      children: [
        const BrandBar(),
        const SizedBox(height: Space.xl),
        Text('Settings & account', style: Theme.of(context).textTheme.displaySmall),
        const SizedBox(height: Space.sm),
        Text('Manage this session, appearance and understand the limits of this pilot.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted)),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Connection'),
        const SizedBox(height: Space.sm),
        Text(session.sourceLabel, style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: Space.md),
        ShuleCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FactRow(label: 'Mode', value: isSample ? 'Sample preview (fictional data)' : 'Live school read'),
              FactRow(
                label: 'Account',
                value: !session.resolved
                    ? 'Checking session…'
                    : !session.signedIn
                    ? 'Not signed in'
                    : session.demoIdentity != null
                        ? 'Demo · ${session.demoIdentity!.email}'
                        : (isSample ? 'Sample staff session' : 'Signed in'),
              ),
              FactRow(
                label: 'Firebase',
                value: config.isComplete
                    ? (config.projectMatches ? 'Values present · ${config.projectId} (not verified)' : 'Project id mismatch')
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
              if (session.failure != null) ...[
                const SizedBox(height: Space.md),
                Notice(title: 'Action not completed', body: session.failure!, tone: NoticeTone.danger),
              ],
              if (session.signedIn) ...[
                const SizedBox(height: Space.lg),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: session.canSignOut ? onSignOut : null,
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
          title: 'No writes, no payments, no offline capture',
          body: 'Attendance cannot be recorded and fees cannot be paid. Live reads require a '
              'connection; the fictional sample works without Firebase.',
          tone: NoticeTone.caution,
        ),
        const SizedBox(height: Space.md),
        const Notice(
          title: 'No notifications',
          body: 'The app sends nothing and schedules nothing. If something needs your '
              'attention, you will only see it when you open the app.',
        ),
        const SizedBox(height: Space.md),
        Notice(
          title: 'No caching of live learner data',
          body: isSample
              ? 'Sample learners are bundled fictional data. Live school pages are read from the server rather than shown from a cache.'
              : 'Each register page is read from the school when you ask for it. A signed-out or offline phone shows a message, not a stored copy of the register.',
          tone: NoticeTone.done,
        ),
        const SizedBox(height: Space.xl),
        const SectionHead(title: 'Appearance'),
        const SizedBox(height: Space.md),
        ShuleCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Choose your appearance', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: Space.sm),
              Text(
                appearancePersistent
                    ? 'Follow system uses your phone’s theme. Your selection is stored on this device when available.'
                    : 'Follow system uses your phone’s theme. Your choice lasts until the app closes.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: Space.sm),
              Text('Motion follows your phone’s accessibility setting.', style: Theme.of(context).textTheme.bodySmall),
              if (appearanceNotice != null) ...[
                const SizedBox(height: Space.md),
                Notice(title: 'Appearance preference', body: appearanceNotice!, tone: NoticeTone.caution),
              ],
              for (final option in <(ThemeMode, String)>[
                (ThemeMode.system, 'Follow system'),
                (ThemeMode.light, 'Light'),
                (ThemeMode.dark, 'Dark'),
              ])
                RadioListTile<ThemeMode>(
                  contentPadding: EdgeInsets.zero,
                  title: Text(option.$2),
                  value: option.$1,
                  groupValue: themeMode,
                  onChanged: (value) { if (value != null) onThemeChanged(value); },
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
                'Signs out and returns to the school or sample choice. If sign-out fails, '
                'stay here and try again. The introduction preference remains on this device.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: Space.md),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: session.busy || !session.resolved ? null : confirmRestart,
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
    });
  }
}
