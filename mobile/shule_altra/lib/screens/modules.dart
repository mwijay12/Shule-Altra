/// Full website-parity module screens for Shule Altra mobile:
///  * AnalyticsScreen (`/dashboard/analytics`)
///  * CommunicationsScreen (`/dashboard/communications`)
///  * CanteenScreen (`/dashboard/canteen`)
///  * InventoryScreen (`/dashboard/assets`)
///  * ShuleGuideScreen (`/dashboard/ai-tools`)
///  * AuditTrailScreen (`/dashboard/audit`)
library;

import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';
import '../format.dart';
import '../services/device_services.dart';

String formatCompactTzs(double amount) {
  if (amount >= 1000000) {
    return 'TZS ${(amount / 1000000).toStringAsFixed(1)}M';
  }
  if (amount >= 1000) {
    return 'TZS ${(amount / 1000).toStringAsFixed(0)}K';
  }
  return formatTzs(amount);
}

/* -------------------------------------------------------------------------- */
/*  1. Analytics (`/dashboard/analytics`)                                     */
/* -------------------------------------------------------------------------- */

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Analytics & Forecasts')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: workspace,
          builder: (context, _) {
            final byClass = workspace.outstandingByClass;
            final maxClass = byClass.values.fold<double>(1, (m, v) => v > m ? v : m);
            final total = workspace.learners.length;
            final divCounts = <String, int>{
              'Division I': 0,
              'Division II': 0,
              'Division III': 0,
              'Division IV': 0,
              'Division 0': 0,
            };
            for (final l in workspace.learners) {
              final div = workspace.resultFor(l.id).division;
              if (divCounts.containsKey(div)) {
                divCounts[div] = divCounts[div]! + 1;
              }
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                ShuleGlassCard(
                  glowCorner: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const StatusPill(label: 'TRENDS & FORECASTS · 2026', uppercase: true),
                      const SizedBox(height: Space.md),
                      Row(
                        children: [
                          Expanded(
                            child: MetricBlock(
                              value: '${workspace.feeCollectionRate.toStringAsFixed(1)}%',
                              label: 'Collection rate',
                              caption: formatCompactTzs(workspace.totalCollectedFees),
                            ),
                          ),
                          Expanded(
                            child: MetricBlock(
                              value: '${workspace.attendanceRate.toStringAsFixed(1)}%',
                              label: 'Presence',
                              caption: '${workspace.absentCount} absent today',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'Outstanding by class', trailing: 'Largest first'),
                const SizedBox(height: Space.sm),
                ShuleGlassCard(
                  child: Column(
                    children: [
                      for (final entry in byClass.entries) ...[
                        Row(
                          children: [
                            SizedBox(
                              width: 64,
                              child: Text(entry.key, style: Theme.of(context).textTheme.titleSmall),
                            ),
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(Corners.pill),
                                child: LinearProgressIndicator(
                                  value: (entry.value / maxClass).clamp(0.0, 1.0),
                                  minHeight: 10,
                                  backgroundColor: tokens.blueWash,
                                  valueColor: AlwaysStoppedAnimation<Color>(tokens.primary),
                                ),
                              ),
                            ),
                            const SizedBox(width: Space.sm),
                            Text(
                              formatTzs(entry.value),
                              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                                    color: tokens.blueInk,
                                    fontWeight: FontWeight.w700,
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: Space.md),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'Register composition', trailing: 'Form 1–4'),
                const SizedBox(height: Space.sm),
                ShuleGlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Boarders · ${workspace.boarderCount}', style: Theme.of(context).textTheme.titleSmall),
                          Text('Day scholars · ${workspace.dayScholarCount}', style: Theme.of(context).textTheme.titleSmall),
                        ],
                      ),
                      const SizedBox(height: Space.sm),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(Corners.pill),
                        child: LinearProgressIndicator(
                          value: total == 0 ? 0 : workspace.boarderCount / total,
                          minHeight: 12,
                          backgroundColor: tokens.blueWash,
                          valueColor: AlwaysStoppedAnimation<Color>(tokens.primary),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'NECTA CSEE divisions', trailing: '150 learners'),
                const SizedBox(height: Space.sm),
                ShuleGlassCard(
                  child: Column(
                    children: [
                      for (final entry in divCounts.entries)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: Row(
                            children: [
                              Expanded(child: Text(entry.key, style: Theme.of(context).textTheme.bodyMedium)),
                              StatusPill(
                                label: '${entry.value} students',
                                background: tokens.blueWash,
                                foreground: tokens.blueInk,
                              ),
                            ],
                          ),
                        ),
                    ],
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

/* -------------------------------------------------------------------------- */
/*  2. Communications (`/dashboard/communications`)                           */
/* -------------------------------------------------------------------------- */

class CommunicationsScreen extends StatefulWidget {
  const CommunicationsScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<CommunicationsScreen> createState() => _CommunicationsScreenState();
}

class _CommunicationsScreenState extends State<CommunicationsScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  String _audience = 'All Guardians';

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _sendBroadcast() async {
    final t = _title.text.trim();
    final b = _body.text.trim();
    if (t.isEmpty || b.isEmpty) return;
    widget.workspace.addAnnouncement(t, b, audience: _audience);
    await ShuleMediaService.requestNotifications();
    await ShuleNotificationService.sendAlert(title: t, body: b);
    _title.clear();
    _body.clear();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Broadcast dispatched to $_audience.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Communications')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: widget.workspace,
          builder: (context, _) {
            final recipients = switch (_audience) {
              'Fee Balance Follow-up' => widget.workspace.learnersWithBalanceCount,
              'Form 4 Guardians' =>
                widget.workspace.learners.where((l) => l.className == 'Form 4').length,
              'All Staff' => SchoolProfile.staffRoster.length,
              _ => widget.workspace.learners.length,
            };

            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                ShuleGlassCard(
                  glowCorner: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text('Compose notice', style: Theme.of(context).textTheme.titleMedium),
                          ),
                          StatusPill(
                            label: '$recipients recipients',
                            background: tokens.blueWash,
                            foreground: tokens.blueInk,
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.md),
                      DropdownButtonFormField<String>(
                        value: _audience,
                        decoration: const InputDecoration(labelText: 'Audience'),
                        items: const [
                          'All Guardians',
                          'Fee Balance Follow-up',
                          'Form 4 Guardians',
                          'All Staff',
                        ]
                            .map((a) => DropdownMenuItem(value: a, child: Text(a)))
                            .toList(),
                        onChanged: (v) => setState(() => _audience = v ?? _audience),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: _title,
                        decoration: const InputDecoration(
                          labelText: 'Subject',
                          hintText: 'e.g. Term 2 Fee Balance Reminder',
                        ),
                      ),
                      const SizedBox(height: Space.sm),
                      TextField(
                        controller: _body,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Message',
                          hintText: 'Write your guardian or staff announcement…',
                        ),
                      ),
                      const SizedBox(height: Space.md),
                      GradientButton(
                        label: 'Send broadcast & notification',
                        icon: Icons.send_rounded,
                        onPressed: _sendBroadcast,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                SectionHead(
                  title: 'Recent broadcasts',
                  trailing: '${widget.workspace.announcements.length} messages',
                ),
                const SizedBox(height: Space.sm),
                for (final item in widget.workspace.announcements) ...[
                  ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.title, style: Theme.of(context).textTheme.titleSmall),
                        const SizedBox(height: 4),
                        Text(item.body, style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 6),
                        Text('${item.audience} · ${item.timeLabel}', style: Theme.of(context).textTheme.labelSmall),
                      ],
                    ),
                  ),
                  const SizedBox(height: Space.sm),
                ],
              ],
            );
          },
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  3. Canteen POS (`/dashboard/canteen`)                                     */
/* -------------------------------------------------------------------------- */

class CanteenScreen extends StatefulWidget {
  const CanteenScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<CanteenScreen> createState() => _CanteenScreenState();
}

class _CanteenScreenState extends State<CanteenScreen> {
  String? _selectedLearnerId;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Canteen Cards & Baskets')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: widget.workspace,
          builder: (context, _) {
            final sampleLearners = widget.workspace.learners.take(20).toList();
            final activeId = _selectedLearnerId ?? sampleLearners.first.id;
            final activeLearner = widget.workspace.learners.firstWhere(
              (l) => l.id == activeId,
              orElse: () => sampleLearners.first,
            );
            final totalSales = widget.workspace.canteenSales
                .fold<double>(0, (sum, s) => sum + s.amount);

            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
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
                              value: formatTzs(totalSales),
                              label: 'Canteen sales',
                            ),
                          ),
                          MetricBlock(
                            value: '${widget.workspace.canteenSales.length}',
                            label: 'Baskets',
                          ),
                        ],
                      ),
                      const SizedBox(height: Space.md),
                      DropdownButtonFormField<String>(
                        value: activeLearner.id,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Select student card'),
                        items: sampleLearners
                            .map(
                              (l) => DropdownMenuItem(
                                value: l.id,
                                child: Text('${l.name} (${l.id})', overflow: TextOverflow.ellipsis),
                              ),
                            )
                            .toList(),
                        onChanged: (v) => setState(() => _selectedLearnerId = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Space.lg),
                const SectionHead(title: 'Tap item to charge card', trailing: '8 items'),
                const SizedBox(height: Space.sm),
                Wrap(
                  spacing: Space.sm,
                  runSpacing: Space.sm,
                  children: [
                    for (final item in SchoolProfile.canteenMenu)
                      ActionChip(
                        avatar: const Icon(Icons.restaurant_rounded, size: 16),
                        label: Text('${item.item} · ${formatTzs(item.amount)}'),
                        onPressed: () {
                          widget.workspace.recordCanteenSale(
                            learner: activeLearner,
                            menuItem: item,
                          );
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Charged ${item.item} to ${activeLearner.name}.'),
                            ),
                          );
                        },
                      ),
                  ],
                ),
                const SizedBox(height: Space.lg),
                SectionHead(
                  title: 'Recent canteen sales',
                  trailing: '${widget.workspace.canteenSales.length} receipts',
                ),
                const SizedBox(height: Space.sm),
                for (final sale in widget.workspace.canteenSales.take(15)) ...[
                  ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    child: Row(
                      children: [
                        const ShuleGlyph(icon: Icons.fastfood_rounded, size: 38),
                        const SizedBox(width: Space.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(sale.studentName, style: Theme.of(context).textTheme.titleSmall),
                              Text('${sale.item} · ${sale.timeLabel}', style: Theme.of(context).textTheme.bodySmall),
                            ],
                          ),
                        ),
                        Text(
                          formatTzs(sale.amount),
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                color: tokens.blueInk,
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
          },
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  4. Inventory & Assets (`/dashboard/assets`)                               */
/* -------------------------------------------------------------------------- */

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> {
  String _category = 'All';

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final categories = <String>{'All', ...widget.workspace.assets.map((a) => a.category)}.toList();
    final filtered = _category == 'All'
        ? widget.workspace.assets
        : widget.workspace.assets.where((a) => a.category == _category).toList();
    final totalValue = filtered.fold<double>(0, (sum, a) => sum + a.value);

    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Inventory & Assets')),
      body: ShuleBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
          children: [
            ShuleGlassCard(
              glowCorner: true,
              child: Row(
                children: [
                  Expanded(
                    child: MetricBlock(
                      value: '${filtered.length}',
                      label: 'Assets tracked',
                    ),
                  ),
                  Expanded(
                    child: MetricBlock(
                      value: formatCompactTzs(totalValue),
                      label: 'Valuation',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final cat in categories) ...[
                    ChoicePill(
                      label: cat,
                      selected: _category == cat,
                      onSelected: () => setState(() => _category = cat),
                    ),
                    const SizedBox(width: Space.xs),
                  ],
                ],
              ),
            ),
            const SizedBox(height: Space.md),
            for (final asset in filtered) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.inventory_2_outlined, size: 40),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(asset.name, style: Theme.of(context).textTheme.titleSmall),
                          Text(
                            '${asset.tag} · ${asset.category} · ${asset.location}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: Space.xs,
                            children: [
                              StatusPill(
                                label: asset.status,
                                background: asset.status == 'Operational'
                                    ? tokens.success.withValues(alpha: 0.14)
                                    : tokens.warning.withValues(alpha: 0.16),
                                foreground:
                                    asset.status == 'Operational' ? tokens.success : tokens.warning,
                              ),
                              StatusPill(
                                label: '${asset.condition} · ${formatTzs(asset.value)}',
                                background: tokens.blueWash,
                                foreground: tokens.blueInk,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  5. Shule Guide (`/dashboard/ai-tools`)                                    */
/* -------------------------------------------------------------------------- */

class ShuleGuideScreen extends StatefulWidget {
  const ShuleGuideScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  State<ShuleGuideScreen> createState() => _ShuleGuideScreenState();
}

class _ShuleGuideScreenState extends State<ShuleGuideScreen> {
  final _input = TextEditingController();
  final List<({String q, String a})> _history = [];

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _ask(String question) {
    final q = question.trim();
    if (q.isEmpty) return;
    final lower = q.toLowerCase();
    final w = widget.workspace;
    String answer;

    if (lower.contains('owe') || lower.contains('balance') || lower.contains('follow')) {
      final top = w.topFollowUpQueue.take(3).map((l) => '${l.name} (${formatTzs(l.balance)})').join(', ');
      answer =
          '${w.learnersWithBalanceCount} learners have an open balance totalling ${formatTzs(w.totalOutstandingFees)} (${w.feeCollectionRate.toStringAsFixed(1)}% collected). Highest balances: $top.';
    } else if (lower.contains('absent') || lower.contains('attend') || lower.contains('present')) {
      final absentNames = w.learners
          .where((l) => w.attendanceFor(l.id) == 'Absent')
          .map((l) => '${l.name} (${l.className})')
          .join(', ');
      answer =
          'Register presence is ${w.attendanceRate.toStringAsFixed(1)}%. ${w.presentCount} present, ${w.lateCount} late, and ${w.absentCount} absent today: $absentNames.';
    } else if (lower.contains('disput') || lower.contains('pending') || lower.contains('ledger')) {
      answer =
          'Finance ledger has ${w.transactions.length} entries: ${w.verifiedReceiptCount} Verified, ${w.pendingReceiptCount} Pending (${formatTzs(w.pendingPaymentsAmount)}), and ${w.disputedReceiptCount} Disputed.';
    } else if (lower.contains('hostel') || lower.contains('board')) {
      answer =
          'There are ${w.boarderCount} boarders across 5 wings (Kilimanjaro, Serengeti, Lake Victoria, Zanzibar, Ruaha) and ${w.dayScholarCount} day scholars across 5 bus routes.';
    } else {
      answer =
          '${SchoolProfile.brandName} currently manages ${w.learners.length} O-Level learners (Form 1–4), ${w.attendanceRate.toStringAsFixed(1)}% present today, with ${formatCompactTzs(w.totalCollectedFees)} collected and ${formatCompactTzs(w.totalOutstandingFees)} outstanding.';
    }

    setState(() {
      _history.insert(0, (q: q, a: answer));
      _input.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Shule Guide · Local Help')),
      body: ShuleBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
          children: [
            ShuleGlassCard(
              glowCorner: true,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('Ask your live school register', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: Space.xs),
                  Text(
                    'Answers instantly offline from your live 150-learner workspace.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: Space.md),
                  Wrap(
                    spacing: Space.xs,
                    runSpacing: Space.xs,
                    children: [
                      for (final prompt in const [
                        'Who owes the highest balances?',
                        'Who is absent today?',
                        'How many disputed ledger entries?',
                        'Boarding and transport summary',
                      ])
                        ActionChip(
                          label: Text(prompt),
                          onPressed: () => _ask(prompt),
                        ),
                    ],
                  ),
                  const SizedBox(height: Space.md),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          onSubmitted: _ask,
                          decoration: const InputDecoration(
                            hintText: 'Ask about balances, attendance, hostels…',
                          ),
                        ),
                      ),
                      const SizedBox(width: Space.xs),
                      IconButton.filled(
                        onPressed: () => _ask(_input.text),
                        icon: const Icon(Icons.send_rounded),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: Space.lg),
            for (final item in _history) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.q, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: tokens.blueInk)),
                    const SizedBox(height: 6),
                    Text(item.a, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
          ],
        ),
      ),
    );
  }
}

/* -------------------------------------------------------------------------- */
/*  6. Audit Trail (`/dashboard/audit`)                                       */
/* -------------------------------------------------------------------------- */

class AuditTrailScreen extends StatelessWidget {
  const AuditTrailScreen({super.key, required this.workspace});

  final SchoolWorkspace workspace;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Audit Trail')),
      body: ShuleBackdrop(
        child: ListenableBuilder(
          listenable: workspace,
          builder: (context, _) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
              children: [
                Notice(
                  tone: NoticeTone.info,
                  title: 'Who changed what, and when',
                  body:
                      'Every payment, verification, enrolment, attendance change and broadcast is recorded here automatically.',
                ),
                const SizedBox(height: Space.lg),
                for (final entry in workspace.auditTrail) ...[
                  ShuleGlassCard(
                    padding: const EdgeInsets.all(Space.md),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const ShuleGlyph(icon: Icons.history_rounded, size: 38),
                        const SizedBox(width: Space.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(entry.action, style: Theme.of(context).textTheme.titleSmall),
                              Text(entry.target, style: Theme.of(context).textTheme.bodySmall),
                              const SizedBox(height: 3),
                              Text(
                                '${entry.actor} · ${entry.timeLabel}',
                                style: Theme.of(context).textTheme.labelSmall,
                              ),
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
          },
        ),
      ),
    );
  }
}
