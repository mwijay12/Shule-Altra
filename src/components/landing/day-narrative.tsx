"use client"

/**
 * @fileOverview "One day, three states." A sticky stage swaps the frame as the
 * reader scrolls the three steps — capture, reconcile, issue. The stage is
 * sticky (not pinned by script) so it stays interruptible and cheap.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

const STEPS = [
  {
    n: "01",
    title: "Capture",
    body: "Roll call and the payment desk write into the same record, in the same second. No parallel books, no evening re-typing.",
    note: "Attendance · payments · petty cash",
  },
  {
    n: "02",
    title: "Reconcile",
    body: "Mobile-money and bank confirmations are matched to the learner's balance. Anything ambiguous is held in a verification queue, never silently absorbed.",
    note: "ClickPesa · Beem · bank statements",
  },
  {
    n: "03",
    title: "Issue",
    body: "The documents the school actually hands over — fee statements, report cards, timetables — are generated as vector PDFs on demand, stamped with the crest.",
    note: "10 report types · PDF + DOCX",
  },
]

export function DayNarrative() {
  const [step, setStep] = React.useState(0)
  const refs = React.useRef<Array<HTMLLIElement | null>>([])

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const idx = refs.current.findIndex((node) => node === entry.target)
          if (idx >= 0) setStep(idx)
        })
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    )
    refs.current.forEach((node) => node && io.observe(node))
    return () => io.disconnect()
  }, [])

  return (
    <div className="land-narr">
      <div className="land-narr-stage">
        <div className="land-narr-frame" data-step={step}>
          {/* 01 — register */}
          <div className="land-shot land-shot-1">
            <div className="land-shot-bar">
              <span>FORM 2 · A</span>
              <span>WED · 08:12</span>
            </div>
            {["A. KILONZO", "J. MWANSASU", "S. MAKAME", "R. SHAYO", "N. MSUYA"].map((name, i) => (
              <div className="land-shot-row" key={name}>
                <span>{name}</span>
                <span className={cn("land-shot-tick", i !== 3 && "is-on")}>{i === 3 ? "ABSENT" : "PRESENT"}</span>
              </div>
            ))}
            <div className="land-shot-foot">
              <span>TZS 185,000 · CLICKPESA</span>
              <span>WRITTEN</span>
            </div>
          </div>

          {/* 02 — reconciliation */}
          <div className="land-shot land-shot-2">
            <div className="land-shot-bar">
              <span>VERIFICATION QUEUE</span>
              <span>4 OPEN</span>
            </div>
            {[
              ["185,000", "CLICKPESA · 88KX2", "matched"],
              ["350,000", "NMB · 4471", "matched"],
              ["120,000", "BEEM · 92Q", "held"],
              ["90,000", "DESK · 0912", "matched"],
            ].map(([amount, ref, state]) => (
              <div className="land-shot-row" key={ref}>
                <span>{amount}</span>
                <span>{ref}</span>
                <span className={cn("land-shot-tick", state === "matched" ? "is-on" : "is-warn")}>{state}</span>
              </div>
            ))}
            <div className="land-shot-foot">
              <span>LEDGER ≠ BANK → 0</span>
              <span>BALANCED</span>
            </div>
          </div>

          {/* 03 — documents */}
          <div className="land-shot land-shot-3">
            <div className="land-doc land-doc-a">
              <i className="land-doc-crest" />
              <span>FEE STATEMENT</span>
              <em>TZS 185,000</em>
            </div>
            <div className="land-doc land-doc-b">
              <i className="land-doc-crest" />
              <span>REPORT CARD</span>
              <em>DIVISION I</em>
            </div>
            <div className="land-doc land-doc-c">
              <i className="land-doc-crest" />
              <span>TIMETABLE</span>
              <em>A4 · LANDSCAPE</em>
            </div>
          </div>
        </div>
      </div>

      <ol className="land-narr-steps">
        {STEPS.map((item, i) => (
          <li
            key={item.n}
            ref={(node) => {
              refs.current[i] = node
            }}
            className={cn("land-narr-step", i === step && "is-current")}
          >
            <span className="land-narr-num">{item.n}</span>
            <h3 className="land-narr-title">{item.title}</h3>
            <p className="land-narr-body">{item.body}</p>
            <span className="land-label">{item.note}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
