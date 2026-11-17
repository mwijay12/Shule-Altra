import 'package:flutter/material.dart';

import 'sample_day.dart';
import 'live_school.dart';

void main() => runApp(const ShuleMobileApp());

const ink = Color(0xff183d36);
const muted = Color(0xff667d75);
const canvas = Color(0xfff6f7f1);
const lime = Color(0xffd9efaa);

class ShuleMobileApp extends StatelessWidget {
  const ShuleMobileApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Shule Altra',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: ink, primary: ink, surface: Colors.white),
          scaffoldBackgroundColor: canvas,
          textTheme: ThemeData.light().textTheme.apply(bodyColor: ink, displayColor: ink),
        ),
        home: const Prototype(),
      );
}

/// Onboarding and explicitly labelled sample preview; the live path is separate.
class Prototype extends StatefulWidget {
  const Prototype({super.key});
  @override
  State<Prototype> createState() => _PrototypeState();
}

class _PrototypeState extends State<Prototype> {
  int step = 0;
  int tab = 0;
  bool entered = false;
  final search = TextEditingController();
  String query = '';
  final attendance = SampleAttendanceDraft();
  String sampleDay = 'Monday';
  String sampleClass = 'All classes';

  @override
  void dispose() { search.dispose(); super.dispose(); }

