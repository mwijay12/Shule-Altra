/// Daily Operations Hub — brings the Shule Altra website's four operational
/// workspaces (Attendance, Finance, Academics, Timetable) into one tabbed
/// mobile view with live state updates and native Android PDF printing.
library;

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_school_store.dart';
import '../data/learner.dart';
import '../data/sample_timetable.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';
import 'learner_detail.dart';

enum SchoolDayTab { attendance, finance, academics, timetable }

class SchoolDayScreen extends StatefulWidget {
  const SchoolDayScreen({
    super.key,
    required this.session,
    required this.workspace,
    this.initialTab = SchoolDayTab.attendance,
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final SchoolDayTab initialTab;

  @override
  State<SchoolDayScreen> createState() => _SchoolDayScreenState();
}

class _SchoolDayScreenState extends State<SchoolDayScreen> {
  late SchoolDayTab _tab;
  String _selectedClass = 'Form 4';
  String _selectedDay = 'Monday';

  @override
  void initState() {
    super.initState();
    _tab = widget.initialTab;
  }

  @override
  void didUpdateWidget(covariant SchoolDayScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialTab != widget.initialTab) {
      _tab = widget.initialTab;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: widget.workspace,
      builder: (context, _) {
        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            Text(
              'School Day',
              style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 28),
            ),
            Text(
              '${SchoolProfile.schoolName} · ${SchoolProfile.termLabel}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: Space.md),
            // 4-way frosted pill switcher matching website modules
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final entry in const [
                    (SchoolDayTab.attendance, 'Attendance'),
                    (SchoolDayTab.finance, 'Finance'),
                    (SchoolDayTab.academics, 'Academics'),
                    (SchoolDayTab.timetable, 'Timetable'),
                  ]) ...[
                    ChoicePill(
                      label: entry.$2,
                      selected: _tab == entry.$1,
                      onSelected: () => setState(() => _tab = entry.$1),
                    ),
                    const SizedBox(width: Space.xs),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            switch (_tab) {
              SchoolDayTab.attendance => _buildAttendance(context, tokens),
              SchoolDayTab.finance => _buildFinance(context, tokens),
              SchoolDayTab.academics => _buildAcademics(context, tokens),
              SchoolDayTab.timetable => _buildTimetable(context, tokens),
            },
          ],
        );
      },
    );
  }

  Widget _classBar() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final cls in const ['Form 1', 'Form 2', 'Form 3', 'Form 4']) ...[
            Padding(
              padding: const EdgeInsets.only(right: Space.xs),
              child: FilterChip(
                label: Text(cls),
                selected: _selectedClass == cls,
                onSelected: (_) => setState(() => _selectedClass = cls),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAttendance(BuildContext context, ShuleTokens tokens) {
    final classLearners =
        widget.workspace.learners.where((l) => l.className == _selectedClass).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ShuleGlassCard(
          glowCorner: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: MetricBlock(
                      value: '${widget.workspace.attendanceRate.toStringAsFixed(0)}%',
                      label: 'Today\'s rate',
                    ),
                  ),
                  Expanded(
                    child: MetricBlock(
                      value: '${widget.workspace.presentCount}',
                      label: 'Present',
                    ),
                  ),
                  Expanded(
                    child: MetricBlock(
                      value: '${widget.workspace.absentCount + widget.workspace.lateCount}',
                      label: 'Absent / Late',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Space.md),
              Wrap(
                spacing: Space.sm,
                runSpacing: Space.sm,
                children: [
                  FilledButton.icon(
                    onPressed: () {
                      widget.workspace.markClassPresent(_selectedClass);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Marked all $_selectedClass learners present.')),
                      );
                    },
                    icon: const Icon(Icons.done_all_rounded, size: 18),
                    label: Text('Mark $_selectedClass present'),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => ShulePdfService.printDocument(
                      name: 'Attendance_${_selectedClass.replaceAll(' ', '_')}.pdf',
                      build: () => ShulePdfService.buildClassRegisterPdf(
                        title: '$_selectedClass Attendance Sheet',
                        learners: classLearners,
                        attendanceOf: widget.workspace.attendanceFor,
                      ),
                    ),
                    icon: const Icon(Icons.print_rounded, size: 18),
                    label: const Text('Print sheet'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        _classBar(),
        const SizedBox(height: Space.md),
        SectionHead(title: '$_selectedClass Roll Call', trailing: '${classLearners.length} learners'),
        const SizedBox(height: Space.sm),
        for (final learner in classLearners) ...[
          _AttendanceTile(
            learner: learner,
            status: widget.workspace.attendanceFor(learner.id),
            onStatus: (next) => widget.workspace.setAttendance(learner.id, next),
          ),
          const SizedBox(height: Space.sm),
        ],
      ],
    );
  }

  Widget _buildFinance(BuildContext context, ShuleTokens tokens) {
    final defaulters = widget.workspace.learners
        .where((l) => (l.balance ?? 0) > 0)
        .toList()
      ..sort((a, b) => (b.balance ?? 0).compareTo(a.balance ?? 0));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ShuleGlassCard(
          glowCorner: true,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: MetricBlock(
                      value: '${widget.workspace.feeCollectionRate.toStringAsFixed(0)}%',
                      label: 'Collected',
                    ),
                  ),
                  Expanded(
                    child: MetricBlock(
                      value: '${defaulters.length}',
                      label: 'With balance',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: Space.sm),
              FactRow(label: 'Collected', value: formatTzs(widget.workspace.totalCollectedFees)),
              FactRow(label: 'Outstanding', value: formatTzs(widget.workspace.totalOutstandingFees)),
              const SizedBox(height: Space.sm),
              OutlinedButton.icon(
                onPressed: () => ShulePdfService.printDocument(
                  name: 'Fee_Defaulters_Ledger.pdf',
                  build: () => ShulePdfService.buildClassRegisterPdf(
                    title: 'Fee Balance & Defaulters Report',
                    learners: defaulters,
                    attendanceOf: widget.workspace.attendanceFor,
                  ),
                ),
                icon: const Icon(Icons.print_rounded, size: 18),
                label: const Text('Print defaulters PDF'),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.lg),
        SectionHead(title: 'Pending balances', trailing: '${defaulters.length} learners'),
        const SizedBox(height: Space.sm),
        for (final learner in defaulters.take(8)) ...[
          ShuleGlassCard(
            padding: const EdgeInsets.all(Space.md),
            onTap: () => showLearnerDetail(
              context: context,
              workspace: widget.workspace,
              learnerId: learner.id,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(learner.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                      Text(
                        '${learner.className} ${learner.stream} · ${learner.guardianName}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatTzs(learner.balance),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: tokens.blueInk,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    Text('Tap to pay', style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.sm),
        ],
        const SizedBox(height: Space.md),
        SectionHead(title: 'Recent payments', trailing: '${widget.workspace.transactions.length} receipts'),
        const SizedBox(height: Space.sm),
        for (final tx in widget.workspace.transactions.take(6)) ...[
          ShuleGlassCard(
            padding: const EdgeInsets.all(Space.md),
            child: Row(
              children: [
                const ShuleGlyph(icon: Icons.receipt_long_rounded, size: 40),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(tx.studentName, style: Theme.of(context).textTheme.titleSmall),
                      Text(
                        '${tx.paymentMethod} · Ref ${tx.controlNumber} · ${tx.dateLabel}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                Text(
                  formatTzs(tx.amount),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: tokens.success,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.sm),
        ],
      ],
    );
  }

  Widget _buildAcademics(BuildContext context, ShuleTokens tokens) {
    final classLearners = widget.workspace.learners
        .where((l) => l.className == _selectedClass)
        .toList()
      ..sort(
        (a, b) => widget.workspace
            .resultFor(b.id)
            .average
            .compareTo(widget.workspace.resultFor(a.id).average),
      );
    final divOne =
        classLearners.where((l) => widget.workspace.resultFor(l.id).division == 'Division I').length;
    final classAvg = classLearners.isEmpty
        ? 0.0
        : classLearners
                .map((l) => widget.workspace.resultFor(l.id).average)
                .reduce((a, b) => a + b) /
            classLearners.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _classBar(),
        const SizedBox(height: Space.md),
        ShuleGlassCard(
          glowCorner: true,
          child: Row(
            children: [
              Expanded(
                child: MetricBlock(
                  value: '${classAvg.toStringAsFixed(1)}%',
                  label: '$_selectedClass avg',
                ),
              ),
              Expanded(
                child: MetricBlock(
                  value: '$divOne',
                  label: 'Division I',
                ),
              ),
              Expanded(
                child: MetricBlock(
                  value: '${classLearners.length}',
                  label: 'Candidates',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        SectionHead(title: '$_selectedClass NECTA Ranking', trailing: 'Tap for report card'),
        const SizedBox(height: Space.sm),
        for (var i = 0; i < classLearners.length; i++) ...[
          Builder(
            builder: (context) {
              final learner = classLearners[i];
              final res = widget.workspace.resultFor(learner.id);
              return ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                onTap: () => showLearnerDetail(
                  context: context,
                  workspace: widget.workspace,
                  learnerId: learner.id,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: tokens.blueWash,
                        borderRadius: BorderRadius.circular(11),
                      ),
                      child: Text(
                        '#${i + 1}',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: tokens.blueInk,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(learner.name, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                          Text(
                            '${res.division} · ${res.points} pts · Avg ${res.average.toStringAsFixed(1)}%',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: 'Print ${learner.name} report card',
                      onPressed: () => ShulePdfService.printDocument(
                        name: 'ReportCard_${learner.id}.pdf',
                        build: () => ShulePdfService.buildReportCardPdf(
                          learner: learner,
                          scores: widget.workspace.scoresFor(learner.id),
                          result: res,
                        ),
                      ),
                      icon: Icon(Icons.print_rounded, color: tokens.blueInk),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: Space.sm),
        ],
      ],
    );
  }

  Widget _buildTimetable(BuildContext context, ShuleTokens tokens) {
    final lessons = sampleTimetable[_selectedDay] ?? const [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: _classBar()),
            IconButton(
              tooltip: 'Print class timetable PDF',
              onPressed: () => ShulePdfService.printDocument(
                name: 'Timetable_${_selectedClass.replaceAll(' ', '_')}.pdf',
                build: () => ShulePdfService.buildTimetablePdf(
                  className: _selectedClass,
                  stream: 'A',
                ),
              ),
              icon: Icon(Icons.print_rounded, color: tokens.blueInk),
            ),
          ],
        ),
        const SizedBox(height: Space.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final day in sampleTimetable.keys) ...[
                ChoicePill(
                  label: day.substring(0, 3),
                  selected: _selectedDay == day,
                  onSelected: () => setState(() => _selectedDay = day),
                ),
                const SizedBox(width: Space.xs),
              ],
            ],
          ),
        ),
        const SizedBox(height: Space.md),
        SectionHead(title: '$_selectedClass · $_selectedDay', trailing: '${lessons.length} periods'),
        const SizedBox(height: Space.sm),
        for (final lesson in lessons) ...[
          ShuleGlassCard(
            padding: const EdgeInsets.all(Space.md),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: tokens.blueWash,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    lesson.time,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: tokens.blueInk,
                          fontWeight: FontWeight.w800,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                  ),
                ),
                const SizedBox(width: Space.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(lesson.subject, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                      Text(lesson.teacher, style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: Space.sm),
        ],
      ],
    );
  }
}

class _AttendanceTile extends StatelessWidget {
  const _AttendanceTile({
    required this.learner,
    required this.status,
    required this.onStatus,
  });

  final Learner learner;
  final String status;
  final ValueChanged<String> onStatus;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  learner.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15),
                ),
                Text(
                  '${learner.id} · Stream ${learner.stream}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: Space.sm),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final item in const [
                ('Present', 'P'),
                ('Late', 'L'),
                ('Absent', 'A'),
              ]) ...[
                GestureDetector(
                  onTap: () => onStatus(item.$1),
                  child: Container(
                    width: 34,
                    height: 34,
                    margin: const EdgeInsets.only(left: 4),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: status == item.$1
                          ? (item.$1 == 'Present'
                              ? tokens.primary
                              : item.$1 == 'Late'
                                  ? tokens.warning
                                  : tokens.danger)
                          : tokens.innerSurface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: status == item.$1 ? Colors.transparent : tokens.border,
                      ),
                    ),
                    child: Text(
                      item.$2,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: status == item.$1 ? Colors.white : tokens.inkMuted,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
