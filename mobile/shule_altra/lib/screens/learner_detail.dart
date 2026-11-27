/// Full Learner Profile modal sheet — parity with the Shule Altra website's
/// student dossier: passport photo (Gallery/Camera), attendance status,
/// conduct points, hostel wing / bus route, guardian info, fee account &
/// ClickPesa payment recording, NECTA CSEE grades, and native Android PDF printing.
library;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../data/learner.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';

Future<void> showLearnerDetail({
  required BuildContext context,
  required SchoolWorkspace workspace,
  required String learnerId,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (ctx) => _LearnerDetailSheet(
      workspace: workspace,
      learnerId: learnerId,
    ),
  );
}

class _LearnerDetailSheet extends StatefulWidget {
  const _LearnerDetailSheet({
    required this.workspace,
    required this.learnerId,
  });

  final SchoolWorkspace workspace;
  final String learnerId;

  @override
  State<_LearnerDetailSheet> createState() => _LearnerDetailSheetState();
}

class _LearnerDetailSheetState extends State<_LearnerDetailSheet> {
  String? _statusNote;

  Future<void> _pickPhoto(Learner learner, {required bool fromCamera}) async {
    final perm = fromCamera
        ? await ShuleMediaService.requestCamera()
        : await ShuleMediaService.requestPhotos();
    final bytes = await ShuleMediaService.pickPhoto(fromCamera: fromCamera);
    if (!mounted) return;
    if (bytes != null) {
      widget.workspace.setLearnerPhoto(learner.id, bytes);
      setState(() => _statusNote = 'Passport photo updated from ${fromCamera ? 'camera' : 'gallery'}.');
    } else {
      setState(
        () => _statusNote =
            'No photo selected (${fromCamera ? 'Camera' : 'Gallery'} permission: $perm).',
      );
    }
  }

  Future<void> _printReportCard(Learner learner) async {
    final scores = widget.workspace.scoresFor(learner.id);
    final result = widget.workspace.resultFor(learner.id);
    final ok = await ShulePdfService.printDocument(
      name: 'ReportCard_${learner.id}.pdf',
      build: () => ShulePdfService.buildReportCardPdf(
        learner: learner,
        scores: scores,
        result: result,
      ),
    );
    if (!mounted) return;
    setState(
      () => _statusNote = ok
          ? 'Opened print dialog for ${learner.name}\'s report card.'
          : 'PDF generated. Connect a printer or open on an Android device to print.',
    );
  }

  Future<void> _printFeeStatement(Learner learner) async {
    final ok = await ShulePdfService.printDocument(
      name: 'FeeStatement_${learner.id}.pdf',
      build: () => ShulePdfService.buildFeeStatementPdf(
        learner: learner,
        annualFee: widget.workspace.annualFeeFor(learner),
        paid: widget.workspace.paidFor(learner),
        transactions: widget.workspace.transactions,
      ),
    );
    if (!mounted) return;
    setState(
      () => _statusNote = ok
          ? 'Opened print dialog for ${learner.name}\'s fee statement.'
          : 'Fee statement ready on Android print devices.',
    );
  }

  Future<void> _printIdCard(Learner learner) async {
    final ok = await ShulePdfService.printDocument(
      name: 'StudentID_${learner.id}.pdf',
      build: () => ShulePdfService.buildStudentIdCardPdf(
        learner: learner,
        photoBytes: widget.workspace.photoFor(learner.id),
      ),
    );
    if (!mounted) return;
    setState(
      () => _statusNote = ok
          ? 'Opened print dialog for ${learner.name}\'s Student ID.'
          : 'Student ID PDF ready on Android print devices.',
    );
  }

