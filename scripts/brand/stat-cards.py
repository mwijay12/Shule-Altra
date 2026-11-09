"""Replace the hand-rolled stat cards on the remaining modules with StatCard.

Each page repeated the same markup with slightly different sizes, so the ring,
sparkline and staggered arrival existed only on the overview. This swaps the
markup for the shared tile and keeps each page's own labels and data.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]


def patch(relative, transform):
    path = ROOT / relative
    source = path.read_text()
    updated = transform(source)
    assert updated != source, f"no change in {relative}"
    path.write_text(updated)
    print(f"  {relative}")


def add_import(source):
    if 'admin/stat-card' in source:
        return source
    anchor = 'import { AnimatedNumber } from "@/components/ui/animated-number"'
    assert anchor in source, "AnimatedNumber import not found"
    return source.replace(
        anchor,
        anchor + '\nimport { StatCard } from "@/components/admin/stat-card"',
        1,
    )


def swap_block(source, first_label, new_block):
    """Replace from the array opening through the closing </div> of the grid."""
    start = source.index('        {[\n          { label: "' + first_label)
    tail = source.index('      </div>', source.index('stat.sub}</p>', start))
    return source[:start] + new_block + source[tail:]


# ── transport ─────────────────────────────────────────────────────────────────
def transport(source):
    labels = re.search(
        r'\{\[\n(\s+\{ label:.*?)\n\s+\]\.map', source, re.S
    )
    assert labels, "transport stat array not found"
    block = labels.group(1)
    # Keep the page's own figures; only the presentation changes.
    block = re.sub(r'color: "(text-[\w-]+)"', lambda m: 'tone: ' + {
        'text-primary': '"primary" as const',
        'text-green-600': '"emerald" as const',
        'text-orange-600': '"amber" as const',
        'text-destructive': '"rose" as const',
        'text-accent': '"accent" as const',
        'text-blue-600': '"primary" as const',
    }.get(m.group(1), '"primary" as const'), block)
    new = '        {[\n' + block + '\n        ].map((stat, i) => (\n          <StatCard key={stat.label} index={i} {...stat} />\n        ))}\n'
    start = source.index('        {[\n')
    tail = source.index('      </div>', source.index('stat.sub}</p>', start))
    return add_import(source[:start] + new + source[tail:])


# ── assets ────────────────────────────────────────────────────────────────────
def assets(source):
    new = '''        {[
          { label: "Total assets", value: assets?.length || 0, sub: "On the register", icon: HardDrive, tone: "primary" as const },
          { label: "Faulty", value: faultyCount, sub: "Action Required", icon: AlertCircle, tone: "rose" as const },
          { label: "Maintenance", value: maintenanceCount, sub: "In workshop", icon: Activity, tone: "amber" as const },
          { label: "QR Tagged", value: auditRate, suffix: "%", sub: "Registry coverage", icon: ShieldCheck, tone: "emerald" as const, progress: auditRate },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
'''
    return add_import(swap_block(source, 'Total assets', new))


# ── finance ───────────────────────────────────────────────────────────────────
def finance(source):
    new = '''        {[
          {
            label: "Revenue (7D)",
            value: weeklyTotal,
            format: formatTZSCompact,
            exact: formatTZS(weeklyTotal),
            icon: Zap,
            tone: "emerald" as const,
          },
          { label: "Audit Disputes", value: disputed, icon: AlertTriangle, tone: "rose" as const },
          { label: "Awaiting confirmation", value: pending, icon: History, tone: "primary" as const },
          {
            label: "Outstanding Fees",
            value: outstanding,
            format: formatTZSCompact,
            exact: formatTZS(outstanding),
            icon: Scale,
            tone: "amber" as const,
          },
        ].map((stat, i) => (
          <StatCard key={stat.label} index={i} {...stat} />
        ))}
'''
    start = source.index('        {[\n          {\n            title: "Revenue (7D)"')
    tail = source.index('      </div>', source.index('</Card>', start))
    return add_import(source[:start] + new + source[tail:])


print("Converting stat grids:")
patch('src/app/dashboard/transport/page.tsx', transport)
patch('src/app/dashboard/assets/page.tsx', assets)
patch('src/app/dashboard/finance/page.tsx', finance)
