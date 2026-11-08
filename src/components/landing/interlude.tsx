"use client"

/**
 * @fileOverview 16:20 — the interlude.
 *
 * A full-bleed breath before the closing statement: the school itself, drifting
 * a little slower than the page. No copy competing with it — one line, one
 * location, one time.
 */

import * as React from "react"
import { LandingImage as Image } from "./image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useLandingMotion } from "./motion"
import { useLandingContent } from "./content-provider"

export function Interlude() {
  const ref = React.useRef<HTMLDivElement | null>(null)
  const { on } = useLandingMotion()
  const content = useLandingContent()
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
          src={content.images.schoolFacade.src}
          alt={content.images.schoolFacade.alt}
          fill
          sizes="100vw"
        />
      </motion.div>
      <span className="sd-interlude-veil" aria-hidden />
      <div className="sd-interlude-inner">
        <span className="sd-label sd-label-light">{content.interlude.label} · {content.schoolName}</span>
        <p className="sd-interlude-line">
          {content.interlude.line} <em className="sd-serif">{content.interlude.accent}</em>.
        </p>
        <span className="sd-interlude-meta">
          {content.interlude.meta}
        </span>
      </div>
    </div>
  )
}
