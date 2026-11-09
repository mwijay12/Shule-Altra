"use client"

/**
 * @fileOverview 06:50, before the bell.
 *
 * One photograph, one sentence, one number the visitor can act on. The type
 * arrives line by line from behind a mask; the photograph un-crops itself and
 * then drifts at a different rate than the page, which is the only parallax on
 * the site and the reason the hero reads as a window rather than a banner.
 */

import * as React from "react"
import { LandingImage as Image } from "./image"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { DisplayLines } from "@/components/landing/reveal"
import { useLandingMotion } from "./motion"
import { useLandingContent } from "./content-provider"

export function Hero({ ready }: { ready: boolean }) {
  const { on } = useLandingMotion()
  const content = useLandingContent()
  const sectionRef = React.useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const still = !on
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", still ? "0%" : "14%"])
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", still ? "0%" : "-6%"])
  const frameScale = useTransform(scrollYProgress, [0, 1], [1, still ? 1 : 1.06])

  return (
    <section
      className="sd-hero"
      ref={sectionRef}
      data-ready={ready ? "true" : "false"}
      data-period="06:50 · Before the bell"
    >
      <div className="sd-hero-wash" aria-hidden />

      <div className="sd-hero-inner">
        <motion.div className="sd-hero-copy" style={{ y: copyY }}>
          <div className="sd-kicker">
            <span className="sd-kicker-dot" aria-hidden />
            {content.hero.kicker}
          </div>

          <h1 className="sd-hero-title">
            <DisplayLines
              active={ready}
              stagger={110}
              lines={[
                <span key="1">{content.hero.titleLines[0]}</span>,
                <span key="2">{content.hero.titleLines[1]}</span>,
                <span key="3" className="sd-serif">
                  {content.hero.titleLines[2]}
                </span>,
              ]}
            />
          </h1>

          <p className="sd-hero-lede">
            {content.hero.lede}
          </p>

          <div className="sd-hero-actions">
            <Link href="/login?demo=1" className="sd-cta">
              <span className="sd-cta-fill" aria-hidden />
              <span className="sd-cta-label">
                {content.hero.primaryCta} <span aria-hidden>↗</span>
              </span>
            </Link>
            <a href="#timetable" className="sd-ghost">
              <span>{content.hero.secondaryCta}</span>
              <span className="sd-ghost-rule" aria-hidden />
            </a>
          </div>

          <ul className="sd-hero-facts">
            <li>
              <b>{Math.round(content.stats[0]?.target ?? 150).toLocaleString('en-US')}</b>
              <span>learners on one register</span>
            </li>
            <li>
              <b>10</b>
              <span>documents, generated not photographed</span>
            </li>
            <li>
              <b>PDPA</b>
              <span>2022 alignment, role-scoped</span>
            </li>
          </ul>
        </motion.div>

        <motion.figure className="sd-hero-media" style={{ y: mediaY }}>
          <motion.div className="sd-hero-frame" style={{ scale: frameScale }}>
            <Image
              src={content.images.heroClassroom.src}
              alt={content.images.heroClassroom.alt}
              fill
              priority
              sizes="(max-width: 980px) 94vw, 46vw"
            />
            <span className="sd-hero-frame-edge" aria-hidden />
          </motion.div>

          <figcaption className="sd-hero-tag">
            <span className="sd-hero-tag-time">07:40</span>
            <span className="sd-hero-tag-body">
              <b>{content.hero.captionTitle}</b>
              <i>{content.hero.captionNote}</i>
            </span>
            <span className="sd-hero-tag-tick" aria-hidden />
          </figcaption>

          <span className="sd-hero-stamp" aria-hidden>
            <em>Dar es Salaam</em>
            <b>06°48′S 39°17′E</b>
          </span>
        </motion.figure>
      </div>

      <div className="sd-hero-base">
        <a className="sd-cue" href="#bell">
          <span className="sd-cue-line" aria-hidden />
          <span>Scroll — the bell rings at 07:40</span>
        </a>
        <span className="sd-hero-meta">Institutional record · school-001 · 2026</span>
      </div>
    </section>
  )
}
