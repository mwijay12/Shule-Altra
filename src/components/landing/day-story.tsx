"use client"

/**
 * @fileOverview Period three, the day itself.
 *
 * A sticky photographic stage on the left, three moments of one school day on
 * the right. As each moment crosses the middle of the viewport the photograph
 * changes and the red pen line advances, so scrolling feels like turning a page
 * of the register rather than moving through a stack of sections.
 */

import * as React from "react"
import { LandingImage as Image } from "./image"
import { useLandingContent } from "./content-provider"

type Beat = {
  time: string
  label: string
  title: string
  body: string
  detail: string[]
  image: string
  alt: string
}

const BEATS: Beat[] = [
  {
    time: "07:40",
    label: "Registration",
    title: "The register is taken once, and it holds.",
    body:
      "Form masters mark the morning register on a phone or at the office machine. Absence streaks, boarding status and the parent contact all attach to the same learner record — no second list, no afternoon reconciliation.",
    detail: ["900 entries this term", "90.1% presence", "Absence streak flagged for follow-up"],
    image: "/landing/hero-classroom.jpg",
    alt: "Students writing at their desks in the morning",
  },
  {
    time: "11:20",
    label: "Period four",
    title: "Marks land in the matrix, not in a drawer.",
    body:
      "A teacher enters a score once. It becomes a grade point, a subject average, a class position and a division on the NECTA matrix — the same number, read four ways, all of it printable the moment the head asks.",
    detail: ["2,932 scores this term", "CSEE matrices · Form 1–4", "Division I–IV with class rank"],
    image: "/landing/paper-stack.jpg",
    alt: "Marked papers stacked on a green wooden desk",
  },
  {
    time: "16:05",
    label: "Closing",
    title: "The day closes with the books already balanced.",
    body:
      "Every payment that came in — ClickPesa, Beem, bank, cash desk — is matched to a learner and written to the ledger before the gate closes. The fee statement the bursar prints at 16:05 is the one the parent receives.",
    detail: ["140 movements reconciled", "TZS 61.0M collected", "Control number per learner"],
    image: "/landing/hands-ledger.jpg",
    alt: "A bursar writing entries in the fee ledger",
  },
]

export function DayStory() {
  const content = useLandingContent()
  const beats = BEATS.map((beat) => {
    const slot = ({
      "/landing/hero-classroom.jpg": "heroClassroom",
      "/landing/paper-stack.jpg": "paperStack",
      "/landing/hands-ledger.jpg": "handsLedger",
    } as const)[beat.image as "/landing/hero-classroom.jpg"]
    const image = slot ? content.images[slot] : undefined
    return image ? { ...beat, image: image.src, alt: image.alt } : beat
  })
  const [active, setActive] = React.useState(0)
  const stepRefs = React.useRef<Array<HTMLLIElement | null>>([])

  React.useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLLIElement[]
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          const index = nodes.indexOf(entry.target as HTMLLIElement)
          if (index >= 0) setActive(index)
        })
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    )
    nodes.forEach((node) => io.observe(node))
    return () => io.disconnect()
  }, [])

  return (
    <div className="sd-story">
      <div className="sd-story-stage">
        <div className="sd-story-frames">
          {beats.map((beat, index) => (
            <figure
              key={beat.image + index}
              className="sd-story-frame"
              data-on={index === active ? "true" : "false"}
              aria-hidden={index !== active}
            >
              <Image
                src={beat.image}
                alt={index === active ? beat.alt : ""}
                fill
                sizes="(max-width: 900px) 92vw, 42vw"
                priority={index === 0}
              />
            </figure>
          ))}
        </div>

        <div className="sd-story-caption">
          <span className="sd-story-caption-time">{beats[active].time}</span>
          <span className="sd-story-caption-label">{beats[active].label}</span>
        </div>

        <div className="sd-story-ticks" aria-hidden>
          {beats.map((beat, index) => (
            <i key={beat.time} data-on={index === active ? "true" : "false"} />
          ))}
        </div>
      </div>

      <ol className="sd-story-steps">
        {beats.map((beat, index) => (
          <li
            key={beat.time}
            ref={(node) => {
              stepRefs.current[index] = node
            }}
            className="sd-step"
            data-on={index === active ? "true" : "false"}
          >
            <span className="sd-step-head">
              <span className="sd-step-time">{beat.time}</span>
              <span className="sd-step-label">{beat.label}</span>
            </span>
            <h3 className="sd-step-title">{beat.title}</h3>
            <p className="sd-step-body">{beat.body}</p>
            <ul className="sd-step-detail">
              {beat.detail.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
