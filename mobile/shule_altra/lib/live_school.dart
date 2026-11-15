import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'main.dart' show muted, Brand, Notice;

/// Firebase Android client configuration is deliberately supplied at build time.
/// There is no implicit fallback to a different school or Firebase project.
class SchoolFirebaseConfig {
  final String projectId, expectedProjectId, apiKey, appId, senderId;
  const SchoolFirebaseConfig({required this.projectId, required this.expectedProjectId, required this.apiKey, required this.appId, required this.senderId});
  static const fromEnvironment = SchoolFirebaseConfig(
    projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
    expectedProjectId: String.fromEnvironment('FIREBASE_EXPECTED_PROJECT_ID'),
    apiKey: String.fromEnvironment('FIREBASE_API_KEY'),
    appId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
    senderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
  );
  bool get isValid => [projectId, expectedProjectId, apiKey, appId, senderId].every((value) => value.trim().isNotEmpty) && projectId == expectedProjectId;
  FirebaseOptions get options => FirebaseOptions(apiKey: apiKey, appId: appId, messagingSenderId: senderId, projectId: projectId);
}

class LiveLearner {
  final String name, className;
  const LiveLearner(this.name, this.className);
}

/// Abstracted for widget tests. Authorization remains in Firebase rules.
abstract class SchoolGateway {
  Stream<String?> get sessionUid;
  Future<void> signInWithGoogle();
  Future<void> signOut();
  Future<List<LiveLearner>> loadLearners();
}

class FirebaseSchoolGateway implements SchoolGateway {
  final FirebaseAuth auth;
  final FirebaseFirestore firestore;
  FirebaseSchoolGateway(this.auth, this.firestore);
  @override Stream<String?> get sessionUid => auth.authStateChanges().map((user) => user?.uid);
  @override Future<void> signInWithGoogle() async { await auth.signInWithProvider(GoogleAuthProvider()); }
  @override Future<void> signOut() => auth.signOut();
  @override Future<List<LiveLearner>> loadLearners() async {
    // Force a fresh identity and server read. No offline data is shown in this
    // pilot; rules, not a UI role, authorize the collection query.
    final user = auth.currentUser;
    if (user == null) throw StateError('Sign in again.');
    await user.reload();
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    await user.getIdToken(true);
    final result = await firestore.collection('schools').doc('school-001').collection('students').orderBy('name').limit(200).get(const GetOptions(source: Source.server));
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    return result.docs.map((doc) {
      final data = doc.data();
      return LiveLearner(data['name'] is String ? data['name'] as String : 'Unnamed learner', data['class'] is String ? data['class'] as String : 'Class not set');
    }).toList();
  }
}

class LiveSchoolBootstrap extends StatefulWidget {
  const LiveSchoolBootstrap({super.key});
  @override State<LiveSchoolBootstrap> createState() => _LiveSchoolBootstrapState();
}
class _LiveSchoolBootstrapState extends State<LiveSchoolBootstrap> {
  late final Future<SchoolGateway> gateway = _initialise();
  Future<SchoolGateway> _initialise() async {
    const config = SchoolFirebaseConfig.fromEnvironment;
    if (!config.isValid) throw StateError('Firebase Android configuration is missing or the project IDs do not match.');
    final existing = Firebase.apps.where((app) => app.name == 'school-live').toList();
    final app = existing.isEmpty ? await Firebase.initializeApp(name: 'school-live', options: config.options) : existing.single;
    if (app.options.projectId != config.projectId || app.options.appId != config.appId) throw StateError('Firebase configuration changed. Restart the app.');
    final firestore = FirebaseFirestore.instanceFor(app: app);
    firestore.settings = const Settings(persistenceEnabled: false);
    return FirebaseSchoolGateway(FirebaseAuth.instanceFor(app: app), firestore);
  }
  @override Widget build(BuildContext context) => FutureBuilder<SchoolGateway>(future: gateway, builder: (context, snapshot) {
    if (snapshot.hasData) return LiveSchoolPage(gateway: snapshot.data!);
    return Scaffold(appBar: AppBar(title: const Text('Connect school')), body: Padding(padding: const EdgeInsets.all(24), child: snapshot.hasError
      ? const Notice(title: 'Configuration required', body: 'This build has no verified Firebase Android configuration, or setup failed. See the mobile setup guide. Your existing Firebase web connection is not changed.')
      : const Center(child: CircularProgressIndicator())));
  });
}

