/// Staff Directory (16 staff), Boarding Hostels (5 wings with live occupancy)
/// & School Transport (5 routes with live rider counts) — 100% website parity.
library;

import 'package:flutter/material.dart';

import '../data/demo_school_store.dart';
import '../design/glass.dart';
import '../design/tokens.dart';
import '../design/widgets.dart';

class CampusScreen extends StatelessWidget {
  const CampusScreen({super.key, this.workspace});

  final SchoolWorkspace? workspace;

  @override
  Widget build(BuildContext context) {
    final tokens = ShuleTokens.of(context);
    final w = workspace;

    Widget buildBody() {
      return ListView(
        padding: const EdgeInsets.fromLTRB(Space.lg, Space.md, Space.lg, Space.xl),
        children: [
          SectionHead(
            title: 'Boarding hostels',
            trailing: '${SchoolProfile.hostels.length} wings',
          ),
          const SizedBox(height: Space.sm),
          for (final hostel in SchoolProfile.hostels) ...[
            Builder(
              builder: (context) {
                final occupied = w?.hostelOccupancy(hostel.name) ?? 0;
                return ShuleGlassCard(
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
                              '${hostel.type} · ${hostel.block} · ${hostel.rooms} rooms',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            Text(
                              'Warden: ${hostel.warden}',
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                      StatusPill(
                        label: w != null ? '$occupied/${hostel.capacity}' : '${hostel.capacity} beds',
                        background: tokens.blueWash,
                        foreground: tokens.blueInk,
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: Space.sm),
          ],
          const SizedBox(height: Space.lg),
          SectionHead(
            title: 'Transport routes',
            trailing: '${SchoolProfile.routes.length} buses',
          ),
          const SizedBox(height: Space.sm),
          for (final route in SchoolProfile.routes) ...[
            Builder(
              builder: (context) {
                final riders = w?.routeRiders(route.name) ?? 0;
                return ShuleGlassCard(
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
                              '${route.vehicle} · Departs ${route.departureTime} · ${route.status}',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                            Text(
                              'Driver: ${route.driver} (${route.phone})',
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                      if (w != null)
                        StatusPill(
                          label: '$riders riders',
                          background: tokens.blueWash,
                          foreground: tokens.blueInk,
                        ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: Space.sm),
          ],
          const SizedBox(height: Space.lg),
          SectionHead(
            title: 'Staff directory',
            trailing: '${SchoolProfile.staffRoster.length} staff',
          ),
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
                    size: 40,
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
                          '${staff.title} · ${staff.department} (${staff.staffNo})',
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
        ],
      );
    }

    return Scaffold(
      backgroundColor: tokens.canvas,
      appBar: AppBar(title: const Text('Staff, Hostels & Transport')),
      body: ShuleBackdrop(
        child: w == null
            ? buildBody()
            : ListenableBuilder(listenable: w, builder: (_, __) => buildBody()),
      ),
    );
  }
}
