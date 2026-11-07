"use client"

/**
 * @fileOverview 06:50 — before the bell.
 *
 * One photograph, one sentence, one number the visitor can act on. The type
 * arrives line by line from behind a mask; the photograph un-crops itself and
 * then drifts at a different rate than the page, which is the only parallax on
 * the site and the reason the hero reads as a window rather than a banner.
 */

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion"
import { DisplayLines } from "@/components/landing/reveal"
import { useLandingMotion } from "./motion"

export function Hero({ ready }: { ready: boolean }) {
  const { on } = useLandingMotion()
  const systemReduced = useReducedMotion()
  const sectionRef = React.useRef<HTMLElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const still = !on || systemReduced
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
            Tanzania · secondary schools
          </div>

          <h1 className="sd-hero-title">
            <DisplayLines
              active={ready}
              stagger={110}
              lines={[
                <span key="1">One school day.</span>,
                <span key="2">Every register,</span>,
                <span key="3" className="sd-serif">
                  every shilling.
                </span>,
              ]}
            />
          </h1>

          <p className="sd-hero-lede">
            Shule Altra is the institutional operating system for Tanzanian secondary
            schools. Learners, fees, NECTA matrices, attendance and the paper a school
            actually signs — kept on one timetable.
          </p>

          <div className="sd-hero-actions">
            <Link href="/login?demo=1" className="sd-cta">
              <span className="sd-cta-fill" aria-hidden />
              <span className="sd-cta-label">
                Enter the demo school <span aria-hidden>↗</span>
              </span>
            </Link>
            <a href="#timetable" className="sd-ghost">
              <span>Read the timetable</span>
              <span className="sd-ghost-rule" aria-hidden />
            </a>
          </div>

          <ul className="sd-hero-facts">
            <li>
              <b>150</b>
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
              src="/landing/hero-classroom.jpg"
              alt="Four learners writing at their desks during morning lessons at a Dar es Salaam secondary school"
              fill
              priority
              sizes="(max-width: 980px) 94vw, 46vw"
            />
            <span className="sd-hero-frame-edge" aria-hidden />
          </motion.div>

          <figcaption className="sd-hero-tag">
            <span className="sd-hero-tag-time">07:40</span>
            <span className="sd-hero-tag-body">
              <b>Form 2 · Alpha</b>
              <i>38 learners · register closed</i>
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