  Future<void> _openPaymentDialog(Learner learner) async {
    final amountCtrl = TextEditingController(
      text: ((learner.balance ?? 0) > 0 ? (learner.balance ?? 0).round() : 100000).toString(),
    );
    var method = 'ClickPesa';
    var feeType = 'Tuition';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Record payment · ${learner.name}'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Amount (TZS)',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: Space.md),
              DropdownButtonFormField<String>(
                value: method,
                decoration: const InputDecoration(labelText: 'Payment method'),
                items: const ['ClickPesa', 'M-Pesa', 'CRDB Bank', 'NMB Bank', 'Airtel Money', 'Cash']
                    .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                    .toList(),
                onChanged: (v) => setDialogState(() => method = v ?? method),
              ),
              const SizedBox(height: Space.md),
              DropdownButtonFormField<String>(
                value: feeType,
                decoration: const InputDecoration(labelText: 'Fee category'),
                items: const ['Tuition', 'Boarding & Tuition', 'Exam Fees', 'Transport']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) => setDialogState(() => feeType = v ?? feeType),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save payment')),
          ],
        ),
      ),
    );

    if (confirmed != true) return;
    final amount = double.tryParse(amountCtrl.text.replaceAll(',', '').trim()) ?? 0;
    if (amount <= 0) return;
    final tx = widget.workspace.recordPayment(
      studentId: learner.id,
      amount: amount,
      feeType: feeType,
      paymentMethod: method,
    );
    await ShuleNotificationService.sendAlert(
      title: 'Fee payment recorded',
      body: '${formatTzs(amount)} received for ${learner.name} via $method (${tx.controlNumber}).',
    );
    if (!mounted) return;
    setState(() => _statusNote = 'Recorded ${formatTzs(amount)} via $method · Ref ${tx.controlNumber}.');
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: widget.workspace,
      builder: (context, _) {
        final learner = widget.workspace.learners.firstWhere(
          (l) => l.id == widget.learnerId,
          orElse: () => widget.workspace.learners.first,
        );
        final extra = widget.workspace.extraFor(learner.id);
        final photo = widget.workspace.photoFor(learner.id);
        final attendance = widget.workspace.attendanceFor(learner.id);
        final scores = widget.workspace.scoresFor(learner.id);
        final result = widget.workspace.resultFor(learner.id);
        final annual = widget.workspace.annualFeeFor(learner);
        final paid = widget.workspace.paidFor(learner);

        return DraggableScrollableSheet(
          initialChildSize: 0.88,
          minChildSize: 0.55,
          maxChildSize: 0.96,
          expand: false,
          builder: (context, controller) {
            return Container(
              decoration: BoxDecoration(
                color: tokens.canvas,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(Corners.hero)),
                border: Border.all(color: tokens.glassBorder),
              ),
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
                children: [
                  Center(
                    child: Container(
                      width: 42,
                      height: 4.5,
                      decoration: BoxDecoration(
                        color: tokens.border,
                        borderRadius: BorderRadius.circular(Corners.pill),
                      ),
                    ),
                  ),
                  const SizedBox(height: Space.lg),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      _PassportAvatar(
                        initials: learner.initials,
                        bytes: photo,
                        size: 72,
                      ),
                      const SizedBox(width: Space.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              learner.name,
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${learner.id} · ${learner.className} · ${learner.type} · ${extra.conductPoints} PTS',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            const SizedBox(height: 6),
                            Wrap(
                              spacing: Space.xs,
                              runSpacing: Space.xs,
                              children: [
                                StatusPill(
                                  label: result.division,
                                  background: tokens.blueWash,
                                  foreground: tokens.blueInk,
                                ),
                                StatusPill(
                                  label: attendance,
                                  background: attendance == 'Present'
                                      ? tokens.success.withValues(alpha: 0.14)
                                      : attendance == 'Absent'
                                          ? tokens.danger.withValues(alpha: 0.14)
                                          : tokens.warning.withValues(alpha: 0.16),
                                  foreground: attendance == 'Present'
                                      ? tokens.success
                                      : attendance == 'Absent'
                                          ? tokens.danger
                                          : tokens.warning,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => _pickPhoto(learner, fromCamera: false),
                        icon: const Icon(Icons.photo_library_outlined, size: 18),
                        label: const Text('Gallery photo'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => _pickPhoto(learner, fromCamera: true),
                        icon: const Icon(Icons.photo_camera_outlined, size: 18),
                        label: const Text('Take photo'),
                      ),
                    ],
                  ),
                  if (_statusNote != null) ...[
                    const SizedBox(height: Space.md),
                    Notice(
                      tone: NoticeTone.done,
                      title: 'Updated',
                      body: _statusNote!,
                    ),
                  ],
                  const SizedBox(height: Space.lg),
                  const SectionHead(title: 'Print official documents', trailing: 'PDF'),
                  const SizedBox(height: Space.sm),
                  Wrap(
                    spacing: Space.sm,
                    runSpacing: Space.sm,
                    children: [
                      FilledButton.icon(
                        onPressed: () => _printReportCard(learner),
                        icon: const Icon(Icons.print_rounded, size: 18),
                        label: const Text('Report card'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => _printFeeStatement(learner),
                        icon: const Icon(Icons.receipt_long_rounded, size: 18),
                        label: const Text('Fee statement'),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => _printIdCard(learner),
                        icon: const Icon(Icons.badge_outlined, size: 18),
                        label: const Text('Student ID'),
                      ),
                    ],
                  ),
                  const SizedBox(height: Space.lg),
                  ShuleGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Today\'s attendance', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: Space.sm),
                        Wrap(
                          spacing: Space.sm,
                          children: [
                            for (final status in const ['Present', 'Late', 'Absent'])
                              ChoicePill(
                                label: status,
                                selected: attendance == status,
                                onSelected: () => widget.workspace.setAttendance(learner.id, status),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.md),
                  ShuleGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text('Fee account', style: Theme.of(context).textTheme.titleMedium),
                            ),
                            TextButton.icon(
                              onPressed: () => _openPaymentDialog(learner),
                              icon: const Icon(Icons.add_card_rounded, size: 18),
                              label: const Text('Record payment'),
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.xs),
                        FactRow(label: 'Annual fee', value: formatTzs(annual)),
                        if (extra.arrears > 0)
                          FactRow(label: 'Prior arrears', value: formatTzs(extra.arrears)),
                        FactRow(label: 'Paid to date', value: formatTzs(paid)),
                        FactRow(
                          label: 'Balance due',
                          value: (learner.balance ?? 0) == 0 ? 'Cleared' : formatTzs(learner.balance),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.md),
                  ShuleGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Guardian & campus', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: Space.xs),
                        FactRow(label: 'Guardian', value: learner.guardianName),
                        FactRow(label: 'Phone', value: learner.guardianPhone),
                        FactRow(label: 'Email', value: learner.guardianEmail),
                        if (extra.hostel.isNotEmpty)
                          FactRow(label: 'Hostel wing', value: extra.hostel),
                        if (extra.route.isNotEmpty)
                          FactRow(label: 'Bus route', value: extra.route),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.md),
                  ShuleGlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'NECTA O-Level subjects',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                            ),
                            StatusPill(
                              label: '${result.average.toStringAsFixed(1)}% · ${result.points} pts',
                              background: tokens.blueWash,
                              foreground: tokens.blueInk,
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.sm),
                        for (final entry in scores.entries)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 5),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    entry.key,
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ),
                                Text(
                                  '${entry.value}%',
                                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                        fontFeatures: const [FontFeature.tabularFigures()],
                                      ),
                                ),
                                const SizedBox(width: Space.sm),
                                Container(
                                  width: 28,
                                  height: 28,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: tokens.blueWash,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    NectaGrading.gradeLetter(entry.value),
                                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                          color: tokens.blueInk,
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _PassportAvatar extends StatelessWidget {
  const _PassportAvatar({
    required this.initials,
    required this.bytes,
    required this.size,
  });

  final String initials;
  final Uint8List? bytes;
  final double size;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final photoBytes = bytes;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: tokens.blueHeroGradient,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: tokens.glassBorder, width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      alignment: Alignment.center,
      child: photoBytes != null
          ? Image.memory(photoBytes, width: size, height: size, fit: BoxFit.cover)
          : Text(
              initials,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: tokens.onGradient,
                    fontWeight: FontWeight.w800,
                  ),
            ),
    );
  }
}
