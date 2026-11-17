import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/material.dart';

import 'main.dart' show ink, lime, muted, Brand, Notice;
import 'live_timetable.dart';
import 'school_read_error.dart';

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
  final String recordId, admissionNumber, residence, enrollmentDate, attendanceStatus, attendanceUpdateTime;
  const LiveLearner(this.name, this.className, {this.status = '', this.guardianName = '', this.guardianPhone = '', this.guardianEmail = '', this.recordId = '', this.admissionNumber = '', this.residence = '', this.enrollmentDate = '', this.attendanceStatus = '', this.attendanceUpdateTime = ''});

  factory LiveLearner.fromFirestore(Map<String, dynamic> data, {String recordId = ''}) {
    String text(String key) => data[key] is String ? (data[key] as String).trim() : '';
    final name = text('name'), className = text('class');
    return LiveLearner(name.isEmpty ? 'Unnamed learner' : name, className.isEmpty ? 'Class not set' : className,
      status: text('status'), guardianName: text('guardianName'), guardianPhone: text('guardianPhone'), guardianEmail: text('guardianEmail'),
      recordId: recordId, admissionNumber: text('admissionNumber'), residence: text('type'), enrollmentDate: text('enrollmentDate'),
      attendanceStatus: text('attendanceStatus'), attendanceUpdateTime: text('lastAttendanceUpdate'));
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
  Future<LiveTimetable?> loadTimetable(String className, String stream);
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
  @override Future<LiveTimetable?> loadTimetable(String className, String stream) async {
    final id = timetableId(className, stream);
    final user = auth.currentUser;
    if (user == null) throw StateError('Sign in again.');
    await user.reload();
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    await user.getIdToken(true);
    final doc = await firestore.collection('schools').doc('school-001').collection('timetable').doc(id).get(const GetOptions(source: Source.server));
    if (auth.currentUser?.uid != user.uid) throw StateError('Your session changed. Sign in again.');
    if (!doc.exists) return null;
    return LiveTimetable.parse(doc.data()!, className, stream);
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
    final rows = visible.map((doc) => LiveLearner.fromFirestore(doc.data(), recordId: doc.id)).toList();
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
  final DateTime? completedAt;
  final SchoolReadProblem? problem;
  const _LearnerResult(this.page, this.completedAt, this.problem);
}

class LiveSchoolPage extends StatefulWidget {
  final SchoolGateway gateway;
  final bool isSample;
  const LiveSchoolPage({super.key, required this.gateway, this.isSample = false});
  @override State<LiveSchoolPage> createState() => _LiveSchoolPageState();
}
class _LiveSchoolPageState extends State<LiveSchoolPage> {
  late final Stream<String?> session = widget.gateway.sessionUid;
  String? lastUid;
  Future<_LearnerResult>? learners;
  bool busy = false;
  bool showTimetable = false;
  bool showHome = true;
  String? message;
  String query = '';
  String attendanceFilter = 'All';
  String draftPrefix = '';
  String activePrefix = '';
  int globalSearchVersion = 0;
  int searchVersion = 0;
  Object? currentCursor;
  final List<Object?> previousCursors = [];
  Future<_LearnerResult> _loadSafely(Object? after) async {
    try {
      final page = await widget.gateway.loadLearners(after: after, namePrefix: activePrefix);
      return _LearnerResult(page, DateTime.now(), null);
    } catch (error) { return _LearnerResult(null, null, classifySchoolReadProblem(error)); }
  }
  void refresh() => setState(() { message = null; activePrefix = draftPrefix.trim(); previousCursors.clear(); currentCursor = null; query = ''; attendanceFilter = 'All'; searchVersion++; learners = _loadSafely(null); });
  void reloadPage() => setState(() { message = null; query = ''; attendanceFilter = 'All'; searchVersion++; learners = _loadSafely(currentCursor); });
  void nextPage(Object cursor) => setState(() { previousCursors.add(currentCursor); currentCursor = cursor; query = ''; attendanceFilter = 'All'; searchVersion++; learners = _loadSafely(cursor); });
  void previousPage() => setState(() { currentCursor = previousCursors.removeLast(); query = ''; attendanceFilter = 'All'; searchVersion++; learners = _loadSafely(currentCursor); });
  Future<void> signIn() async {
    setState(() { busy = true; message = null; });
    try { await widget.gateway.signInWithGoogle(); }
    catch (_) { if (mounted) setState(() => message = 'Sign-in did not complete. Check the connection and Android Google sign-in setup, then try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  Future<void> signOut() async {
    if (widget.isSample) { Navigator.of(context).pop(); return; }
    setState(() { busy = true; learners = null; query = ''; attendanceFilter = 'All'; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; currentCursor = null; previousCursors.clear(); showTimetable = false; showHome = true; message = null; });
    try { await widget.gateway.signOut(); }
    catch (_) { if (mounted) setState(() => message = 'Could not sign out. Check your connection and try again.'); }
    finally { if (mounted) setState(() => busy = false); }
  }
  @override Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.isSample ? 'FICTIONAL WORKSPACE' : 'School connection')),
    body: StreamBuilder<String?>(stream: session, builder: (context, snapshot) {
      if (snapshot.hasError) { showTimetable = false; showHome = true; learners = null; lastUid = null; currentCursor = null; previousCursors.clear(); query = ''; attendanceFilter = 'All'; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; return const Padding(padding: EdgeInsets.all(24), child: Notice(title: 'Session unavailable', body: 'The sign-in session could not be checked. Try again.')); }
      if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
      if (lastUid != snapshot.data) { showTimetable = false; showHome = true; learners = null; query = ''; attendanceFilter = 'All'; draftPrefix = ''; activePrefix = ''; globalSearchVersion++; searchVersion++; currentCursor = null; previousCursors.clear(); lastUid = snapshot.data; }
      if (snapshot.data == null) return ListView(padding: const EdgeInsets.all(24), children: [
        const Brand(), const SizedBox(height: 35),
        const Text('Your school, connected.', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
        const SizedBox(height: 12), const Text('Sign in with the Google account your school already uses. This early pilot displays learner and guardian details from the school register.', style: TextStyle(color: muted, height: 1.5)),
        const SizedBox(height: 24),
        FilledButton.icon(onPressed: busy ? null : signIn, icon: const Icon(Icons.login), label: const Text('Continue with Google')),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 16), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        const SizedBox(height: 22), const Notice(title: 'Online read-only pilot', body: 'Your school permissions still apply. Offline recording and synchronisation are not available yet.'),
      ]);
      if (showHome) return ListView(key: const ValueKey('workspace-home'), padding: const EdgeInsets.fromLTRB(24, 16, 24, 32), children: [
        const Text('Your workspace', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
        const SizedBox(height: 8),
        const Text('A clear start to your school day.', style: TextStyle(color: muted, height: 1.4)),
        const SizedBox(height: 22),
        Container(padding: const EdgeInsets.all(22), decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(24)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.shield_outlined, color: lime), const SizedBox(height: 16),
          Text(widget.isSample ? 'Fictional preview' : 'School connection', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8), Text(widget.isSample ? 'Sample data · no school connection' : 'Signed in · online reads only', style: const TextStyle(color: lime)),
          const SizedBox(height: 8), Text(widget.isSample ? 'Nothing here comes from your school or is sent to Firebase.' : 'Access depends on your school permissions. An internet connection is required.', style: const TextStyle(color: Colors.white, height: 1.4)),
        ])),
        const SizedBox(height: 26),
        const Text('Explore your workspace', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        _WorkspaceLink(icon: Icons.people_outline, title: 'Learner register', description: widget.isSample ? 'Search fictional learner records' : 'Search school records and view details', onTap: () => setState(() => showHome = false)),
        const SizedBox(height: 10),
        _WorkspaceLink(icon: Icons.calendar_today_outlined, title: 'Timetable', description: widget.isSample ? 'Explore a fictional class schedule' : 'View a saved class schedule', onTap: () => setState(() { showHome = false; showTimetable = true; })),
        const SizedBox(height: 20),
        const Notice(title: 'Early pilot', body: 'Learners and timetable are read-only. Attendance, payments and offline sync are not available here yet.'),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: busy ? null : signOut, icon: const Icon(Icons.logout), label: Text(widget.isSample ? 'Exit fictional preview' : 'Sign out')),
      ]);
      if (showTimetable) return LiveTimetablePanel(key: ValueKey(snapshot.data), load: widget.gateway.loadTimetable, isSample: widget.isSample, onBack: () => setState(() => showTimetable = false), onSignOut: () => signOut());
      return ListView(key: const ValueKey('learner-register'), padding: const EdgeInsets.all(24), children: [
        Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: () => setState(() => showHome = true), icon: const Icon(Icons.arrow_back), label: const Text('Workspace'))),
        const Text('Learner register', style: TextStyle(fontSize: 29, fontWeight: FontWeight.w800)),
        const SizedBox(height: 7), Text(widget.isSample ? 'Fictional · read-only · 2 per page' : 'Online · read-only · 40 per page', style: const TextStyle(color: muted)),
        const SizedBox(height: 18),
        Notice(title: widget.isSample ? 'Fictional sample data' : 'Live school data', body: widget.isSample ? 'These records are fictional and do not come from your school. Name search matches the beginning exactly, including capital letters.' : 'Use only an approved school account and a trusted device. School search matches the beginning of a name exactly, including capital letters. Results can change between reads.'),
        const SizedBox(height: 14),
        TextFormField(key: ValueKey('school-search-$globalSearchVersion'), initialValue: draftPrefix, maxLength: 100, onChanged: (value) => draftPrefix = value, onFieldSubmitted: (_) => refresh(),
          textInputAction: TextInputAction.search, decoration: const InputDecoration(labelText: 'School name prefix', hintText: 'Match exact capital letters', prefixIcon: Icon(Icons.search), border: OutlineInputBorder())),
        const SizedBox(height: 12),
        Wrap(spacing: 8, children: [FilledButton.icon(onPressed: busy ? null : refresh, icon: const Icon(Icons.search), label: Text(widget.isSample ? 'Search sample' : 'Search school')), OutlinedButton(onPressed: busy ? null : () => setState(() { learners = null; query = ''; attendanceFilter = 'All'; searchVersion++; showTimetable = true; }), child: const Text('Timetable')), OutlinedButton(onPressed: busy ? null : signOut, child: Text(widget.isSample ? 'Exit fictional preview' : 'Sign out'))]),
        const SizedBox(height: 6),
        const Text('Leave empty to browse. Names without a name field are not included.', style: TextStyle(color: muted, fontSize: 12)),
        if (message != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(message!, style: const TextStyle(color: Colors.redAccent))),
        if (learners == null) Padding(padding: const EdgeInsets.only(top: 22), child: Notice(title: 'Start with a search', body: widget.isSample ? 'Enter the beginning of a name, or leave the field empty to browse fictional learners.' : 'Enter the beginning of a name, or leave the field empty to browse the first page. School data is loaded only when you search.')),
        if (learners != null) FutureBuilder<_LearnerResult>(future: learners, builder: (context, data) {
          if (data.connectionState != ConnectionState.done) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()));
          if (data.hasError || data.data?.page == null) return Padding(padding: const EdgeInsets.only(top: 18), child: Notice(title: 'Could not load learners', body: schoolReadGuidance(data.data?.problem ?? SchoolReadProblem.unknown, timetable: false)));
          final readAt = data.data!.completedAt!;
          final localizations = MaterialLocalizations.of(context);
          final readLabel = '${localizations.formatMediumDate(readAt)} · ${localizations.formatTimeOfDay(TimeOfDay.fromDateTime(readAt))}';
          final rows = (data.data!.page!.rows).where((row) {
            final matchesText = '${row.name} ${row.className} ${row.recordId} ${row.admissionNumber}'.toLowerCase().contains(query.toLowerCase());
            final status = row.attendanceStatus;
            final matchesAttendance = attendanceFilter == 'All' || (attendanceFilter == 'Other or not set'
              ? !['Present', 'Absent', 'Late'].contains(status) : status == attendanceFilter);
            return matchesText && matchesAttendance;
          }).toList();
          return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 22),
            Text('Page ${previousCursors.length + 1}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(widget.isSample ? 'Fictional sample loaded $readLabel (device time).' : 'Read completed $readLabel (device time). Results do not update automatically.', style: const TextStyle(color: muted, fontSize: 12, height: 1.4)),
            Align(alignment: Alignment.centerLeft, child: TextButton.icon(onPressed: busy ? null : reloadPage, icon: const Icon(Icons.refresh), label: const Text('Reload this page'))),

            Text('${rows.length} shown on this page${activePrefix.isEmpty ? '' : ' · name starts with “$activePrefix”'}', style: const TextStyle(color: muted)),
            const SizedBox(height: 12),
            TextFormField(key: ValueKey('page-search-$searchVersion'), initialValue: query, onChanged: (value) => setState(() => query = value.trim()),
              decoration: InputDecoration(labelText: 'Search loaded learners', helperText: 'Name, class or ID · this page only', prefixIcon: const Icon(Icons.search), border: const OutlineInputBorder(),
                suffixIcon: query.isEmpty ? null : IconButton(tooltip: 'Clear page filter', onPressed: () => setState(() { query = ''; searchVersion++; }), icon: const Icon(Icons.close)))),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(isExpanded: true, value: attendanceFilter,
              decoration: const InputDecoration(labelText: 'Stored attendance · this page only', border: OutlineInputBorder()),
              items: const ['All', 'Present', 'Absent', 'Late', 'Other or not set'].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(),
              onChanged: (value) { if (value != null) setState(() => attendanceFilter = value); }),
            const Padding(padding: EdgeInsets.only(top: 8), child: Text('Latest stored status only; it has no date and may not be from today. Filter applies only to this page.', style: TextStyle(color: muted, fontSize: 12, height: 1.4))),
            if (rows.isEmpty) Padding(padding: const EdgeInsets.only(top: 14), child: Notice(title: 'No learners shown', body: query.isEmpty && attendanceFilter == 'All' ? 'No records were returned on this page. Try another school search.' : 'No loaded learners match these page filters. Change them or search the school again.')),
            const SizedBox(height: 8),
            ...rows.map((row) => Card(margin: const EdgeInsets.only(bottom: 10), child: ExpansionTile(
              leading: const CircleAvatar(backgroundColor: Color(0xffe5efde), foregroundColor: ink, child: Icon(Icons.person_outline)),
              title: Text(row.name, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(row.className),
              childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              children: [
                const Text('Read-only details from this page load. Refresh the register for newer changes.', style: TextStyle(color: muted, fontSize: 12)),
                const SizedBox(height: 8),
                const Align(alignment: Alignment.centerLeft, child: Text('Learner information', style: TextStyle(fontWeight: FontWeight.w800))),
                _DetailLine('Record ID', row.recordId),
                _DetailLine('Admission number', row.admissionNumber),
                _DetailLine('Status', row.status),
                _DetailLine('Residence', row.residence),
                _DetailLine('Enrolment date', row.enrollmentDate),
                const SizedBox(height: 12),
                const Align(alignment: Alignment.centerLeft, child: Text('Latest stored attendance', style: TextStyle(fontWeight: FontWeight.w800))),
                const SizedBox(height: 4),
                const Text('This is the latest status on the learner record, not a dated attendance history. The stored time has no date and does not prove this is today.', style: TextStyle(color: muted, fontSize: 12, height: 1.4)),
                _DetailLine('Attendance status', row.attendanceStatus),
                _DetailLine('Recorded time (no date)', row.attendanceUpdateTime),
                const SizedBox(height: 12),
                const Align(alignment: Alignment.centerLeft, child: Text('Guardian contact', style: TextStyle(fontWeight: FontWeight.w800))),
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

class _WorkspaceLink extends StatelessWidget {
  final IconData icon;
  final String title, description;
  final VoidCallback onTap;
  const _WorkspaceLink({required this.icon, required this.title, required this.description, required this.onTap});
  @override Widget build(BuildContext context) => Material(
    color: Colors.white, borderRadius: BorderRadius.circular(20),
    child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(20), child: Padding(
      padding: const EdgeInsets.all(16), child: Row(children: [
        Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xffeaf0e6), borderRadius: BorderRadius.circular(14)), child: Icon(icon, color: ink)),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)), const SizedBox(height: 4), Text(description, style: const TextStyle(color: muted, height: 1.3))])),
        const SizedBox(width: 8), const Icon(Icons.chevron_right, color: muted),
      ]),
    )),
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
