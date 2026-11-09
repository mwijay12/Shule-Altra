"use client"

/**
 * @fileOverview The bell strip, an infinite marquee that actually moves.
 *
 * Driven by rAF (not a CSS animation) so scroll velocity can push it: faster
 * down the page, slower up it, never a visible seam and never a restart jump.
 * One shared copy width, three copies in the DOM, wrap at exactly one copy.
 */

import * as React from "react"
import { useLandingMotion } from "./motion"

type MarqueeProps = {
  items: string[]
  /** px per second at rest */
  speed?: number
  reverse?: boolean
  className?: string
  separator?: string
}

export function Marquee({
  items,
  speed = 90,
  reverse = false,
  className = "",
  separator = "◆",
}: MarqueeProps) {
  const { on } = useLandingMotion()
  const trackRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const copy = track.querySelector<HTMLElement>("[data-marquee-copy]")
    if (!copy) return

    let width = copy.offsetWidth || 1
    let x = 0
    let raf = 0
    let last = performance.now()
    let velocity = 0
    let visible = true
    let lastScrollY = window.scrollY
    let scrollBoost = 0

    const measure = () => {
      width = copy.offsetWidth || 1
      if (x <= -width) x += width
    }

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    resizeObserver?.observe(copy)

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries.some((entry) => entry.isIntersecting)
            },
            { rootMargin: "200px 0px" }
          )
        : null
    io?.observe(track)

    const onScroll = () => {
      const now = window.scrollY
      const delta = now - lastScrollY
      lastScrollY = now
      // Scroll speed feeds a temporary boost that decays every frame.
      scrollBoost = Math.min(2.4, scrollBoost + Math.abs(delta) * 0.012)
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const tick = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      scrollBoost *= 0.94
      velocity += ((on && visible ? 1 : 0) - velocity) * 0.08

      if (velocity > 0.001) {
        const direction = reverse ? 1 : -1
        x += direction * (speed * (1 + scrollBoost) * dt) / 1000 * velocity
        if (x <= -width) x += width
        if (x > 0) x -= width
        track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      resizeObserver?.disconnect()
      io?.disconnect()
    }
  }, [on, reverse, speed])

  return (
    <div className={`sd-marquee ${className}`} aria-hidden>
      <div className="sd-marquee-track" ref={trackRef}>
        {[0, 1, 2].map((copy) => (
          <div className="sd-marquee-copy" data-marquee-copy key={copy}>
            {items.map((item, i) => (
              <span className="sd-marquee-item" key={`${copy}-${item}-${i}`}>
                {item}
                <i aria-hidden>{separator}</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
