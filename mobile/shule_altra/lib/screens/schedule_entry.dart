/// Shared, readable timeline row for fictional and saved schedules.
library;

import 'package:flutter/material.dart';

import '../design/tokens.dart';

class ScheduleEntry extends StatelessWidget {
  const ScheduleEntry({super.key, required this.time, required this.title,
    required this.detail, this.isBreak = false});
  final String time;
  final String title;
  final String detail;
  final bool isBreak;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: Space.sm),
      child: Container(
        padding: const EdgeInsets.all(Space.lg),
        decoration: BoxDecoration(
          color: isBreak ? tokens.mutedSurface : tokens.surface,
          borderRadius: BorderRadius.circular(Corners.panel),
          border: Border.all(color: tokens.border),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(isBreak ? Icons.free_breakfast_outlined : Icons.menu_book_outlined, color: tokens.primary),
          const SizedBox(width: Space.md),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(time, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: tokens.primary)),
            const SizedBox(height: Space.xs),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            if (detail.isNotEmpty) ...[
              const SizedBox(height: Space.xs),
              Text(detail, style: Theme.of(context).textTheme.bodySmall),
            ],
          ])),
        ]),
      ),
    );
  }
}
