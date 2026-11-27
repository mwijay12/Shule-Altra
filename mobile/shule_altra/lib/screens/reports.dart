/// Reports & Native Android Printing Center — mirrors `src/app/dashboard/reports/page.tsx`.
library;

import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../services/device_services.dart';

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Reports & Printing')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: workspace,
          builder: (context, _) {
            final topLearner = workspace.learners.first;
            final defaulters =
                workspace.learners.where((l) => (l.balance ?? 0) > 0).toList();

            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                Notice(
                  tone: NoticeTone.info,
                  title: 'Native Android Printing Ready',
                  body:
                      'Every report below builds a vector A4/A5 PDF with the ${SchoolProfile.schoolName} letterhead and opens Android Print / Save as PDF.',
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'Institutional PDFs', trailing: '4 templates'),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.groups_rounded,
                  title: 'Full Learners Register',
                  subtitle: '${workspace.learners.length} active learners across Form 1 – 4',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Learners_Register.pdf',
                    build: () => ShulePdfService.buildClassRegisterPdf(
                      title: 'Official Learners Register',
                      learners: workspace.learners,
                      attendanceOf: workspace.attendanceFor,
                    ),
                  ),
                ),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.fact_check_rounded,
                  title: 'Daily Attendance Summary',
                  subtitle:
                      '${workspace.presentCount} present · ${workspace.lateCount} late · ${workspace.absentCount} absent',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Attendance_Report.pdf',
                    build: () => ShulePdfService.buildClassRegisterPdf(
                      title: 'Daily Attendance Report',
                      learners: workspace.learners,
                      attendanceOf: workspace.attendanceFor,
                    ),
                  ),
                ),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.account_balance_wallet_rounded,
                  title: 'Fee Collection & Defaulters Ledger',
                  subtitle: '${defaulters.length} learners with pending TZS balances',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Fee_Ledger.pdf',
                    build: () => ShulePdfService.buildClassRegisterPdf(
                      title: 'Fee Collection & Defaulters Ledger',
                      learners: defaulters,
                      attendanceOf: workspace.attendanceFor,
                    ),
                  ),
                ),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.calendar_view_week_rounded,
                  title: 'Weekly Class Timetable',
                  subtitle: 'Form 4 Stream A · Monday – Friday schedule',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'ShuleAltra_Form4A_Timetable.pdf',
                    build: () => ShulePdfService.buildTimetablePdf(
                      className: 'Form 4',
                      stream: 'A',
                    ),
                  ),
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'Quick sample student documents'),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.workspace_premium_rounded,
                  title: 'NECTA Report Card (${topLearner.name})',
                  subtitle: 'Subject scores, grades A–F, Division & signature block',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'ReportCard_${topLearner.id}.pdf',
                    build: () => ShulePdfService.buildReportCardPdf(
                      learner: topLearner,
                      scores: workspace.scoresFor(topLearner.id),
                      result: workspace.resultFor(topLearner.id),
                    ),
                  ),
                ),
                const SizedBox(height: Space.sm),
                _PrintTile(
                  icon: Icons.badge_rounded,
                  title: 'Student ID Card (${topLearner.name})',
                  subtitle: 'Includes uploaded passport photo when attached',
                  onPrint: () => ShulePdfService.printDocument(
                    name: 'StudentID_${topLearner.id}.pdf',
                    build: () => ShulePdfService.buildStudentIdCardPdf(
                      learner: topLearner,
                      photoBytes: workspace.photoFor(topLearner.id),
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _PrintTile extends StatelessWidget {
  const _PrintTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onPrint,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onPrint;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.md),
      onTap: onPrint,
      child: Row(
        children: [
          ShuleGlyph(icon: icon, size: 44),
          const SizedBox(width: Space.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Icon(Icons.print_rounded, color: tokens.blueInk),
        ],
      ),
    );
  }
}
