"use client"

/**
 * @fileOverview Landing-page motion primitives.
 *
 * Motion verb for the public site is **settle**: every element wipes up from a
 * clipped line and locks onto the grid with one expo-out curve (0.9s). No
 * scattered effects, no scroll-jacking — one system, reused everywhere.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function prefersReducedMotion() {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
}

/** Reveal on first intersection. `mask` wipes from a clipped line, `fade` is a plain lift. */
export function Reveal({
  children,
  className,
  as: Tag = "div",
  delay = 0,
  mask = true,
  once = true,
}: {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  delay?: number
  mask?: boolean
  once?: boolean
}) {
  const ref = React.useRef<any>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    if (prefersReducedMotion()) {
      setShown(true)
      return
    }
    if (typeof IntersectionObserver === "undefined") {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true)
            if (once) io.disconnect()
          } else if (!once) {
            setShown(false)
          }
        })
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [once])

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "true" : "false"}
      data-mask={mask ? "true" : "false"}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(mask ? "land-mask" : "land-fade", className)}
    >
      {children}
    </Tag>
  )
}

/** Splits display copy into clipped lines that settle one after another. */
export function DisplayLines({
  lines,
  className,
  lineClassName,
  active = true,
  stagger = 90,
}: {
  lines: React.ReactNode[]
  className?: string
  lineClassName?: string
  active?: boolean
  stagger?: number
}) {
  return (
    <span className={cn("land-display", className)}>
      {lines.map((line, i) => (
        <span key={i} className="land-line-clip">
          <span
            className={cn("land-line", lineClassName)}
            data-shown={active ? "true" : "false"}
            style={{ transitionDelay: `${i * stagger}ms` }}
          >
            {line}
          </span>
        </span>
      ))}
    </span>
  )
}

/** Counts to a target once the node scrolls into view. Tabular figures, no layout shift. */
export function useCountUp(target: number, duration = 1100) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = React.useState(0)
  const started = React.useRef(false)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setValue(target)
      return
    }
    const run = () => {
      if (started.current) return
      started.current = true
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - p, 3)
        setValue(target * eased)
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && run()),
      { threshold: 0.4 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [target, duration])

  return { ref, value }
}

export function pad(n: number, width = 2) {
  return String(Math.round(n)).padStart(width, "0")
}

export function tzs(n: number) {
  return `TZS ${Math.round(n).toLocaleString("en-US")}`
}
