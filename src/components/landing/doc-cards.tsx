"use client"

/**
 * @fileOverview Period six — the paper.
 *
 * Four documents, each a real file generated from the demo school. Cards tilt
 * under the pointer (max 6°, never more — the register is a serious object) and
 * carry a wax-seal style "generated" stamp that presses in on hover.
 */

import * as React from "react"
import { FileText } from "lucide-react"
import { mediaMatches, useLandingMotion } from "./motion"

type Doc = {
  name: string
  meta: string
  stat: string
  file: string
  note: string
}

const DOCUMENTS: Doc[] = [
  {
    name: "Fee statement",
    meta: "Financial · per learner",
    stat: "4 pages",
    file: "/printables/reports/fee-ledger.pdf",
    note: "140 movements, running balance, verification status.",
  },
  {
    name: "Report card",
    meta: "Academic · NECTA",
    stat: "Division I–IV",
    file: "/printables/report-card.pdf",
    note: "Grade points, class position, teacher and head remarks.",
  },
  {
    name: "Timetable",
    meta: "Operations · A4 landscape",
    stat: "40 periods",
    file: "/printables/timetable.pdf",
    note: "Real subject weighting across five days, signed off.",
  },
  {
    name: "Master sheet",
    meta: "Academic · whole cohort",
    stat: "7 pages",
    file: "/printables/reports/master-sheet.pdf",
    note: "150 learners by subject code, totals and averages.",
  },
]

function DocCard({ doc, index, motionOn }: { doc: Doc; index: number; motionOn: boolean }) {
  const ref = React.useRef<HTMLAnchorElement | null>(null)

  React.useEffect(() => {
    const card = ref.current
    if (!card) return
    if (!motionOn) {
      card.style.transform = ""
      return
    }
    if (!mediaMatches("(pointer: fine)")) return

    const onMove = (event: PointerEvent) => {
      const rect = card.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width - 0.5
      const py = (event.clientY - rect.top) / rect.height - 0.5
      card.style.transform = `perspective(900px) rotateY(${(px * 5).toFixed(2)}deg) rotateX(${(-py * 4).toFixed(2)}deg) translateY(-4px)`
      card.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`)
      card.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`)
    }
    const reset = () => {
      card.style.transform = ""
    }
    card.addEventListener("pointermove", onMove)
    card.addEventListener("pointerleave", reset)
    return () => {
      card.removeEventListener("pointermove", onMove)
      card.removeEventListener("pointerleave", reset)
      card.style.transform = ""
    }
  }, [motionOn])

  return (
    <a
      ref={ref}
      className="sd-doc"
      href={doc.file}
      target="_blank"
      rel="noreferrer"
      style={{ transitionDelay: `${index * 30}ms` }}
    >
      <span className="sd-doc-glow" aria-hidden />
      <span className="sd-doc-top">
        <FileText className="h-4 w-4" strokeWidth={1.6} aria-hidden />
        <span>{doc.meta}</span>
      </span>
      <span className="sd-doc-name">{doc.name}</span>
      <span className="sd-doc-note">{doc.note}</span>
      <span className="sd-doc-foot">
        <span className="sd-doc-stat">{doc.stat}</span>
        <span className="sd-doc-open" aria-hidden>
          Open ↗
        </span>
      </span>
      <span className="sd-doc-stamp" aria-hidden>
        Generated
      </span>
    </a>
  )
}

export function DocCards() {
  const { on } = useLandingMotion()
  return (
    <div className="sd-docs">
      {DOCUMENTS.map((doc, index) => (
        <DocCard key={doc.name} doc={doc} index={index} motionOn={on} />
      ))}
    </div>
  )
}
