"use client"

/**
 * @fileOverview The page's single driver: the school day.
 *
 * Scroll progress becomes the clock (06:40 → 16:40). That one number sets the
 * paper's daylight (`--day`), the red pen rule at the top, and the period label
 * next to the time, so the whole page reads as one timetable being worked
 * through. Sections declare themselves with `data-period`.
 */

import * as React from "react"
import { useLandingMotion } from "./motion"

const START_MINUTES = 6 * 60 + 40
const END_MINUTES = 16 * 60 + 40

function formatClock(progress: number) {
  const minutes = Math.round(
    START_MINUTES + Math.min(1, Math.max(0, progress)) * (END_MINUTES - START_MINUTES)
  )
  const hh = Math.floor(minutes / 60)
  const mm = minutes % 60
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
}

export function SchoolClock() {
  const clockRef = React.useRef<HTMLSpanElement | null>(null)
  const periodRef = React.useRef<HTMLSpanElement | null>(null)
  const barRef = React.useRef<HTMLSpanElement | null>(null)
  const { systemReduced, hydrated, on, toggle } = useLandingMotion()
  const [hintOpen, setHintOpen] = React.useState(false)

  React.useEffect(() => {
    if (!hydrated) return
    if (systemReduced && !on) {
      try {
        const seen = window.sessionStorage.getItem("altra:motion-hint")
        if (!seen) {
          setHintOpen(true)
          window.sessionStorage.setItem("altra:motion-hint", "1")
        }
      } catch {
        setHintOpen(true)
      }
    }
  }, [hydrated, systemReduced, on])

  React.useEffect(() => {
    const clock = clockRef.current
    const period = periodRef.current
    const bar = barRef.current
    if (!clock || !period || !bar) return

    let frame = 0
    const update = () => {
      frame = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

      const label = formatClock(progress)
      if (clock.textContent !== label) clock.textContent = label
      bar.style.transform = `scaleX(${progress.toFixed(4)})`
      doc.style.setProperty("--day", progress.toFixed(4))

      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-period]")
      )
      let active: HTMLElement | null = null
      for (const section of sections) {
        const rect = section.getBoundingClientRect()
        if (rect.top <= window.innerHeight * 0.55) active = section
      }
      const next = active?.dataset.period ?? "Before the bell"
      if (period.textContent !== next) period.textContent = next

      // The clock is pinned to the bottom-left, which is exactly where the
      // footer's copyright and contact line sit. Park it once the footer comes
      // into view so it never covers the studio's phone number.
      const footer = document.querySelector("footer")
      const clockBox = clock.closest(".sd-clock") as HTMLElement | null
      if (footer && clockBox) {
        const covered = footer.getBoundingClientRect().top <= window.innerHeight - 56
        clockBox.classList.toggle("sd-clock--parked", covered)
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <span className="sd-pen" aria-hidden>
        <span className="sd-pen-fill" ref={barRef} />
      </span>

      <div className="sd-clock" aria-hidden>
        <span className="sd-clock-time" ref={clockRef}>
          06:40
        </span>
        <span className="sd-clock-period" ref={periodRef}>
          Before the bell
        </span>
      </div>

      {hintOpen ? (
        <div className="sd-toast" role="status">
          <span className="sd-toast-mark" aria-hidden />
          <p>
            <strong>Motion is paused.</strong> Your device asks for reduced motion, so the page
            is holding still. You can turn animation on.
          </p>
          <div className="sd-toast-actions">
            <button
              type="button"
              className="sd-toast-primary"
              onClick={() => {
                toggle()
                setHintOpen(false)
              }}
            >
              Enable motion
            </button>
            <button type="button" className="sd-toast-ghost" onClick={() => setHintOpen(false)}>
              Keep it still
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
