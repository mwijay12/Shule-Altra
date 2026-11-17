import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/material.dart';

import 'main.dart' show muted, Brand, Notice;

/// Firebase Android client configuration is deliberately supplied at build time.
/// There is no implicit fallback to a different school or Firebase project.
class SchoolFirebaseConfig {
  final String projectId, expectedProjectId, apiKey, appId, senderId, googleWebClientId;
  const SchoolFirebaseConfig({required this.projectId, required this.expectedProjectId, required this.apiKey, required this.appId, required this.senderId, required this.googleWebClientId});
  static const fromEnvironment = SchoolFirebaseConfig(
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    expectedProjectId: String.fromEnvironment('FIREBASE_EXPECTED_PROJECT_ID'),
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    appId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
    senderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
    googleWebClientId: String.fromEnvironment('FIREBASE_GOOGLE_WEB_CLIENT_ID'),
  );
  bool get isValid => [projectId, expectedProjectId, apiKey, appId, senderId, googleWebClientId].every((value) => value.trim().isNotEmpty) && projectId == expectedProjectId;
  FirebaseOptions get options => FirebaseOptions(apiKey: apiKey, appId: appId, messagingSenderId: senderId, projectId: projectId);
}

class LiveLearner {
  final String name, className, status, guardianName, guardianPhone, guardianEmail;
  const LiveLearner(this.name, this.className, {this.status = '', this.guardianName = '', this.guardianPhone = '', this.guardianEmail = ''});

  factory LiveLearner.fromFirestore(Map<String, dynamic> data) {
    String text(String key) => data[key] is String ? (data[key] as String).trim() : '';
    final name = text('name'), className = text('class');
    return LiveLearner(name.isEmpty ? 'Unnamed learner' : name, className.isEmpty ? 'Class not set' : className,
      status: text('status'), guardianName: text('guardianName'), guardianPhone: text('guardianPhone'), guardianEmail: text('guardianEmail'));
  }
}

class LearnerPage {
  final List<LiveLearner> rows;
  final Object? nextCursor;
  const LearnerPage(this.rows, this.nextCursor);
}

/// Abstracted for widget tests. Authorization remains in Firebase rules.
abstract class SchoolGateway {
  Stream<String?> get sessionUid;
  Future<void> signInWithGoogle();
  Future<void> signOut();
  Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''});
}

class FirebaseSchoolGateway implements SchoolGateway {
  final FirebaseAuth auth;
  final FirebaseFirestore firestore;
  final GoogleSignIn google;
  FirebaseSchoolGateway(this.auth, this.firestore, this.google);
  @override Stream<String?> get sessionUid => auth.authStateChanges().map((user) => user?.uid);
  @override Future<void> signInWithGoogle() async {
    // Google uses its native Android account picker, then Firebase verifies the
    // resulting credential. Cancellation must not create a Firebase session.
    final account = await google.signIn();
    if (account == null) return;
    final tokens = await account.authentication;
    if (tokens.idToken == null || tokens.idToken!.isEmpty) throw StateError('Google did not return an ID token.');
    await auth.signInWithCredential(GoogleAuthProvider.credential(idToken: tokens.idToken, accessToken: tokens.accessToken));
  }
  @override Future<void> signOut() async {
    // Clear Firebase authorization even if the Google account-picker cleanup fails.
    await auth.signOut();
    await google.signOut();
  }
  @override Future<LearnerPage> loadLearners({Object? after, String namePrefix = ''}) async {
    // Force a fresh identity and server read. No offline data is shown in this
    // pilot; rules, not a UI role, authorize the collection query.
    final user = auth.currentUser;
    if (user == null) throw StateError('Sign in again.');
    await user.reload();
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    await user.getIdToken(true);
    Query<Map<String, dynamic>> query = firestore.collection('schools').doc('school-001').collection('students').orderBy('name');
    // Names are not consistently normalised in existing records. Prefix
    // matching is deliberately case-sensitive instead of inventing an index.
    if (namePrefix.isNotEmpty) query = query.endAt(['$namePrefix\uf8ff']);
    if (after != null) {
      if (after is! DocumentSnapshot<Map<String, dynamic>>) throw StateError('Invalid page cursor.');
      query = query.startAfterDocument(after);
    } else if (namePrefix.isNotEmpty) {
      query = query.startAt([namePrefix]);
    }
    // Fetch one extra document to tell whether another page exists.
    final result = await query.limit(41).get(const GetOptions(source: Source.server));
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    final visible = result.docs.take(40).toList();
    final rows = visible.map((doc) => LiveLearner.fromFirestore(doc.data())).toList();
    return LearnerPage(rows, result.docs.length > 40 ? visible.last : null);
  }
}