  Future<bool> _confirmDiscard(String action) async => await showDialog<bool>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: const Text('Discard practice marks?'),
      content: const Text('Your fictional attendance marks will be cleared from this session. Nothing was saved or sent to a school.'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Keep practicing')),
        FilledButton(onPressed: () => Navigator.pop(dialogContext, true), child: Text(action)),
      ],
    ),
  ) ?? false;

  Future<void> _clearPractice() async {
    if (await _confirmDiscard('Clear marks') && mounted) setState(attendance.clear);
  }

  Future<void> _resetPreview() async {
    if (attendance.markedCount > 0 && !await _confirmDiscard('Reset preview')) return;
    if (!mounted) return;
    setState(() { entered = false; step = 0; tab = 0; search.clear(); query = ''; sampleDay = 'Monday'; sampleClass = 'All classes'; attendance.clear(); });
  }

  @override
  Widget build(BuildContext context) {
    if (!entered) return _onboarding();
    return Scaffold(
      body: SafeArea(child: switch (tab) {
        0 => _home(),
        1 => _learners(),
        2 => _day(),
        _ => _more(),
      }),
      bottomNavigationBar: NavigationBar(
        selectedIndex: tab,
        onDestinationSelected: (value) => setState(() => tab = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), selectedIcon: Icon(Icons.grid_view_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.people_outline_rounded), selectedIcon: Icon(Icons.people_rounded), label: 'Learners'),
          NavigationDestination(icon: Icon(Icons.event_note_outlined), selectedIcon: Icon(Icons.event_note_rounded), label: 'Day'),
          NavigationDestination(icon: Icon(Icons.more_horiz_rounded), label: 'More'),
        ],
      ),
    );
  }

  Widget _onboarding() {
    final pages = [
      ('Your school,\ncloser than ever.', 'A calmer way to stay on top of your school day.'),
      ('Made for your\neveryday work.', 'Explore learner records and the tools your team needs.'),
      ('Connected with\ncare.', 'Offline capture and safe synchronisation are planned—not yet available.'),
    ];
    return Scaffold(
      body: SafeArea(child: LayoutBuilder(builder: (context, constraints) => SingleChildScrollView(
        child: ConstrainedBox(constraints: BoxConstraints(minHeight: constraints.maxHeight), child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 22, 24, 24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Brand(),
            const SizedBox(height: 32),
            Container(height: 260, width: double.infinity, decoration: BoxDecoration(color: const Color(0xffe5eddd), borderRadius: BorderRadius.circular(30)), child: const SchoolIllustration()),
            const SizedBox(height: 30),
            Text('SHULE ALTRA  /  MOBILE', style: Theme.of(context).textTheme.labelSmall?.copyWith(letterSpacing: 1.8, fontWeight: FontWeight.w800, color: muted)),
            const SizedBox(height: 12),
            Text(pages[step].$1, style: const TextStyle(fontSize: 35, height: 1.06, letterSpacing: -1.5, fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            Text(pages[step].$2, style: const TextStyle(fontSize: 16, height: 1.5, color: muted)),
            const SizedBox(height: 25),
            Semantics(label: 'Introduction, page ${step + 1} of ${pages.length}', child: Row(children: List.generate(pages.length, (i) => AnimatedContainer(duration: MediaQuery.disableAnimationsOf(context) ? Duration.zero : const Duration(milliseconds: 180), margin: const EdgeInsets.only(right: 6), width: step == i ? 25 : 7, height: 7, decoration: BoxDecoration(color: step == i ? ink : const Color(0xffccd8ca), borderRadius: BorderRadius.circular(8)))))),
            const SizedBox(height: 25),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: () => setState(() { if (step < pages.length - 1) { step++; } else { Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const LiveSchoolBootstrap())); } }), style: FilledButton.styleFrom(backgroundColor: ink, minimumSize: const Size(0, 56), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18))), child: Text(step == pages.length - 1 ? 'Connect to your school' : 'Continue'))),
            if (step > 0) Center(child: TextButton.icon(onPressed: () => setState(() => step--), icon: const Icon(Icons.arrow_back), label: const Text('Previous'))),
            if (step == pages.length - 1) Center(child: TextButton(onPressed: () => setState(() => entered = true), child: const Text('Explore sample preview instead'))),
            const SizedBox(height: 12),
            const Center(child: Text('EARLY ACCESS  ·  READ-ONLY PILOT', style: TextStyle(fontSize: 10, letterSpacing: 1.1, fontWeight: FontWeight.w700, color: muted))),
          ]),
        )),
      ))),
    );
  }

  Widget _home() => ListView(padding: const EdgeInsets.fromLTRB(22, 22, 22, 28), children: [
    const Brand(),
    const SizedBox(height: 30),
    const Text('A little more room', style: TextStyle(fontSize: 15, color: muted)),
    const SizedBox(height: 3),
    const Text('for what matters.', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1.1)),
    const SizedBox(height: 17),
    Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(26)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [Icon(Icons.auto_awesome_outlined, size: 18, color: lime), SizedBox(width: 8), Expanded(child: Text('YOUR SCHOOL DAY', style: TextStyle(color: lime, fontWeight: FontWeight.w800, letterSpacing: 1.4, fontSize: 10)))]),
      const SizedBox(height: 19),
      const Text('Everything in\none place.', style: TextStyle(color: Colors.white, fontSize: 27, height: 1.08, fontWeight: FontWeight.w700, letterSpacing: -.8)),
      const SizedBox(height: 10),
      Text('A thoughtful starting point for your team.', style: TextStyle(color: Colors.white.withValues(alpha: .7), height: 1.45)),
      const SizedBox(height: 18),
      FilledButton.tonal(onPressed: () => setState(() => tab = 1), style: FilledButton.styleFrom(backgroundColor: lime, foregroundColor: ink), child: const Text('Explore learners  →')),
    ])),
    const SizedBox(height: 24),
    const SectionTitle('Your workspace', 'A first look'),
    const SizedBox(height: 12),
    LayoutBuilder(builder: (context, constraints) {
      final stack = constraints.maxWidth < 340 || MediaQuery.textScalerOf(context).scale(1) > 1.3;
      final cardWidth = stack ? constraints.maxWidth : (constraints.maxWidth - 10) / 2;
      return Wrap(spacing: 10, runSpacing: 10, children: [
        SizedBox(width: cardWidth, child: FeatureCard(icon: Icons.people_outline, title: 'Learners', caption: 'Browse sample profiles', onTap: () => setState(() => tab = 1))),
        SizedBox(width: cardWidth, child: FeatureCard(icon: Icons.event_note_outlined, title: 'School day', caption: 'Try sample attendance', onTap: () => setState(() => tab = 2))),
      ]);
    }),
    const SizedBox(height: 22),
    Container(padding: const EdgeInsets.all(18), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Practice overview', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      const SizedBox(height: 6),
      const Text('Fictional learners · current session only', style: TextStyle(color: muted, fontSize: 12)),
      const SizedBox(height: 16),
      Text('${attendance.markedCount} of ${attendance.totalCount} sample learners marked', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      LinearProgressIndicator(value: attendance.markedCount / attendance.totalCount, minHeight: 8, backgroundColor: const Color(0xffeaf0e6), color: ink, borderRadius: BorderRadius.circular(8), semanticsLabel: 'Sample attendance progress', semanticsValue: '${attendance.markedCount} of ${attendance.totalCount} marked'),
      const SizedBox(height: 8),
      const Text('Not a school record. Closing or restarting the app clears these marks.', style: TextStyle(color: muted, fontSize: 12, height: 1.4)),
      const SizedBox(height: 8),
      TextButton.icon(onPressed: () => setState(() => tab = 2), icon: const Icon(Icons.event_note_outlined), label: const Text('Open practice day')),
    ])),
    const SizedBox(height: 16),
    const Notice(title: 'Sample preview', body: 'Illustrative data only. No school data is shown here; payments and offline sync are not available.'),
  ]);

  Widget _learners() {
    final shown = sampleLearners.where((item) => (sampleClass == 'All classes' || item.className == sampleClass) && '${item.name} ${item.className}'.toLowerCase().contains(query.toLowerCase())).toList();
    return ListView(padding: const EdgeInsets.fromLTRB(22, 22, 22, 28), children: [
      const Brand(), const SizedBox(height: 30),
      const Text('Learners', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, letterSpacing: -1)),
      const SizedBox(height: 5), const Text('A sample register to explore the layout.', style: TextStyle(color: muted)),
      const SizedBox(height: 20),
      TextField(controller: search, onChanged: (value) => setState(() => query = value.trim()), decoration: InputDecoration(labelText: 'Search sample learners', prefixIcon: const Icon(Icons.search), suffixIcon: query.isEmpty ? null : IconButton(tooltip: 'Clear search', onPressed: () => setState(() { search.clear(); query = ''; }), icon: const Icon(Icons.close)), filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderSide: BorderSide.none, borderRadius: BorderRadius.circular(18)))),
      const SizedBox(height: 12),
      DropdownButtonFormField<String>(isExpanded: true, value: sampleClass, decoration: const InputDecoration(labelText: 'Sample class', border: OutlineInputBorder()), items: ['All classes', ...sampleLearners.map((item) => item.className).toSet()].map((value) => DropdownMenuItem(value: value, child: Text(value))).toList(), onChanged: (value) { if (value != null) setState(() => sampleClass = value); }),
      const SizedBox(height: 24),
      SectionTitle('Sample register', '${shown.length} shown'), const SizedBox(height: 12),
      if (shown.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Text('No sample learners match your search.', style: TextStyle(color: muted))),
      ...shown.map((item) => Padding(padding: const EdgeInsets.only(bottom: 9), child: Material(color: Colors.white, borderRadius: BorderRadius.circular(20), child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 5),
        leading: CircleAvatar(backgroundColor: const Color(0xffe5efde), foregroundColor: ink, child: Text(item.initials, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
        title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text('${item.className}  ·  Sample', style: const TextStyle(color: muted)),
        trailing: const Icon(Icons.chevron_right, color: muted),
        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => SampleLearnerProfile(learner: item, mark: attendance.markFor(item.id)))),
      )))),
    ]);
  }

  Widget _day() => ListView(padding: const EdgeInsets.fromLTRB(22, 22, 22, 28), children: [
    const Brand(), const SizedBox(height: 30),
    const Text('The school day', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
    const SizedBox(height: 7),
    const Text('A small, safe place to explore the flow.', style: TextStyle(color: muted)),
    const SizedBox(height: 20),
    const Notice(title: 'Practice only · not saved', body: 'These fictional marks stay in memory during this session. They are not attendance records and are never sent to a school.'),
    const SizedBox(height: 24),
    _sampleSchedule(),
    const SizedBox(height: 24),
    SectionTitle('Sample attendance', '${attendance.markedCount} of ${attendance.totalCount} marked'),
    const SizedBox(height: 8),
    const Text('Tap a status to try it. These marks are not tied to the timetable day above. Closing or restarting the app loses this practice data.', style: TextStyle(color: muted, fontSize: 12, height: 1.4)),
    const SizedBox(height: 12),
    Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xffeaf0e6), borderRadius: BorderRadius.circular(18)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Practice summary', style: TextStyle(fontWeight: FontWeight.w800)),
      const SizedBox(height: 8),
      Wrap(spacing: 14, runSpacing: 6, children: [
        Text('Present: ${attendance.count(SampleAttendance.present)}'),
        Text('Absent: ${attendance.count(SampleAttendance.absent)}'),
        Text('Late: ${attendance.count(SampleAttendance.late)}'),
        Text('Unmarked: ${attendance.totalCount - attendance.markedCount}'),
      ]),
      const SizedBox(height: 8),
      TextButton(onPressed: attendance.markedCount == attendance.totalCount ? null : () => setState(attendance.markUnmarkedPresent),
        child: const Text('Mark unmarked samples present', textAlign: TextAlign.center)),
      const Text('Existing choices stay unchanged.', style: TextStyle(color: muted, fontSize: 12)),
    ])),
    const SizedBox(height: 12),
    ...sampleLearners.map((learner) => Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [CircleAvatar(backgroundColor: const Color(0xffe5efde), foregroundColor: ink, child: Text(learner.initials, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12))),
          const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(learner.name, style: const TextStyle(fontWeight: FontWeight.w800)), Text('${learner.className} · Sample', style: const TextStyle(fontSize: 12, color: muted))]))]),
        const SizedBox(height: 12),
        if (attendance.markFor(learner.id) != null) Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: () => setState(() => attendance.clearMark(learner.id)), icon: const Icon(Icons.close, size: 18), label: Text('Clear ${learner.name} mark'))),
        Wrap(spacing: 6, runSpacing: 4, children: SampleAttendance.values.map((status) {
          final label = switch (status) { SampleAttendance.present => 'Present', SampleAttendance.absent => 'Absent', SampleAttendance.late => 'Late' };
          return ChoiceChip(label: Text(label), selected: attendance.markFor(learner.id) == status,
            onSelected: (_) => setState(() => attendance.mark(learner.id, status)));
        }).toList()),
      ]),
    )),
    Align(alignment: Alignment.centerLeft, child: TextButton.icon(
      onPressed: attendance.markedCount == 0 ? null : _clearPractice,
      icon: const Icon(Icons.restart_alt), label: const Text('Clear practice marks'))),
  ]);

  Widget _sampleSchedule() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const subjects = {
      'Monday': ['Mathematics', 'English', 'Biology'],
      'Tuesday': ['History', 'Kiswahili', 'Chemistry'],
      'Wednesday': ['Geography', 'Mathematics', 'English'],
      'Thursday': ['Biology', 'Civics', 'Kiswahili'],
      'Friday': ['Chemistry', 'History', 'Geography'],
    };
    const times = ['08:00 – 08:40', '08:40 – 09:20', '09:20 – 10:00'];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Sample timetable', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 5),
        const Text('Fictional preview · not your school schedule', style: TextStyle(color: muted, fontSize: 12)),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          isExpanded: true,
          value: sampleDay,
          decoration: const InputDecoration(labelText: 'Sample day', border: OutlineInputBorder()),
          items: days.map((day) => DropdownMenuItem(value: day, child: Text(day))).toList(),
          onChanged: (day) { if (day != null) setState(() => sampleDay = day); },
        ),
        const SizedBox(height: 8),
        for (var i = 0; i < times.length; i++)
          ListTile(contentPadding: EdgeInsets.zero, leading: const Icon(Icons.menu_book_outlined, color: ink),
            title: Text(subjects[sampleDay]![i], style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('${times[i]} · Sample lesson')),
        const Text('Three illustrative periods only. Connect to see saved schedules when configured.', style: TextStyle(color: muted, fontSize: 12)),
      ]),
    );
  }

  Widget _more() => ListView(padding: const EdgeInsets.fromLTRB(22, 22, 22, 28), children: [
    const Brand(), const SizedBox(height: 30),
    const Text('Built with care.', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -1)),
    const SizedBox(height: 7), const Text('A transparent look at this early prototype.', style: TextStyle(color: muted)),
    const SizedBox(height: 22),
    const Notice(title: 'Offline & sync', body: 'Not implemented yet. Safe queues, conflict handling, authentication and device security must be designed and tested before use.'),
    const SizedBox(height: 12),
    const Notice(title: 'School connection', body: 'This sample is separate from the online school connection. The school connection requires Android Firebase setup and an approved account.'),
    const SizedBox(height: 12),
    FilledButton.icon(onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const LiveSchoolBootstrap())), icon: const Icon(Icons.link), label: const Text('Connect to your school')),
    const SizedBox(height: 22),
    OutlinedButton.icon(onPressed: _resetPreview, icon: const Icon(Icons.restart_alt), label: const Text('View onboarding again')),
  ]);
}

