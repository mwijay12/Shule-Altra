"use client"

/**
 * @fileOverview Segmented navigation with a black pill that slides between
 * items, driven by scroll-spy, so the pill follows the reader down the page.
 * One pill, one `layoutId`, no per-item transitions.
 */

import * as React from "react"
import { motion } from "framer-motion"
import { NAV_LINKS } from "@/components/landing/links"

export function LandNav() {
  const [active, setActive] = React.useState<string | null>(null)
  const [hovered, setHovered] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const nodes = NAV_LINKS.map((item) => document.querySelector(item.href)).filter(
      (node): node is Element => Boolean(node)
    )
    if (nodes.length === 0) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
        else if (entries.every((entry) => !entry.isIntersecting) && window.scrollY < 240) setActive(null)
      },
      { rootMargin: "-42% 0px -42% 0px", threshold: [0, 0.2, 0.6] }
    )
    nodes.forEach((node) => io.observe(node))
    return () => io.disconnect()
  }, [])

  const highlighted = hovered ?? active

  return (
    <nav className="land-nav" aria-label="Primary">
      {NAV_LINKS.map((item) => {
        const isOn = highlighted === item.href
        return (
          <a
            key={item.href}
            href={item.href}
            className="land-nav-link"
            data-active={isOn ? "true" : "false"}
            aria-current={active === item.href ? "true" : undefined}
            onMouseEnter={() => setHovered(item.href)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(item.href)}
            onBlur={() => setHovered(null)}
          >
            {isOn && (
              <motion.span
                layoutId="land-nav-pill"
                className="land-nav-pill"
                transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.6 }}
              />
            )}
            <span>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
