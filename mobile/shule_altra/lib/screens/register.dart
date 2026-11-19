/// The learner register: the screen the SVGs were drawing.
///
/// It has to carry four states honestly — signed out, loading, failed, and a
/// page of learners — plus search and paging. Every one of them says what is
/// happening in words; none of them shows a stale row.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/learner.dart';
import '../design/doodles.dart';
import '../design/motion.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import 'demo_sign_in.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.session,
    this.isSample = false,
    required this.onSignIn,
    required this.onOpenLearner,
  });

  final AppSession session;
  final bool isSample;
  final VoidCallback onSignIn;
  final ValueChanged<Learner> onOpenLearner;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _search = TextEditingController();
  String _query = '';
  bool _requestedFirstPage = false;
  String? _classFilter;
  String? _streamFilter;
  String _attendanceFilter = 'All';
  int _filterVersion = 0;
  String? _observedUid;
  LoadState _observedState = LoadState.idle;

  @override
  void initState() {
    super.initState();
    widget.session.addListener(_onSessionChanged);
  }

  @override
  void dispose() {
    widget.session.removeListener(_onSessionChanged);
    _search.dispose();
    super.dispose();
  }

  void _clearFilters() {
    _search.clear();
    _query = '';
    _classFilter = null;
    _streamFilter = null;
    _attendanceFilter = 'All';
    _filterVersion++;
  }

  void _onSessionChanged() {
    final session = widget.session;
    final changedAccount = _observedUid != session.uid;
    final startedRead = session.state == LoadState.loading && _observedState != LoadState.loading;
    _observedUid = session.uid;
    _observedState = session.state;
    if (!session.signedIn) _requestedFirstPage = false;
    // Page-only controls cannot survive a new read or an account change.
    if (changedAccount || startedRead) setState(_clearFilters);
  }

  /// Loads the first page after the frame that first needs it.
  ///
  /// Deferred on purpose: [AppSession.loadFirstPage] notifies listeners
  /// synchronously, and notifying during a build would be a framework error.
  void _scheduleFirstLoad() {
    if (_requestedFirstPage) return;
    if (!widget.session.signedIn) return;
    if (widget.session.state != LoadState.idle) return;
    _requestedFirstPage = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      widget.session.loadFirstPage();
    });
  }

  @override
  Widget build(BuildContext context) {
    _scheduleFirstLoad();
    final session = widget.session;
    final tokens = ShuleTokens.of(context);

    return RefreshIndicator(
      onRefresh: session.signedIn ? session.loadFirstPage : () async {},
      color: tokens.primary,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        // Room to scroll the demo password field above the keyboard.
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(Space.gutter, Space.lg, Space.gutter, Space.xxl),
        children: [
          const BrandBar(),
          const SizedBox(height: Space.xl),
          Text('Learners', style: Theme.of(context).textTheme.displaySmall),
          const SizedBox(height: Space.sm),
          Text(
            session.signedIn
                ? '${widget.isSample ? 'Fictional sample' : 'Online'} · read-only · ${session.sourceLabel}'
                : 'Sign in to read the register.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: Space.xl),
          if (!session.resolved)
            const _Busy(label: 'Checking your session…')
          else if (!session.signedIn)
            _SignedOut(session: session, onSignIn: widget.onSignIn)
          else
            ..._body(context, session),
        ],
      ),
    );
  }

  List<Widget> _body(BuildContext context, AppSession session) {
    final tokens = ShuleTokens.of(context);
    final failure = session.failure;

    if (session.state == LoadState.loading && session.rows.isEmpty) {
      return <Widget>[
        _Busy(label: widget.isSample ? 'Opening the fictional register…' : 'Reading the register from the school…'),
        const SizedBox(height: Space.lg),
        Notice(
          title: widget.isSample ? 'Fictional preview' : 'Server read, no cache',
          body: widget.isSample
              ? 'This page uses the sample on this device, not school records.'
              : 'Every page is a fresh server read. If the connection drops you get an explanation, never yesterday’s list.',
        ),
      ];
    }

    if (failure != null && session.rows.isEmpty) {
      return [
        Notice(title: 'Could not load learners', body: failure, tone: NoticeTone.danger),
        const SizedBox(height: Space.lg),
        Row(
          children: [
            Expanded(
              child: GradientButton(
                label: 'Try again',
                onPressed: session.busy ? null : session.loadFirstPage,
              ),
            ),
            const SizedBox(width: Space.md),
            OutlinedButton(
              onPressed: session.busy ? null : session.signOut,
              child: const Text('Sign out'),
            ),
          ],
        ),
      ];
    }

    final classes = session.rows.map((row) => row.className).toSet().toList()..sort();
    final streams = session.rows.map((row) => row.stream).where((value) => value.isNotEmpty).toSet().toList()..sort();
    final filtersActive = (_query.isNotEmpty ? 1 : 0) + (_classFilter == null ? 0 : 1) +
        (_streamFilter == null ? 0 : 1) + (_attendanceFilter == 'All' ? 0 : 1);
    final shown = session.rows.where((row) {
      final attendance = row.attendanceStatus.toLowerCase();
      final known = ['present', 'absent', 'late'].contains(attendance);
      return row.matches(_query) &&
          (_classFilter == null || row.className == _classFilter) &&
          (_streamFilter == null || (_streamFilter == 'missing' ? row.stream.isEmpty : 'value:${row.stream}' == _streamFilter)) &&
          (_attendanceFilter == 'All' || (_attendanceFilter == 'Other or not set' ? !known : attendance == _attendanceFilter.toLowerCase()));
    }).toList();
    final reading = session.state == LoadState.loading;

    return [
      Container(
        padding: const EdgeInsets.all(Space.lg),
        decoration: BoxDecoration(
          color: tokens.mutedSurface,
          borderRadius: BorderRadius.circular(Corners.panel),
          border: Border.all(color: tokens.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.manage_search_rounded, color: tokens.primary),
            const SizedBox(width: Space.md),
            Expanded(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Find a learner', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: Space.xs),
                Text('Search and filters only cover the loaded page, not the whole school.',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            )),
          ],
        ),
      ),
      const SizedBox(height: Space.md),
      TextField(
        controller: _search,
        onChanged: (value) => setState(() => _query = value.trim()),
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: 'Search name, class, stream or ID',
          helperText: 'Loaded page only',
          prefixIcon: const Icon(Icons.search_rounded),
          suffixIcon: _query.isEmpty
              ? null
              : IconButton(
                  tooltip: 'Clear search',
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () {
                    _search.clear();
                    setState(() => _query = '');
                  },
                ),
        ),
      ),
      const SizedBox(height: Space.sm),
      Card(
        child: ExpansionTile(
          title: const Text('Refine this page'),
          subtitle: Text(filtersActive == 0 ? 'Class, stream and stored attendance' :
              '$filtersActive page filter${filtersActive == 1 ? '' : 's'} active'),
          childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            DropdownButtonFormField<String>(
              key: ValueKey('class-$_filterVersion'),
              value: _classFilter, isExpanded: true,
              decoration: const InputDecoration(labelText: 'Class · this page only'),
              items: [const DropdownMenuItem(value: null, child: Text('All classes on page')),
                ...classes.map((value) => DropdownMenuItem(value: value, child: Text(value)))],
              onChanged: (value) => setState(() => _classFilter = value),
            ),
            const SizedBox(height: Space.md),
            DropdownButtonFormField<String>(
              key: ValueKey('stream-$_filterVersion'),
              value: _streamFilter, isExpanded: true,
              decoration: const InputDecoration(labelText: 'Stream · this page only'),
              items: [const DropdownMenuItem(value: null, child: Text('All streams on page')),
                const DropdownMenuItem(value: 'missing', child: Text('Stream not recorded')),
                ...streams.map((value) => DropdownMenuItem(value: 'value:$value', child: Text(value)))],
              onChanged: (value) => setState(() => _streamFilter = value),
            ),
            const SizedBox(height: Space.md),
            DropdownButtonFormField<String>(
              key: ValueKey('attendance-$_filterVersion'),
              value: _attendanceFilter, isExpanded: true,
              decoration: const InputDecoration(labelText: 'Stored attendance · this page only'),
              items: const ['All', 'Present', 'Absent', 'Late', 'Other or not set']
                  .map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
              onChanged: (value) { if (value != null) setState(() => _attendanceFilter = value); },
            ),
            const SizedBox(height: Space.sm),
            const Text('Latest stored status only; it has no date and may not be from today.'),
          ],
        ),
      ),
      if (filtersActive > 0)
        Align(alignment: Alignment.centerLeft, child: TextButton.icon(
          onPressed: () => setState(_clearFilters),
          icon: const Icon(Icons.filter_alt_off_outlined), label: const Text('Clear all page filters'),
        )),
      const SizedBox(height: Space.sm),
      Text(
        filtersActive == 0
            ? '${countLabel(session.rows.length)} on this page'
            : '${shown.length} of ${countLabel(session.rows.length)} match page filters',
        style: Theme.of(context).textTheme.bodySmall,
      ),
      const SizedBox(height: Space.lg),
      if (shown.isEmpty)
        EmptyState(
          title: filtersActive == 0 ? 'This page is empty' : 'No learner on this page matches',
          body: filtersActive == 0
              ? 'The school may have no learners, or your account may only see a part of '
                  'the register. Pull down to read again.'
              : 'Filters only cover the page you have loaded. Change them or move to another page.',
          doodle: Doodle.sparkles,
        )
      else
        ...shown.asMap().entries.map(
              (entry) => Rise(
                index: entry.key,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: Space.sm),
                  child: _LearnerRow(
                    learner: entry.value,
                    onTap: () => widget.onOpenLearner(entry.value),
                  ),
                ),
              ),
            ),
      const SizedBox(height: Space.lg),
      if (reading)
        const _Busy(label: 'Reading…')
      else
        // Both buttons flex and their labels shrink to fit, so a long label or a
        // large text setting cannot push either one off the screen.
        Row(
          children: [
            Flexible(
              child: OutlinedButton(
                onPressed: session.canGoBack ? session.loadPreviousPage : null,
                child: const FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text('Previous'),
                ),
              ),
            ),
            const SizedBox(width: Space.md),
            Flexible(
              child: GradientButton(
                label: session.canGoForward ? 'Next page' : 'End of register',
                onPressed: session.canGoForward ? session.loadNextPage : null,
                expand: false,
              ),
            ),
          ],
        ),
      const SizedBox(height: Space.lg),
      Notice(
        title: 'Read-only register',
        body: 'Names, classes and guardian contacts come from the page you just loaded and '
            'can change at the school while you read them. Nothing on this screen is saved '
            'to the phone.',
        tone: NoticeTone.info,
      ),
      if (session.busy)
        Padding(
          padding: const EdgeInsets.only(top: Space.md),
          child: Text(
            'A read is in progress; the page buttons are disabled until it finishes.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted),
          ),
        ),
    ];
  }
}