/// A clearly fictional, read-only profile; practice attendance is never saved.
class SampleLearnerProfile extends StatelessWidget {
  final SampleLearner learner;
  final SampleAttendance? mark;
  const SampleLearnerProfile({super.key, required this.learner, required this.mark});

  @override Widget build(BuildContext context) {
    final status = switch (mark) {
      SampleAttendance.present => 'Present',
      SampleAttendance.absent => 'Absent',
      SampleAttendance.late => 'Late',
      null => 'Not marked',
    };
    return Scaffold(
      appBar: AppBar(title: const Text('Sample profile')),
      body: SafeArea(child: ListView(padding: const EdgeInsets.fromLTRB(22, 12, 22, 28), children: [
        Container(padding: const EdgeInsets.all(22), decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(24)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(radius: 28, backgroundColor: lime, foregroundColor: ink, child: Text(learner.initials, style: const TextStyle(fontWeight: FontWeight.w800))),
          const SizedBox(height: 16), Text(learner.name, style: const TextStyle(color: Colors.white, fontSize: 25, fontWeight: FontWeight.w800)),
          const SizedBox(height: 5), Text('${learner.className} · Sample learner', style: const TextStyle(color: lime)),
        ])),
        const SizedBox(height: 20),
        const Notice(title: 'Fictional profile', body: 'This is fictional sample data. Real learner details are not connected to this preview.'),
        const SizedBox(height: 24),
        const Text('At a glance', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Card(child: Column(children: [
          ListTile(leading: const Icon(Icons.school_outlined), title: const Text('Class'), subtitle: Text(learner.className)),
          ListTile(leading: const Icon(Icons.how_to_reg_outlined), title: const Text('Practice attendance'), subtitle: Text('$status · this session only')),
        ])),
        const SizedBox(height: 12),
        const Text('Practice attendance is not a school record and is never sent or saved.', style: TextStyle(color: muted, height: 1.4)),
        const SizedBox(height: 20),
        OutlinedButton.icon(onPressed: () => Navigator.of(context).pop(), icon: const Icon(Icons.arrow_back), label: const Text('Back to sample register')),
      ])),
    );
  }
}

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override Widget build(BuildContext context) => Row(children: [
    Container(width: 40, height: 40, decoration: BoxDecoration(color: ink, borderRadius: BorderRadius.circular(13)), child: const Icon(Icons.auto_stories_rounded, color: lime, size: 21)),
    const SizedBox(width: 10), const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('shule altra', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: -.5)), Text('SCHOOL, IN SYNC', style: TextStyle(fontSize: 9, letterSpacing: 1.2, fontWeight: FontWeight.w700, color: muted))])),
    Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: const Color(0xffe7eee3), borderRadius: BorderRadius.circular(20)), child: const Text('PREVIEW', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1, color: ink))),
  ]);
}
class SectionTitle extends StatelessWidget {
  final String title, trailing;
  const SectionTitle(this.title, this.trailing, {super.key});
  @override Widget build(BuildContext context) => Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 12, runSpacing: 4, children: [Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)), Text(trailing, style: const TextStyle(color: muted, fontSize: 12))]);
}
class FeatureCard extends StatelessWidget {
  final IconData icon; final String title, caption; final VoidCallback onTap;
  const FeatureCard({super.key, required this.icon, required this.title, required this.caption, required this.onTap});
  @override Widget build(BuildContext context) => Material(color: Colors.white, borderRadius: BorderRadius.circular(22), child: InkWell(borderRadius: BorderRadius.circular(22), onTap: onTap, child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, color: ink), const SizedBox(height: 23), Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)), const SizedBox(height: 5), Text(caption, style: const TextStyle(fontSize: 11, color: muted))]))));
}
class Notice extends StatelessWidget {
  final String title, body;
  const Notice({super.key, required this.title, required this.body});
  @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xffeaf0e6), borderRadius: BorderRadius.circular(20)), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Icon(Icons.info_outline_rounded, size: 19, color: ink), const SizedBox(width: 10), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 5), Text(body, style: const TextStyle(color: muted, fontSize: 12, height: 1.45))]))]));
}
class SchoolIllustration extends StatelessWidget {
  const SchoolIllustration({super.key});
  @override Widget build(BuildContext context) => CustomPaint(painter: _SchoolPainter());
}
class _SchoolPainter extends CustomPainter {
  @override void paint(Canvas canvas, Size size) {
    final p = Paint();
    canvas.drawCircle(Offset(size.width * .5, size.height * .48), size.height * .34, p..color = const Color(0xffcbdabf));
    final rect = RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(size.width * .5, size.height * .54), width: 155, height: 120), const Radius.circular(14));
    canvas.drawRRect(rect, p..color = ink);
    final roof = Path()..moveTo(size.width * .5 - 92, size.height * .39)..lineTo(size.width * .5, size.height * .18)..lineTo(size.width * .5 + 92, size.height * .39)..close();
    canvas.drawPath(roof, p..color = const Color(0xff335f50));
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(size.width * .5, size.height * .66), width: 34, height: 55), const Radius.circular(7)), p..color = lime);
    for (final dx in [-50.0, 50.0]) { canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromCenter(center: Offset(size.width * .5 + dx, size.height * .48), width: 28, height: 30), const Radius.circular(5)), p..color = const Color(0xffe7f2d6)); }
    canvas.drawCircle(Offset(size.width * .76, size.height * .27), 17, p..color = const Color(0xffeab77f));
    canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(size.width * .14, size.height * .75, size.width * .72, 5), const Radius.circular(4)), p..color = const Color(0xff9ab49e));
  }
  @override bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