class LiveSchoolBootstrap extends StatefulWidget {
  const LiveSchoolBootstrap({super.key});
  @override State<LiveSchoolBootstrap> createState() => _LiveSchoolBootstrapState();
}
class _LiveSchoolBootstrapState extends State<LiveSchoolBootstrap> {
  // Firestore settings cannot be reconfigured after first use. Share one
  // initialisation for the lifetime of this process, including route re-entry.
  static Future<SchoolGateway>? _shared;
  late final Future<SchoolGateway> gateway = _shared ??= _initialise();
  static Future<SchoolGateway> _initialise() async {
    const config = SchoolFirebaseConfig.fromEnvironment;
    if (!config.isValid) throw StateError('Firebase Android configuration is missing or the project IDs do not match.');
    final existing = Firebase.apps.where((app) => app.name == 'school-live').toList();
    final app = existing.isEmpty ? await Firebase.initializeApp(name: 'school-live', options: config.options) : existing.single;
    if (app.options.projectId != config.projectId || app.options.appId != config.appId) throw StateError('Firebase configuration changed. Restart the app.');
    final firestore = FirebaseFirestore.instanceFor(app: app);
    firestore.settings = const Settings(persistenceEnabled: false);
    return FirebaseSchoolGateway(FirebaseAuth.instanceFor(app: app), firestore, GoogleSignIn(serverClientId: config.googleWebClientId));
  }
  @override Widget build(BuildContext context) => FutureBuilder<SchoolGateway>(future: gateway, builder: (context, snapshot) {
    if (snapshot.hasData) return LiveSchoolPage(gateway: snapshot.data!);
    return Scaffold(appBar: AppBar(title: const Text('Connect school')), body: Padding(padding: const EdgeInsets.all(24), child: snapshot.hasError
      ? const Notice(title: 'Configuration required', body: 'This build has no verified Firebase Android configuration, or setup failed. Check the mobile setup guide and restart the app. Your existing Firebase web connection is not changed.')
      : const Center(child: CircularProgressIndicator())));
  });
}

class _LearnerResult {
  final LearnerPage? page;
  const _LearnerResult(this.page);
}

