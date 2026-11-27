/// Full 150-Student Directory screen — mirrors `https://shule-direct-pro.vercel.app/dashboard/students`.
///
/// Uses `ListView.builder` for silky 60fps scrolling over all 150 O-Level
/// learners (`ALT-2026-001` – `ALT-2026-150`), showing Boarder/Day split,
/// conduct points, hostel wing / bus route tags, live search & filters,
/// learner enrolment with passport photo, and one-tap PDF register printing.
library;

import 'package:flutter/foundation.dart';
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
import 'modules.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.session,
    required this.workspace,
    this.initialStatusFilter = 'All',
    this.headerTitle = 'Learners',
  });

  final AppSession session;
  final SchoolWorkspace workspace;
  final String initialStatusFilter;
  final String headerTitle;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final TextEditingController _search = TextEditingController();
  String _selectedClass = 'All';
  late String _statusFilter = widget.initialStatusFilter;

  static const _classFilters = <String>['All', 'Form 1', 'Form 2', 'Form 3', 'Form 4'];
  static const _statusFilters = <String>['All', 'Owes fees', 'Cleared', 'Boarder', 'Day', 'Absent / Late'];

  @override
  void didUpdateWidget(covariant RegisterScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialStatusFilter != widget.initialStatusFilter) {
      _statusFilter = widget.initialStatusFilter;
    }
  }

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
      if (_statusFilter == 'Boarder' && l.type != 'Boarder') return false;
      if (_statusFilter == 'Day' && l.type == 'Boarder') return false;
      if (_statusFilter == 'Absent / Late' && att == 'Present') return false;
      if (q.isNotEmpty) {
        final extra = widget.workspace.extraFor(l.id);
        final hay =
            '${l.name} ${l.id} ${l.className} ${l.stream} ${l.guardianName} ${extra.hostel} ${extra.route}'
                .toLowerCase();
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
    var type = 'Boarder';
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
                        items: const ['Boarder', 'Day']
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
        const SnackBar(content: Text('Learner enrolled into Shule Altra.')),
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
    return ListenableBuilder(
      listenable: Listenable.merge([widget.workspace, widget.session]),
      builder: (context, _) {
        final all = widget.workspace.learners;
        final visible = _filter(all);

        return CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.sm),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.headerTitle,
                                style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 28),
                              ),
                              Text(
                                '${SchoolProfile.schoolName} · ${all.length} O-Level learners',
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
                    ShuleGlassCard(
                      padding: const EdgeInsets.all(Space.md),
                      child: Row(
                        children: [
                          Expanded(
                            child: MetricBlock(
                              value: '${all.length}',
                              label: 'Enrolled',
                              caption: '${widget.workspace.boarderCount} boarders',
                            ),
                          ),
                          Expanded(
                            child: MetricBlock(
                              value: '${widget.workspace.attendanceRate.toStringAsFixed(1)}%',
                              label: 'Present',
                              caption: '${widget.workspace.absentCount} absent',
                            ),
                          ),
                          Expanded(
                            child: MetricBlock(
                              value: formatCompactTzs(widget.workspace.totalOutstandingFees),
                              label: 'Outstanding',
                              caption: '${widget.workspace.learnersWithBalanceCount} owing',
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
                        hintText: 'Search name, ALT-2026 ID, wing, route or guardian',
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
                  ],
                ),
              ),
            ),
            if (visible.isEmpty)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(Space.lg, Space.sm, Space.lg, Space.dockClearance),
                sliver: SliverToBoxAdapter(
                  child: EmptyState(
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
                  ),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(Space.lg, 0, Space.lg, Space.dockClearance),
                sliver: SliverList.separated(
                  itemCount: visible.length,
                  separatorBuilder: (_, __) => const SizedBox(height: Space.sm),
                  itemBuilder: (context, index) {
                    final learner = visible[index];
                    return _LearnerRowCard(
                      learner: learner,
                      extra: widget.workspace.extraFor(learner.id),
                      photo: widget.workspace.photoFor(learner.id),
                      attendance: widget.workspace.attendanceFor(learner.id),
                      onTap: () => showLearnerDetail(
                        context: context,
                        workspace: widget.workspace,
                        learnerId: learner.id,
                      ),
                    );
                  },
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
    required this.extra,
    required this.photo,
    required this.attendance,
    required this.onTap,
  });

  final Learner learner;
  final LearnerExtra extra;
  final Uint8List? photo;
  final String attendance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final owes = (learner.balance ?? 0) > 0;
    final tag = extra.hostel.isNotEmpty ? extra.hostel : extra.route;
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
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14.5),
                ),
                const SizedBox(height: 2),
                Text(
                  '${learner.id} · ${learner.className} · ${tag.isNotEmpty ? tag : learner.type}',
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
                          : attendance == 'Absent'
                              ? tokens.danger.withValues(alpha: 0.14)
                              : tokens.warning.withValues(alpha: 0.16),
                      foreground: attendance == 'Present'
                          ? tokens.success
                          : attendance == 'Absent'
                              ? tokens.danger
                              : tokens.warning,
                    ),
                    StatusPill(
                      label: owes ? formatTzs(learner.balance) : 'Cleared',
                      background: owes ? tokens.blueWash : tokens.success.withValues(alpha: 0.12),
                      foreground: owes ? tokens.blueInk : tokens.success,
                    ),
                    StatusPill(
                      label: '${extra.conductPoints} PTS',
                      background: tokens.innerSurface,
                      foreground: tokens.inkMuted,
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