class _LearnerResult {
  final List<LiveLearner>? rows;
  const _LearnerResult(this.rows);
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
  Future<_LearnerResult> _loadSafely() async {
    try { return _LearnerResult(await widget.gateway.loadLearners()); }
    catch (_) { return const _LearnerResult(null); }
  }
  void refresh() => setState(() { message = null; learners = _loadSafely(); });
  Future<void> signIn() async {
    setState(() { busy = true; message = null; });
    try { await widget.gateway.signInWithGoogle(); }
    catch (_) { if (mounted) setState(() => message = 'Sign-in did not complete. Check the connection and Android Google sign-in setup, then try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> signOut() async {
    setState(() { busy = true; learners = null; query = ''; message = null; });
    try { await widget.gateway.signOut(); }
    catch (_) { if (mounted) setState(() => message = 'Could not sign out. Check your connection and try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('School connection')),
    body: StreamBuilder<String?>(stream: session, builder: (context, snapshot) {
      if (snapshot.hasError) return const Padding(padding: EdgeInsets.all(24), child: Notice(title: 'Session unavailable', body: 'The sign-in session could not be checked. Try again.'));
      if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
      if (lastUid != snapshot.data) { learners = null; query = ''; lastUid = snapshot.data; }
      if (snapshot.data == null) return ListView(padding: const EdgeInsets.all(24), children: [
        const Brand(), const SizedBox(height: 35),
        const Text('Your school, connected.', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
        const SizedBox(height: 12), const Text('Sign in with the Google account your school already uses. This early pilot displays learner names and classes from the school register.', style: TextStyle(color: muted, height: 1.5)),
        const SizedBox(height: 24),
        FilledButton.icon(onPressed: busy ? null : signIn, icon: const Icon(Icons.login), label: const Text('Continue with Google')),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 16), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        const SizedBox(height: 22), const Notice(title: 'Online read-only pilot', body: 'Your school permissions still apply. Offline recording and synchronisation are not available yet.'),
      ]);
      return ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Learner register', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800)),
        const SizedBox(height: 7), const Text('Online · read-only · first 200 ordered by name', style: TextStyle(color: muted)),
        const SizedBox(height: 18),
        const Notice(title: 'Live school data', body: 'Use only an approved school account and a trusted device. Search applies to the loaded 200 records, not the whole school.'),
        const SizedBox(height: 14),
        Wrap(spacing: 8, children: [FilledButton.icon(onPressed: busy ? null : refresh, icon: const Icon(Icons.refresh), label: const Text('Load learners')), OutlinedButton(onPressed: busy ? null : signOut, child: const Text('Sign out'))]),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        if (learners != null) FutureBuilder<_LearnerResult>(future: learners, builder: (context, data) {
          if (data.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
          if (data.hasError || data.data?.rows == null) return const Padding(padding: EdgeInsets.only(top: 18), child: Notice(title: 'Could not load learners', body: 'Check your internet connection, session and school permissions, then try again. No cached results are shown.'));
          final rows = (data.data!.rows!).where((row) => '${row.name} ${row.className}'.toLowerCase().contains(query.toLowerCase())).toList();
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 18), TextField(onChanged: (value) => setState(() => query = value.trim()), decoration: const InputDecoration(labelText: 'Search loaded learners', prefixIcon: Icon(Icons.search))),
            const SizedBox(height: 14), Text('${rows.length} shown', style: const TextStyle(color: muted)),
            if (rows.isEmpty) const Padding(padding: EdgeInsets.only(top: 14), child: Text('No matching learners in this page.')),
            ...rows.map((row) => Card(child: ListTile(title: Text(row.name), subtitle: Text(row.className)))),
          ]);
        }),
      ]);
    }),
  );
}