class _SignedOut extends StatelessWidget {
  const _SignedOut({required this.session, required this.onSignIn});

  final AppSession session;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        StickerPop(
          child: SizedBox(
            height: 168,
            width: double.infinity,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: tokens.mutedSurface,
                borderRadius: BorderRadius.circular(Corners.hero),
              ),
              child: Center(
                child: Image.asset(
                  'assets/images/connection_cutout.png',
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  errorBuilder: (context, error, stackTrace) => const DoodleView(doodle: Doodle.building, size: 104),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: Space.xl),
        Text(
          session.acceptsDemoCredential
              ? 'A sample register,\nbehind a demo sign-in.'
              : 'The register is behind\nyour school account.',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: Space.sm),
        Text(
          session.acceptsDemoCredential
              ? 'Six fictional learners, stored on this phone, with a credential printed '
                'on the form. Nothing here is a real school and nothing is sent anywhere.'
              : 'Sign in with the Google account your school already uses. Your school\'s '
                'Firestore rules decide what you can read — the app does not widen that.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.inkMuted),
        ),
        const SizedBox(height: Space.lg),
        if (session.acceptsDemoCredential)
          // The sample register, opened with the demo credential that is printed
          // on the form itself.
          DemoSignInForm(session: session)
        else ...[
          GradientButton(
            label: session.busy ? 'Signing in…' : 'Continue with Google',
            onPressed: session.busy ? null : onSignIn,
            busy: session.busy,
            icon: Icons.login_rounded,
          ),
          if (session.failure != null) ...[
            const SizedBox(height: Space.md),
            Notice(
              title: 'Sign-in did not complete',
              body: session.failure!,
              tone: NoticeTone.danger,
            ),
          ],
        ],
        const SizedBox(height: Space.lg),
        const Notice(
          title: 'Read-only pilot',
          body: 'Learner and guardian details are readable on an approved account and a '
              'trusted phone. Nothing can be edited, marked or paid from here.',
        ),
      ],
    );
  }
}

class _LearnerRow extends StatelessWidget {
  const _LearnerRow({required this.learner, required this.onTap});

  final Learner learner;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final owes = (learner.balance ?? 0) > 0;
    return Material(
      color: tokens.surface,
      borderRadius: BorderRadius.circular(Corners.panel),
      child: InkWell(
        borderRadius: BorderRadius.circular(Corners.panel),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
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
                    const SizedBox(height: 2),
                    Text(
                      learner.stream.isEmpty ? learner.className : '${learner.className} · ${learner.stream}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (owes)
                Padding(
                  padding: const EdgeInsets.only(right: Space.sm),
                  child: Text(
                    'Balance due',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.warning),
                  ),
                ),
              Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class _Busy extends StatelessWidget {
  const _Busy({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xxl),
      child: Column(
        children: [
          SizedBox.square(
            dimension: 26,
            child: CircularProgressIndicator(strokeWidth: 2.6, color: tokens.primary),
          ),
          const SizedBox(height: Space.md),
          Text(label, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}