class LiveSchoolPage extends StatefulWidget {
  final SchoolGateway gateway;
  const LiveSchoolPage({super.key, required this.gateway});
  @override State<LiveSchoolPage> createState() => _LiveSchoolPageState();
}
class _LiveSchoolPageState extends State<LiveSchoolPage> {
  late final Stream<String?> session = widget.gateway.sessionUid;
  String? lastUid;
  Future<_LearnerResult>? learners;
  bool busy = false;
  String? message;
  String query = '';
  String draftPrefix = '';
  String activePrefix = '';
  int globalSearchVersion = 0;
  int searchVersion = 0;
  Object? currentCursor;
  final List<Object?> previousCursors = [];
  Future<_LearnerResult> _loadSafely(Object? after) async {
    try { return _LearnerResult(await widget.gateway.loadLearners(after: after, namePrefix: activePrefix)); }
    catch (_) { return const _LearnerResult(null); }
  }
  void refresh() => setState(() { message = null; activePrefix = draftPrefix.trim(); previousCursors.clear(); currentCursor = null; query = ''; searchVersion++; learners = _loadSafely(null); });
  void nextPage(Object cursor) => setState(() { previousCursors.add(currentCursor); currentCursor = cursor; query = ''; searchVersion++; learners = _loadSafely(cursor); });
  void previousPage() => setState(() { currentCursor = previousCursors.removeLast(); query = ''; searchVersion++; learners = _loadSafely(currentCursor); });
  Future<void> signIn() async {
    setState(() { busy = true; message = null; });
    try { await widget.gateway.signInWithGoogle(); }
    catch (_) { if (mounted) setState(() => message = 'Sign-in did not complete. Check the connection and Android Google sign-in setup, then try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> signOut() async {
    setState(() { busy = true; learners = null; query = ''; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; currentCursor = null; previousCursors.clear(); message = null; });
    try { await widget.gateway.signOut(); }
    catch (_) { if (mounted) setState(() => message = 'Could not sign out. Check your connection and try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('School connection')),
    body: StreamBuilder<String?>(stream: session, builder: (context, snapshot) {
      if (snapshot.hasError) { learners = null; lastUid = null; currentCursor = null; previousCursors.clear(); query = ''; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; return const Padding(padding: EdgeInsets.all(24), child: Notice(title: 'Session unavailable', body: 'The sign-in session could not be checked. Try again.')); }
      if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
      if (lastUid != snapshot.data) { learners = null; query = ''; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; currentCursor = null; previousCursors.clear(); lastUid = snapshot.data; }
      if (snapshot.data == null) return ListView(padding: const EdgeInsets.all(24), children: [
        const Brand(), const SizedBox(height: 35),
        const Text('Your school, connected.', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
        const SizedBox(height: 12), const Text('Sign in with the Google account your school already uses. This early pilot displays learner and guardian details from the school register.', style: TextStyle(color: muted, height: 1.5)),
        const SizedBox(height: 24),
        FilledButton.icon(onPressed: busy ? null : signIn, icon: const Icon(Icons.login), label: const Text('Continue with Google')),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 16), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        const SizedBox(height: 22), const Notice(title: 'Online read-only pilot', body: 'Your school permissions still apply. Offline recording and synchronisation are not available yet.'),
      ]);
      return ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Learner register', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800)),
        const SizedBox(height: 7), const Text('Online · read-only · 40 per page', style: TextStyle(color: muted)),
        const SizedBox(height: 18),
        const Notice(title: 'Live school data', body: 'Use only an approved school account and a trusted device. School search matches the beginning of a name exactly, including capital letters. Results can change between reads.'),
        const SizedBox(height: 14),
        TextField(key: ValueKey('school-search-$globalSearchVersion'), maxLength: 100, onChanged: (value) => draftPrefix = value, onSubmitted: (_) => refresh(),
          textInputAction: TextInputAction.search, decoration: const InputDecoration(labelText: 'School name prefix', hintText: 'Match exact capital letters', prefixIcon: Icon(Icons.search))),
        const SizedBox(height: 12),
        Wrap(spacing: 8, children: [FilledButton.icon(onPressed: busy ? null : refresh, icon: const Icon(Icons.search), label: const Text('Search school')), OutlinedButton(onPressed: busy ? null : signOut, child: const Text('Sign out'))]),
        const SizedBox(height: 6),
        const Text('Leave empty to browse. Names without a name field are not included.', style: TextStyle(color: muted, fontSize: 12)),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        if (learners != null) FutureBuilder<_LearnerResult>(future: learners, builder: (context, data) {
          if (data.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
          if (data.hasError || data.data?.page == null) return const Padding(padding: EdgeInsets.only(top: 18), child: Notice(title: 'Could not load learners', body: 'Check your internet connection, session and school permissions, then try again. No cached results are shown.'));
          final rows = (data.data!.page!.rows).where((row) => '${row.name} ${row.className}'.toLowerCase().contains(query.toLowerCase())).toList();
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 18), TextField(key: ValueKey(searchVersion), onChanged: (value) => setState(() => query = value.trim()), decoration: const InputDecoration(labelText: 'Search loaded learners', prefixIcon: Icon(Icons.search))),
            const SizedBox(height: 14), Text('${rows.length} shown on this page${activePrefix.isEmpty ? '' : ' · name starts with “$activePrefix”'}', style: const TextStyle(color: muted)),
            if (rows.isEmpty) const Padding(padding: EdgeInsets.only(top: 14), child: Text('No matching learners in this page.')),
            ...rows.map((row) => Card(child: ExpansionTile(
              title: Text(row.name), subtitle: Text(row.className),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                const Text('Read-only details from this page load. Refresh the register for newer changes.', style: TextStyle(color: muted, fontSize: 12)),
                const SizedBox(height: 8),
                _DetailLine('Status', row.status),
                _DetailLine('Guardian', row.guardianName),
                _DetailLine('Guardian phone', row.guardianPhone),
                _DetailLine('Guardian email', row.guardianEmail),
              ],
            ))),
            Wrap(spacing: 8, children: [
              OutlinedButton(onPressed: previousCursors.isEmpty ? null : previousPage, child: const Text('Previous page')),
              FilledButton(onPressed: data.data!.page!.nextCursor == null ? null : () => nextPage(data.data!.page!.nextCursor!), child: const Text('Next page')),
            ]),
          ]);
        }),
      ]);
    }),
  );
}

class _DetailLine extends StatelessWidget {
  final String label, value;
  const _DetailLine(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 5),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(flex: 2, child: Text(label, style: const TextStyle(color: muted, fontSize: 12))),
      Expanded(flex: 3, child: SelectableText(value.isEmpty ? 'Not provided' : value, style: const TextStyle(fontSize: 13))),
    ]),
  );
}
