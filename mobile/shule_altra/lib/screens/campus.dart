/// Staff Directory, Boarding Hostels & School Transport — mirrors the
/// website's Staff, Boarding and Transport sections from `seed-data.ts`.
library;

import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class CampusScreen extends StatelessWidget {
  const CampusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Staff & Campus')),
      body: ShuleBackdrop(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
          children: [
            const SectionHead(title: 'Staff directory', trailing: '8 key staff'),
            const SizedBox(height: Space.sm),
            for (final staff in SchoolProfile.staffRoster) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    ShuleGlyph(
                      icon: staff.role == 'ADMIN'
                          ? Icons.admin_panel_settings_rounded
                          : staff.role == 'BURSAR'
                              ? Icons.account_balance_wallet_rounded
                              : Icons.school_rounded,
                      size: 42,
                    ),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            staff.fullName,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 15),
                          ),
                          Text(
                            '${staff.title} · ${staff.department}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          Text(
                            '${staff.email} · ${staff.phone}',
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
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'Boarding hostels', trailing: '4 wings'),
            const SizedBox(height: Space.sm),
            for (final hostel in SchoolProfile.hostels) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.bed_rounded, size: 40),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(hostel.name, style: Theme.of(context).textTheme.titleSmall),
                          Text(
                            '${hostel.block} · Warden: ${hostel.warden}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    StatusPill(
                      label: '${hostel.occupied}/${hostel.capacity}',
                      background: tokens.blueWash,
                      foreground: tokens.blueInk,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: Space.sm),
            ],
            const SizedBox(height: Space.lg),
            const SectionHead(title: 'Transport routes', trailing: '4 buses'),
            const SizedBox(height: Space.sm),
            for (final route in SchoolProfile.routes) ...[
              ShuleGlassCard(
                padding: const EdgeInsets.all(Space.md),
                child: Row(
                  children: [
                    const ShuleGlyph(icon: Icons.directions_bus_rounded, size: 40),
                    const SizedBox(width: Space.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(route.name, style: Theme.of(context).textTheme.titleSmall),
                          Text(
                            '${route.vehicle} · Driver: ${route.driver} (${route.phone})',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    StatusPill(
                      label: '${route.riders} riders',
                      background: tokens.blueWash,
                      foreground: tokens.blueInk,
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
