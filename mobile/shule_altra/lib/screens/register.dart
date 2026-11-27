/// Full Learners Directory screen — website feature parity for mobile.
///
/// NO login or "Connect my school" gate lives here. Staff can immediately:
///  * search & filter learners by Form 1–4, fee status, attendance, or Boarding/Day
///  * enrol a new learner (with gallery/camera passport photo)
///  * print the filtered class register as a real PDF
///  * open any learner's dossier (grades, fees, photo picker, report card & ID PDF)
library;

import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../app/session.dart';
import '../data/demo_school_store.dart';
import '../data/learner.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';
import 'learner_detail.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.session,
    required this.workspace,
  });

  final AppSession session;
  final SchoolWorkspace workspace;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _search = TextEditingController();
  String _selectedClass = 'All';
  String _statusFilter = 'All';

  static const _classFilters = <String>['All', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
  static const _statusFilters = <String>['All', 'Owes fees', 'Cleared', 'Boarding', 'Absent / Late'];

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  List<Learner> _filter(List<Learner> source) {
    final q = _search.text.trim().toLowerCase();
    return source.where((l) {
      if (_selectedClass != 'All' && l.className != _selectedClass) return false;
      final att = widget.workspace.attendanceFor(l.id);
      if (_statusFilter == 'Owes fees' && (l.balance ?? 0) <= 0) return false;
      if (_statusFilter == 'Cleared' && (l.balance ?? 0) > 0) return false;
      if (_statusFilter == 'Boarding' && l.type != 'Boarding') return false;
      if (_statusFilter == 'Absent / Late' && att == 'Present') return false;
      if (q.isNotEmpty) {
        final hay = '${l.name} ${l.id} ${l.className} ${l.stream} ${l.guardianName}'.toLowerCase();
        if (!hay.contains(q)) return false;
      }
      return true;
    }).toList();
  }

  Future<void> _openEnrolSheet() async {
    final nameCtrl = TextEditingController();
    final guardianCtrl = TextEditingController();
    final phoneCtrl = TextEditingController(text: '+255 7');
    final emailCtrl = TextEditingController();
    var cls = 'Form 1';
    var stream = 'A';
    var type = 'Day';
    Uint8List? photoBytes;

    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final tokens = ShuleTokens.of(ctx);
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
              child: Container(
                decoration: BoxDecoration(
                  color: tokens.canvas,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(Corners.hero)),
                  border: Border.all(color: tokens.glassBorder),
                ),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
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
                      const SizedBox(height: Space.md),
                      Text('Enrol new learner', style: Theme.of(ctx).textTheme.headlineSmall),
                      const SizedBox(height: Space.xs),
                      Text(
                        'Adds directly to ${SchoolProfile.schoolName} with optional passport photo.',
                        style: Theme.of(ctx).textTheme.bodySmall,
                      ),
                      const SizedBox(height: Space.md),
                      Row(
                        children: [
                          Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: tokens.blueWash,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: tokens.border),
                            ),
                            clipBehavior: Clip.antiAlias,
                            alignment: Alignment.center,
                            child: photoBytes != null
                                ? Image.memory(photoBytes!, width: 60, height: 60, fit: BoxFit.cover)
                                : Icon(Icons.person_outline_rounded, color: tokens.blueInk, size: 28),
                          ),
                          const SizedBox(width: Space.md),
                          Expanded(
                            child: Wrap(
                              spacing: Space.xs,
                              runSpacing: Space.xs,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () async {
                                    await ShuleMediaService.requestPhotos();
                                    final bytes = await ShuleMediaService.pickPhoto(fromCamera: false);
                                    if (bytes != null) setSheetState(() => photoBytes = bytes);
                                  },
                                  icon: const Icon(Icons.photo_library_outlined, size: 17),
                                  label: const Text('Gallery'),
                                ),
                                OutlinedButton.icon(
                                  onPressed: () async {
                                    await ShuleMediaService.requestCamera();
                                    final bytes = await ShuleMediaService.pickPhoto(fromCamera: true);
                                    if (bytes != null) setSheetState(() => photoBytes = bytes);
                                  },
                                  icon: const Icon(Icons.photo_camera_outlined, size: 17),
                                  label: const Text('Camera'),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.md),
                      TextField(
                        controller: nameCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Learner full name',
                          hintText: 'e.g. Asha Ramadhani',
                        ),
                      ),
                      const SizedBox(height: Space.sm),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: cls,
                              decoration: const InputDecoration(labelText: 'Form'),
                              items: const ['Form 1', 'Form 2', 'Form 3', 'Form 4']
                                  .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                                  .toList(),
                              onChanged: (v) => setSheetState(() => cls = v ?? cls),
                            ),
                          ),
                          const SizedBox(width: Space.sm),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: stream,
                              decoration: const InputDecoration(labelText: 'Stream'),
                              items: const ['A', 'B']
                                  .map((s) => DropdownMenuItem(value: s, child: Text('Stream $s')))
                                  .toList(),
                              onChanged: (v) => setSheetState(() => stream = v ?? stream),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.sm),
                      DropdownButtonFormField<String>(
                        value: type,
                        decoration: const InputDecoration(labelText: 'Category'),
                        items: const ['Day', 'Boarding']
                            .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                            .toList(),
                        onChanged: (v) => setSheetState(() => type = v ?? type),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: guardianCtrl,
                        textCapitalization: TextCapitalization.words,
                        decoration: const InputDecoration(
                          labelText: 'Guardian name',
                          hintText: 'e.g. Ramadhani Ally',
                        ),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: phoneCtrl,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(labelText: 'Guardian phone'),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Guardian email (optional)',
                          hintText: 'parent@example.com',
                        ),
                      ),
                      const SizedBox(height: Space.lg),
                      GradientButton(
                        label: 'Save & enrol learner',
                        icon: Icons.person_add_alt_1_rounded,
                        onPressed: () {
                          if (nameCtrl.text.trim().isEmpty) return;
                          widget.workspace.enrolLearner(
                            name: nameCtrl.text,
                            className: cls,
                            stream: stream,
                            type: type,
                            guardianName: guardianCtrl.text.trim().isEmpty
                                ? 'Parent / Guardian'
                                : guardianCtrl.text,
                            guardianPhone: phoneCtrl.text,
                            guardianEmail: emailCtrl.text,
                            photoBytes: photoBytes,
                          );
                          Navigator.pop(ctx, true);
                        },
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );

    if (created == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Learner enrolled into Mwalimu Nyerere Secondary School.')),
      );
    }
  }

  Future<void> _printRegister(List<Learner> visible) async {
    final title = _selectedClass == 'All' ? 'School Learners Register' : '$_selectedClass Register';
    await ShulePdfService.printDocument(
      name: '${title.replaceAll(' ', '_')}.pdf',
      build: () => ShulePdfService.buildClassRegisterPdf(
        title: title,
        learners: visible,
        attendanceOf: widget.workspace.attendanceFor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return ListenableBuilder(
      listenable: Listenable.merge([widget.workspace, widget.session]),
      builder: (context, _) {
        final all = widget.workspace.learners;
        final visible = _filter(all);
        final cleared = all.where((l) => (l.balance ?? 0) == 0).length;

        return ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.dockClearance),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Learners', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 28)),
                      Text(
                        '${SchoolProfile.schoolName} · ${all.length} active',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                FilledButton.icon(
                  onPressed: _openEnrolSheet,
                  icon: const Icon(Icons.person_add_alt_1_rounded, size: 18),
                  label: const Text('Enrol'),
                ),
              ],
            ),
            const SizedBox(height: Space.md),
            // Summary glass strip
            ShuleGlassCard(
              padding: const EdgeInsets.all(Space.md),
              child: Row(
                children: [
                  Expanded(
                    child: MetricBlock(
                      value: '${all.length}',
                      label: 'Enrolled',
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
                      value: '$cleared',
                      label: 'Fees cleared',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: 'Search learner, ID, class or guardian',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _search.text.isEmpty
                    ? IconButton(
                        tooltip: 'Print filtered register PDF',
                        onPressed: () => _printRegister(visible),
                        icon: const Icon(Icons.print_rounded),
                      )
                    : IconButton(
                        tooltip: 'Clear search',
                        onPressed: () {
                          _search.clear();
                          setState(() {});
                        },
                        icon: const Icon(Icons.close_rounded),
                      ),
              ),
            ),
            const SizedBox(height: Space.md),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final cls in _classFilters) ...[
                    ChoicePill(
                      label: cls,
                      selected: _selectedClass == cls,
                      onSelected: () => setState(() => _selectedClass = cls),
                    ),
                    const SizedBox(width: Space.xs),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.sm),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final filter in _statusFilters) ...[
                    Padding(
                      padding: const EdgeInsets.only(right: Space.xs),
                      child: FilterChip(
                        label: Text(filter),
                        selected: _statusFilter == filter,
                        onSelected: (_) => setState(() => _statusFilter = filter),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            Row(
              children: [
                Expanded(
                  child: SectionHead(
                    title: _selectedClass == 'All' ? 'Directory' : _selectedClass,
                    trailing: '${visible.length} shown',
                  ),
                ),
                const SizedBox(width: Space.xs),
                TextButton.icon(
                  onPressed: () => _printRegister(visible),
                  icon: const Icon(Icons.print_outlined, size: 18),
                  label: const Text('Print PDF'),
                ),
              ],
            ),
            const SizedBox(height: Space.sm),
            if (visible.isEmpty)
              EmptyState(
                title: 'No matching learners',
                body: 'Try clearing the search query or choosing a different class filter.',
                action: OutlinedButton(
                  onPressed: () {
                    _search.clear();
                    setState(() {
                      _selectedClass = 'All';
                      _statusFilter = 'All';
                    });
                  },
                  child: const Text('Reset filters'),
                ),
              )
            else
              for (final learner in visible) ...[
                _LearnerRowCard(
                  learner: learner,
                  photo: widget.workspace.photoFor(learner.id),
                  attendance: widget.workspace.attendanceFor(learner.id),
                  division: widget.workspace.resultFor(learner.id).division,
                  onTap: () => showLearnerDetail(
                    context: context,
                    workspace: widget.workspace,
                    learnerId: learner.id,
                  ),
                ),
                const SizedBox(height: Space.sm),
              ],
            if (!widget.session.acceptsDemoCredential && widget.session.rows.isNotEmpty) ...[
              const SizedBox(height: Space.md),
              Notice(
                tone: NoticeTone.info,
                title: 'Live Firestore connected',
                body:
                    '${widget.session.rows.length} synced records available from ${widget.session.sourceLabel}.',
              ),
            ],
            const SizedBox(height: Space.sm),
            Center(
              child: Text(
                'Tap any learner for passport photo, NECTA grades, payments & PDF printing.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.inkMuted),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _LearnerRowCard extends StatelessWidget {
  const _LearnerRowCard({
    required this.learner,
    required this.photo,
    required this.attendance,
    required this.division,
    required this.onTap,
  });

  final Learner learner;
  final Uint8List? photo;
  final String attendance;
  final String division;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final owes = (learner.balance ?? 0) > 0;
    return ShuleGlassCard(
      padding: const EdgeInsets.all(Space.md),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: tokens.blueHeroGradient,
              borderRadius: BorderRadius.circular(15),
            ),
            clipBehavior: Clip.antiAlias,
            alignment: Alignment.center,
            child: photo != null
                ? Image.memory(photo!, width: 48, height: 48, fit: BoxFit.cover)
                : Text(
                    learner.initials,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: tokens.onGradient,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
          ),
          const SizedBox(width: Space.md),
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
                const SizedBox(height: 2),
                Text(
                  '${learner.className} ${learner.stream} · ${learner.type} · $division',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 5),
                Wrap(
                  spacing: Space.xs,
                  runSpacing: Space.xs,
                  children: [
                    StatusPill(
                      label: attendance,
                      background: attendance == 'Present'
                          ? tokens.success.withValues(alpha: 0.14)
                          : tokens.warning.withValues(alpha: 0.16),
                      foreground: attendance == 'Present' ? tokens.success : tokens.warning,
                    ),
                    StatusPill(
                      label: owes ? formatTzs(learner.balance) : 'Fees cleared',
                      background: owes ? tokens.blueWash : tokens.success.withValues(alpha: 0.12),
                      foreground: owes ? tokens.blueInk : tokens.success,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: Space.xs),
          Icon(Icons.chevron_right_rounded, color: tokens.inkMuted),
        ],
      ),
    );
  }
}
