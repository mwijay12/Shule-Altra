"use client"

/**
 * @fileOverview The idle system: a ledger that keeps recording while the
 * pointer is still. Rows settle in on a slow cycle; totals count up on view.
 */

import * as React from "react"
import { useCountUp } from "@/components/landing/reveal"
import { cn } from "@/lib/utils"

type Entry = { learner: string; form: string; amount: string; method: string; state: "verified" | "pending" | "matched" }

const ENTRIES: Entry[] = [
  { learner: "A. KILONZO", form: "F2 · A", amount: "185,000", method: "CLICKPESA", state: "verified" },
  { learner: "J. MWANSASU", form: "F4 · B", amount: "350,000", method: "NMB BANK", state: "matched" },
  { learner: "S. MAKAME", form: "F1 · C", amount: "120,000", method: "BEEM", state: "pending" },
  { learner: "R. SHAYO", form: "F3 · A", amount: "275,000", method: "CLICKPESA", state: "verified" },
  { learner: "N. MSUYA", form: "F2 · B", amount: "90,000", method: "CASH DESK", state: "matched" },
  { learner: "D. KIMARO", form: "F4 · A", amount: "210,000", method: "CRDB", state: "verified" },
  { learner: "H. MKWAWA", form: "F1 · B", amount: "150,000", method: "BEEM", state: "pending" },
]

export function LedgerPanel({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(4)
  const collected = useCountUp(19500000)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => {
      setVisible((v) => (v >= ENTRIES.length ? 4 : v + 1))
    }, 2600)
    return () => window.clearInterval(id)
  }, [])

  const rows = ENTRIES.slice(0, visible)

  return (
    <div className={cn("land-ledger", className)}>
      <div className="land-ledger-head">
        <span className="land-ledger-live">
          <i /> LEDGER · LIVE
        </span>
        <span>school-001</span>
      </div>

      <div className="land-ledger-rows">
        {rows.map((row, i) => (
          <div className="land-ledger-row" key={`${row.learner}-${i}`} style={{ animationDelay: `${i * 20}ms` }}>
            <span className="land-ledger-name">{row.learner}</span>
            <span className="land-ledger-form">{row.form}</span>
            <span className="land-ledger-amount">{row.amount}</span>
            <span className="land-ledger-method">{row.method}</span>
            <span className={cn("land-ledger-state", `is-${row.state}`)}>{row.state}</span>
          </div>
        ))}
        <div className="land-ledger-ghost" aria-hidden>
          <span>·</span>
          <span>·</span>
          <span>·</span>
        </div>
      </div>

      <div className="land-ledger-foot">
        <div>
          <span className="land-label">Collected · term 2</span>
          <span className="land-ledger-total" ref={collected.ref}>
            {`TZS ${Math.round(collected.value).toLocaleString("en-US")}`}
          </span>
        </div>
        <div>
          <span className="land-label">Awaiting verification</span>
          <span className="land-ledger-sub">TZS 5,760,000</span>
        </div>
      </div>
    </div>
  )
}
