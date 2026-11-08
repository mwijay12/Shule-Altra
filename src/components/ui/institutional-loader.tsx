"use client"

/**
 * @fileOverview The boot screen for the admin shell.
 *
 * Two rules learned the hard way:
 *  1. It must never be the only thing between the visitor and the app. The
 *     caller keeps its own timeout, and this component self-dismisses on a CSS
 *     timer as well as through React, so a stalled frame cannot leave a white
 *     page behind.
 *  2. It has to look like the same product as the landing page: the gradient
 *     plate and the shield are the brand mark, not a lucide glyph.
 *
 * Progress is a real rAF ramp (not four random jumps a second) and it resolves
 * in about a second. Under `prefers-reduced-motion` the whole screen is skipped.
 */

import * as React from "react"
import { BrandMark, Wordmark } from "@/components/brand/logo"

const STAGES = [
  { at: 0, label: "Verifying session" },
  { at: 34, label: "Loading the register" },
  { at: 68, label: "Reconciling the ledger" },
  { at: 92, label: "Opening the hub" },
]

function stageFor(progress: number) {
  let label = STAGES[0].label
  for (const stage of STAGES) if (progress >= stage.at) label = stage.label
  return label
}

export function InstitutionalLoader({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = React.useState(0)
  const [leaving, setLeaving] = React.useState(false)
  const onCompleteRef = React.useRef(onComplete)
  const done = React.useRef(false)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const finish = React.useCallback(() => {
    if (done.current) return
    done.current = true
    setProgress(100)
    setLeaving(true)
    window.setTimeout(() => onCompleteRef.current?.(), 380)
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduced || typeof requestAnimationFrame !== "function") {
      const immediate = window.setTimeout(finish, 120)
      return () => window.clearTimeout(immediate)
    }

    let raf = 0
    const start = performance.now()
    const duration = 900

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      setProgress(Math.round((1 - Math.pow(1 - p, 2.4)) * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else finish()
    }
    raf = requestAnimationFrame(tick)

    // Failsafe: whatever happens above, the shell opens inside 1.6s.
    const guard = window.setTimeout(finish, 1600)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(guard)
    }
  }, [finish])

  return (
    <div
      className="inst-boot fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden p-6 sm:p-10"
      data-leaving={leaving ? "true" : "false"}
      role="status"
      aria-live="polite"
      aria-label="Loading the Shule Altra hub"
    >
      {/* the same light the landing page opens with */}
      <div className="inst-boot-glow" aria-hidden />

      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.34em] text-white/55">
        <span>Shule Altra</span>
        <span>School management · 2026</span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
        <BrandMark
          size={92}
          radius={26}
          className="inst-boot-mark drop-shadow-[0_24px_60px_rgba(10,8,30,0.55)]"
        />
        <div className="flex flex-col items-center gap-3">
          <Wordmark size={30} className="text-white" onDark />
          <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-white/45">
            Dar es Salaam · school-001
          </p>
        </div>
      </div>

      <div className="relative space-y-3">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/12">
          <div
            className="inst-boot-bar h-full rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">
          <span>{stageFor(progress)}</span>
          <span className="tabular-nums text-white/80">{progress}%</span>
        </div>
      </div>
    </div>
  )
}
