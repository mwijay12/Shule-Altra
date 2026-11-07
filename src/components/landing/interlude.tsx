"use client"

/**
 * @fileOverview 16:20 — the interlude.
 *
 * A full-bleed breath before the closing statement: the school itself, drifting
 * a little slower than the page. No copy competing with it — one line, one
 * location, one time.
 */

import * as React from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useLandingMotion } from "./motion"

export function Interlude() {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const { on } = useLandingMotion()
  const still = !on

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  const y = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["-8%", "8%"])

  return (
    <div className="sd-interlude" ref={ref} data-period="16:20 · The ground">
      <motion.div className="sd-interlude-media" style={{ y }}>
        <Image
          src="/landing/school-facade.jpg"
          alt="The arched veranda and bougainvillea of a coastal Tanzanian secondary school"
          fill
          sizes="100vw"
        />
      </motion.div>
      <span className="sd-interlude-veil" aria-hidden />
      <div className="sd-interlude-inner">
        <span className="sd-label sd-label-light">16:20 — Mwanzo Secondary</span>
        <p className="sd-interlude-line">
          Built for the schools that keep <em className="sd-serif">Tanzania&rsquo;s records</em>.
        </p>
        <span className="sd-interlude-meta">
          Dar es Salaam · 06°48′S 39°17′E · 1,240 institutions in the region
        </span>
      </div>
    </div>
  )
}
