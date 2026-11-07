"use client"

/**
 * @fileOverview First-visit build: a mono counter that reports progress, then a
 * two-panel curtain that hands off to the hero. Skipped entirely for
 * `prefers-reduced-motion`, and never blocks for longer than 2s.
 */

import * as React from "react"
import { prefersReducedMotion } from "@/components/landing/reveal"

export function LandingLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = React.useState(0)
  const [exiting, setExiting] = React.useState(false)
  const done = React.useRef(false)

  const finish = React.useCallback(() => {
    if (done.current) return
    done.current = true
    setProgress(100)
    setExiting(true)
    window.setTimeout(() => onDone(), 420)
  }, [onDone])

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      onDone()
      return
    }
    const start = performance.now()
    const duration = 1250
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 2.2)
      setProgress(Math.round(eased * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else finish()
    }
    raf = requestAnimationFrame(tick)
    const guard = window.setTimeout(finish, 2000)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(guard)
    }
  }, [finish, onDone])

  return (
    <div className="land-loader" data-exiting={exiting ? "true" : "false"} aria-hidden>
      <div className="land-loader-panel land-loader-panel-a" />
      <div className="land-loader-panel land-loader-panel-b" />
      <div className="land-loader-body">
        <div className="land-loader-top">
          <span>SHULE ALTRA</span>
          <span>INSTITUTIONAL OS</span>
        </div>
        <div className="land-loader-count">
          <span>{String(progress).padStart(3, "0")}</span>
          <em>%</em>
        </div>
        <div className="land-loader-foot">
          <span>Opening the register · Dar es Salaam</span>
          <span>2026</span>
        </div>
        <div className="land-loader-bar">
          <i style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
      </div>
    </div>
  )
}
