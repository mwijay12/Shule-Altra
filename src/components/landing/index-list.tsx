"use client"

/**
 * @fileOverview The registrar's index — an index-style list of the six modules.
 * Hovering or focusing a row fills it from the left, rolls the label and swaps
 * the preview panel. On touch there is no preview: the meta line carries it.
 */

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Row = {
  index: string
  title: string
  meta: string
  href: string
  stat: string
  statLabel: string
  lines: string[]
  bars: number[]
}

const ROWS: Row[] = [
  {
    index: "01",
    title: "Finance",
    meta: "ClickPesa · Beem · bank · petty cash",
    href: "/dashboard/finance",
    stat: "TZS 19.5M",
    statLabel: "reconciled this term",
    lines: ["140 movements in the ledger", "97 balance follow-ups flagged", "Control numbers issued per learner"],
    bars: [38, 62, 44, 78, 56, 90, 66],
  },
  {
    index: "02",
    title: "Academics",
    meta: "NECTA matrices · divisions · rank",
    href: "/dashboard/academics",
    stat: "2,788",
    statLabel: "scores on record",
    lines: ["CSEE & FTNA grade points", "Division I–IV with class position", "Best-score rollup per subject"],
    bars: [72, 54, 80, 48, 68, 58, 74],
  },
  {
    index: "03",
    title: "Attendance",
    meta: "daily register · absence warnings",
    href: "/dashboard/attendance",
    stat: "88.2%",
    statLabel: "presence, all streams",
    lines: ["900 register entries this term", "Per-learner absence streaks", "Boarding and day cohort split"],
    bars: [88, 82, 90, 86, 92, 84, 88],
  },
  {
    index: "04",
    title: "Documents",
    meta: "vector PDF · DOCX · no screenshots",
    href: "/dashboard/reports",
    stat: "10",
    statLabel: "report types generated",
    lines: ["Fee statements, report cards, ID sheets", "Timetables on real period allocation", "Letterhead with the school crest"],
    bars: [30, 46, 40, 66, 58, 84, 76],
  },
  {
    index: "05",
    title: "Timetable",
    meta: "5 days · 8 periods · 10 subjects",
    href: "/dashboard/timetable",
    stat: "40",
    statLabel: "periods allocated per class",
    lines: ["Balanced subject weighting", "No double periods per day", "Landscape A4 export, signed"],
    bars: [60, 60, 60, 60, 60, 60, 60],
  },
  {
    index: "06",
    title: "Compliance",
    meta: "PDPA 2022 · audit trail · roles",
    href: "/dashboard/settings",
    stat: "4",
    statLabel: "role scopes enforced",
    lines: ["Admin, teacher, bursar, viewer", "Every export written to the log", "Sovereign data under school-001"],
    bars: [92, 88, 96, 90, 94, 98, 92],
  },
]

export function IndexList() {
  const [active, setActive] = React.useState(0)
  const row = ROWS[active]
  const max = Math.max(...row.bars)

  return (
    <div className="land-index">
      <div className="land-index-rows" onMouseLeave={() => setActive(0)}>
        {ROWS.map((item, i) => {
          const isActive = i === active
          return (
            <Link
              key={item.index}
              href={item.href}
              className={cn("land-index-row", isActive && "is-active")}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              aria-label={`${item.title} — ${item.statLabel}`}
            >
              <span className="land-index-num">{item.index}</span>
              <span className="land-index-title">
                <span className="land-index-roll" data-text={item.title}>
                  {item.title}
                </span>
              </span>
              <span className="land-index-meta">{item.meta}</span>
              <span className="land-index-stat">{item.stat}</span>
              <span className="land-index-arrow" aria-hidden>
                ↗
              </span>
            </Link>
          )
        })}
      </div>

      <aside className="land-index-preview" aria-live="polite">
        <div className="land-index-preview-head">
          <span className="land-label">{row.meta}</span>
          <span className="land-index-preview-num">{row.index}</span>
        </div>
        <p className="land-index-preview-value">{row.stat}</p>
        <p className="land-index-preview-label">{row.statLabel}</p>
        <div className="land-bars" aria-hidden>
          {row.bars.map((bar, i) => (
            <i key={i} style={{ height: `${Math.round((bar / max) * 100)}%` }} />
          ))}
        </div>
        <div className="land-index-preview-steps" aria-hidden>
          {ROWS.map((_, i) => (
            <i key={i} className={i <= active ? "is-on" : undefined} />
          ))}
        </div>
        <ul className="land-index-preview-list">
          {row.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
