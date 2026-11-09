"use client"

/**
 * @fileOverview The index, set as a timetable.
 *
 * The concept is "one school day, on the timetable", so the module list is not
 * a list: it is a period sheet. Times run down the left in mono, the current row
 * is marked with a red pen rule, and on a fine pointer the row pulls a photograph
 * that follows the cursor — the one place imagery is allowed to interrupt.
 */

import * as React from "react"
import Link from "next/link"
import { LandingImage as Image } from "./image"
import { mediaMatches, useLandingMotion } from "./motion"
import { useLandingContent } from "./content-provider"

type Period = {
  time: string
  end: string
  title: string
  meta: string
  stat: string
  statLabel: string
  href: string
  image: string
  alt: string
}

const PERIODS: Period[] = [
  {
    time: "07:40",
    end: "08:20",
    title: "Attendance",
    meta: "Daily register · absence streaks · boarding split",
    stat: "90.1%",
    statLabel: "presence, all streams",
    href: "/dashboard/attendance",
    image: "/landing/teacher-portrait.jpg",
    alt: "A teacher holding the morning's marked papers in the corridor",
  },
  {
    time: "08:20",
    end: "09:40",
    title: "Academics",
    meta: "NECTA matrices · divisions · class position",
    stat: "2,932",
    statLabel: "scores on record",
    href: "/dashboard/academics",
    image: "/landing/paper-stack.jpg",
    alt: "Marked papers and chalk on a green desk",
  },
  {
    time: "09:40",
    end: "11:00",
    title: "Finance",
    meta: "ClickPesa · Beem · bank · petty cash",
    stat: "TZS 61.0M",
    statLabel: "reconciled this term",
    href: "/dashboard/finance",
    image: "/landing/hands-ledger.jpg",
    alt: "Hands writing a payment into the fee ledger",
  },
  {
    time: "11:20",
    end: "12:40",
    title: "Timetable",
    meta: "5 days · 8 periods · 10 subjects",
    stat: "40",
    statLabel: "periods per class",
    href: "/dashboard/timetable",
    image: "/landing/school-facade.jpg",
    alt: "The school's arched veranda in morning light",
  },
  {
    time: "14:00",
    end: "15:20",
    title: "Documents",
    meta: "Vector PDF · DOCX · no screenshots",
    stat: "10",
    statLabel: "report types generated",
    href: "/dashboard/reports",
    image: "/landing/paper-stack.jpg",
    alt: "Stack of printed reports ready for signature",
  },
  {
    time: "16:05",
    end: "16:30",
    title: "Compliance",
    meta: "PDPA 2022 · role scopes · records",
    stat: "4",
    statLabel: "role scopes enforced",
    href: "/dashboard/settings",
    image: "/landing/school-facade.jpg",
    alt: "The school's arched veranda in the afternoon light",
  },
]

export function Timetable({ periods = PERIODS }: { periods?: Period[] }) {
  const { on } = useLandingMotion()
  const content = useLandingContent()
  const imageFor = (src: string) => {
    const slot = ({
      "/landing/teacher-portrait.jpg": "teacherPortrait",
      "/landing/paper-stack.jpg": "paperStack",
      "/landing/hands-ledger.jpg": "handsLedger",
      "/landing/school-facade.jpg": "schoolFacade",
    } as const)[src as "/landing/teacher-portrait.jpg"]
    return slot ? content.images[slot] : undefined
  }
  const rows = periods.map((period) => {
    const image = imageFor(period.image)
    return image ? { ...period, image: image.src, alt: image.alt } : period
  })
  const [active, setActive] = React.useState<number | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const previewRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!on) return
    const list = listRef.current
    const preview = previewRef.current
    if (!list || !preview) return
    if (!mediaMatches("(pointer: fine)")) return

    let x = 0
    let y = 0
    let tx = 0
    let ty = 0
    let raf = 0

    const onMove = (event: PointerEvent) => {
      const rect = list.getBoundingClientRect()
      tx = event.clientX - rect.left
      ty = event.clientY - rect.top
    }
    const tick = () => {
      x += (tx - x) * 0.16
      y += (ty - y) * 0.16
      preview.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(tick)
    }
    list.addEventListener("pointermove", onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      list.removeEventListener("pointermove", onMove)
      cancelAnimationFrame(raf)
    }
  }, [on])

  return (
    <div className="sd-table" ref={listRef}>
      <div className="sd-table-head" aria-hidden>
        <span>Time</span>
        <span>Period</span>
        <span>What it keeps</span>
        <span>Today</span>
      </div>

      <div className="sd-table-rows" onPointerLeave={() => setActive(null)}>
        {rows.map((period, index) => (
          <Link
            key={period.time}
            href={period.href}
            className="sd-row"
            data-active={active === index ? "true" : "false"}
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            aria-label={`${period.title} — ${period.stat} ${period.statLabel}`}
          >
            <span className="sd-row-time">
              <b>{period.time}</b>
              <i>{period.end}</i>
            </span>
            <span className="sd-row-title">
              <span className="sd-row-index">0{index + 1}</span>
              {period.title}
            </span>
            <span className="sd-row-meta">{period.meta}</span>
            <span className="sd-row-stat">
              {period.stat}
              <i>{period.statLabel}</i>
            </span>
            <span className="sd-row-arrow" aria-hidden>
              ↗
            </span>
            <span className="sd-row-pen" aria-hidden />
            <span className="sd-row-thumb" aria-hidden>
              <Image src={period.image} alt="" fill sizes="120px" />
            </span>
          </Link>
        ))}
      </div>

      <div className="sd-table-preview" ref={previewRef} aria-hidden data-on={active !== null ? "true" : "false"}>
        {active !== null ? (
          <Image
            key={rows[active].image}
            src={rows[active].image}
            alt=""
            fill
            sizes="(max-width: 900px) 40vw, 320px"
            className="sd-table-preview-img"
          />
        ) : null}
        <span className="sd-table-preview-tag">
          {active !== null ? `${rows[active].time} — ${rows[active].title}` : ""}
        </span>
      </div>
    </div>
  )
}
