"use client"

/**
 * @fileOverview First-visit build: a mono counter that reports progress, then a
 * two-panel curtain that hands off to the hero.
 *
 * The counter is driven by one rAF loop that must never restart, so `onDone`
 * is held in a ref instead of the effect's dependency list, an unstable
 * callback used to re-run the effect every frame and leave the counter at 000%.
 * Skipped entirely when motion is off, and hard-capped at 1.8s.
 */

import * as React from "react"
import { motionEnabled } from "@/components/landing/reveal"
import { BrandMark } from "@/components/brand/logo"

export function LandingLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = React.useState(0)
  const [exiting, setExiting] = React.useState(false)
  const done = React.useRef(false)
  const onDoneRef = React.useRef(onDone)
  const finishRef = React.useRef<() => void>(() => {})

  React.useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const finish = React.useCallback(() => {
    if (done.current) return
    done.current = true
    setProgress(100)
    setExiting(true)
    window.setTimeout(() => onDoneRef.current(), 420)
  }, [])

  React.useEffect(() => {
    finishRef.current = finish
  }, [finish])

  React.useEffect(() => {
    if (!motionEnabled()) {
      onDoneRef.current()
      return
    }

    let raf = 0
    const start = performance.now()
    const duration = 950

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 2.2)
      setProgress(Math.round(eased * 100))
      if (p < 1) raf = requestAnimationFrame(tick)
      else finishRef.current()
    }

    raf = requestAnimationFrame(tick)
    const guard = window.setTimeout(() => finishRef.current(), 1800)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(guard)
    }
  }, [])

  return (
    <div className="land-loader" data-exiting={exiting ? "true" : "false"} aria-hidden>
      <div className="land-loader-panel land-loader-panel-a" />
      <div className="land-loader-panel land-loader-panel-b" />
      <div className="land-loader-body">
        <div className="land-loader-top">
          <span>SHULE ALTRA</span>
          <span>SCHOOL MANAGEMENT</span>
        </div>
        <div className="land-loader-mark">
          <BrandMark size={44} radius={13} />
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
