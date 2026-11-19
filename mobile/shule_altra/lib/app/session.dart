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

import '../data/demo_credentials.dart';
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
  bool _authInFlight = false;
  bool _signingOut = false;
  String? _lastFailure;

  LoadState _state = LoadState.idle;
  List<Learner> _rows = const [];
  DateTime? _lastReadAt;

  /// The cursor that fetched the page on screen, and the cursor for the page
  /// after it. Two different values: paging backwards needs the cursor that
  /// produced this page, not the one that would leave it.
  Object? _pageCursor;
  Object? _forwardCursor;
  final List<Object?> _history = [];

  bool _disposed = false;
  int _generation = 0;

  /// The signed-in uid, or null.
  String? get uid => _uid;

  /// False until the first session event arrives.
  bool get resolved => _resolved;

  bool get signedIn => _uid != null;

  /// True while a sign-in, sign-out or page read is in flight.
  bool get busy => _busy || _authInFlight || _signingOut;

  /// True from the moment sign-out starts until it succeeds or fails.
  bool get signingOut => _signingOut;

  /// Changes whenever private page data becomes invalid, including sign-out.
  int get dataRevision => _generation;

  /// A sentence to show the person, or null.
  String? get failure => _lastFailure;

  LoadState get state => _state;

  List<Learner> get rows => _rows;

  /// Time the current page finished loading, on this device. Not server freshness.
  DateTime? get lastReadAt => _lastReadAt;

  bool get canGoBack => _history.isNotEmpty;

  bool get canGoForward => _forwardCursor != null;

  String get sourceLabel => gateway.sourceLabel;

  Future<void> start() async {
    _subscription ??= gateway.sessionUid.listen(
      _onSession,
      onError: (Object error) {
        _uid = null;
        _forgetPages();
        _state = LoadState.idle;
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

  /// Which door this data source offers: a school's Google account, or the demo
  /// credential. The screen asks, rather than assuming.
  bool get acceptsDemoCredential => gateway.acceptsDemoCredential;

  /// The demo account that is open, or null.
  DemoIdentity? get demoIdentity => gateway.demoIdentity;

  Future<void> signIn() => _run(() => gateway.signIn());

  Future<void> signInWithDemo(String email, String password) =>
      _run(() => gateway.signInWithDemo(email, password));

  /// Clear visible data first and only report success after the gateway signs out.
  /// A failed sign-out keeps the current route open and can be retried.
  Future<bool> signOut() async {
    if (_signingOut || _authInFlight) return false;
    _signingOut = true;
    _clearRows();
    try {
      await gateway.signOut();
      return true;
    } on GatewayFailure catch (error) {
      if (!_disposed) _lastFailure = error.message;
      return false;
    } catch (_) {
      if (!_disposed) _lastFailure = 'Could not sign out. Try again.';
      return false;
    } finally {
      _signingOut = false;
      _notify();
    }
  }

  void _clearRows() {
    _forgetPages();
    _state = LoadState.idle;
    _lastFailure = null;
    _notify();
  }

  void _forgetPages() {
    // Any in-flight operation belongs to the old session and may not publish.
    _generation++;
    _busy = false;
    _rows = const [];
    _lastReadAt = null;
    _pageCursor = null;
    _forwardCursor = null;
    _history.clear();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (busy) return;
    final generation = _generation;
    _authInFlight = true;
    _busy = true;
    _lastFailure = null;
    _notify();
    try {
      await action();
    } on GatewayFailure catch (error) {
      if (!_disposed && generation == _generation) _lastFailure = error.message;
    } catch (_) {
      if (!_disposed && generation == _generation) {
        _lastFailure = 'That did not complete. Check the connection and try again.';
      }
    } finally {
      _authInFlight = false;
      if (!_disposed && generation == _generation) _busy = false;
      _notify();
    }
  }

  /// The first page. Called by the register when it opens and when it refreshes.
  Future<void> loadFirstPage() async {
    if (busy || !signedIn) return;
    _history.clear();
    await _load(after: null);
  }

  Future<void> loadNextPage() async {
    if (busy || !signedIn || _forwardCursor == null) return;
    final target = _forwardCursor;
    // Coming back means asking for the page that is on screen now, so remember
    // how *it* was fetched.
    _history.add(_pageCursor);
    await _load(after: target);
  }

  Future<void> loadPreviousPage() async {
    if (busy || !signedIn || _history.isEmpty) return;
    final cursor = _history.removeLast();
    await _load(after: cursor);
  }

  Future<void> _load({required Object? after}) async {
    final generation = _generation;
    final uid = _uid;
    _busy = true;
    _state = LoadState.loading;
    _lastFailure = null;
    _notify();
    try {
      final page = await gateway.loadLearners(after: after);
      if (_disposed || generation != _generation || uid != _uid) return;
      _pageCursor = after;
      _forwardCursor = page.nextCursor;
      _rows = page.rows;
      _lastReadAt = DateTime.now();
      _state = LoadState.ready;
    } on GatewayFailure catch (error) {
      if (_disposed || generation != _generation || uid != _uid) return;
      _rows = const [];
      _lastReadAt = null;
      _state = LoadState.failed;
      _lastFailure = error.message;
    } catch (_) {
      if (_disposed || generation != _generation || uid != _uid) return;
      _rows = const [];
      _lastReadAt = null;
      _state = LoadState.failed;
      _lastFailure = 'The register could not be read. Check the connection and try again.';
    } finally {
      if (!_disposed && generation == _generation && uid == _uid) {
        _busy = false;
        _notify();
      }
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
