/// Who is signed in, which gateway is in use, and what has been loaded.
///
/// One object owns this, so no screen has to guess. The rules it enforces, in
/// order, because each one is a bug in the current release if it is missing:
///
///  * **Records belong to a session.** When the uid changes, loaded rows are
///    discarded immediately — before the new sign-in finishes — so a learner's
///    guardian phone number cannot be left on screen under a different account.
///  * **Failures are not blank screens.** Every load ends in rows, in an
///    explanation, or in a spinner. Never in silence.
///  * **Sample and live never mix.** The gateway is chosen once, at start, and
///    the label it reports is shown on every register screen.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/learner.dart';
import '../data/school_gateway.dart';

enum LoadState { idle, loading, ready, failed }

class AppSession extends ChangeNotifier {
  AppSession(this.gateway);

  final SchoolGateway gateway;

  StreamSubscription<String?>? _subscription;

  String? _uid;
  bool _resolved = false;
  bool _busy = false;
  String? _lastFailure;

  LoadState _state = LoadState.idle;
  List<Learner> _rows = const [];

  /// The cursor that fetched the page on screen, and the cursor for the page
  /// after it. Two different values: paging backwards needs the cursor that
  /// produced this page, not the one that would leave it.
  Object? _pageCursor;
  Object? _forwardCursor;
  final List<Object?> _history = [];

  bool _disposed = false;

  /// The signed-in uid, or null.
  String? get uid => _uid;

  /// False until the first session event arrives.
  bool get resolved => _resolved;

  bool get signedIn => _uid != null;

  /// True while a sign-in, sign-out or page read is in flight.
  bool get busy => _busy;

  /// A sentence to show the person, or null.
  String? get failure => _lastFailure;

  LoadState get state => _state;

  List<Learner> get rows => _rows;

  bool get canGoBack => _history.isNotEmpty;

  bool get canGoForward => _forwardCursor != null;

  String get sourceLabel => gateway.sourceLabel;

  Future<void> start() async {
    _subscription ??= gateway.sessionUid.listen(
      _onSession,
      onError: (Object error) {
        _lastFailure = 'The sign-in session could not be checked. Try again.';
        _resolved = true;
        _notify();
      },
    );
  }

  void _onSession(String? uid) {
    _resolved = true;
    if (uid == _uid) {
      _notify();
      return;
    }
    _uid = uid;
    // A different account, or none: nothing loaded from the previous session may
    // survive, even briefly.
    _forgetPages();
    _state = LoadState.idle;
    _lastFailure = null;
    _notify();
  }

  Future<void> signIn() => _run(() => gateway.signIn());

  Future<void> signOut() async {
    _clearRows();
    await _run(() => gateway.signOut());
  }

  void _clearRows() {
    _forgetPages();
    _state = LoadState.idle;
    _lastFailure = null;
    _notify();
  }

  void _forgetPages() {
    _rows = const [];
    _pageCursor = null;
    _forwardCursor = null;
    _history.clear();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    _busy = true;
    _lastFailure = null;
    _notify();
    try {
      await action();
    } on GatewayFailure catch (error) {
      _lastFailure = error.message;
    } catch (_) {
      _lastFailure = 'That did not complete. Check the connection and try again.';
    } finally {
      _busy = false;
      _notify();
    }
  }

  /// The first page. Called by the register when it opens and when it refreshes.
  Future<void> loadFirstPage() async {
    if (_busy) return;
    _history.clear();
    await _load(after: null);
  }

  Future<void> loadNextPage() async {
    if (_busy || _forwardCursor == null) return;
    final target = _forwardCursor;
    // Coming back means asking for the page that is on screen now, so remember
    // how *it* was fetched.
    _history.add(_pageCursor);
    await _load(after: target);
  }

  Future<void> loadPreviousPage() async {
    if (_busy || _history.isEmpty) return;
    final cursor = _history.removeLast();
    await _load(after: cursor);
  }

  Future<void> _load({required Object? after}) async {
    _busy = true;
    _state = LoadState.loading;
    _lastFailure = null;
    _notify();
    try {
      final page = await gateway.loadLearners(after: after);
      _pageCursor = after;
      _forwardCursor = page.nextCursor;
      _rows = page.rows;
      _state = LoadState.ready;
    } on GatewayFailure catch (error) {
      _rows = const [];
      _state = LoadState.failed;
      _lastFailure = error.message;
    } catch (_) {
      _rows = const [];
      _state = LoadState.failed;
      _lastFailure = 'The register could not be read. Check the connection and try again.';
    } finally {
      _busy = false;
      _notify();
    }
  }

  void _notify() {
    if (_disposed) return;
    notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _subscription?.cancel();
    super.dispose();
  }
}
