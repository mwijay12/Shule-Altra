"use client"

/**
 * @fileOverview Period five — the place itself.
 *
 * A school does not buy software because of a dashboard; it buys because the
 * library is the room its learners actually sit in. This band is the only part
 * of the page that is photography rather than type, and every tile names the
 * module that keeps that room honest: the laboratory keeps the marks, the
 * dormitory keeps the boarding roll, the kitchen keeps the canteen ledger.
 *
 * Photographs are static assets in `public/media`, so they cost one request each
 * and never depend on a third-party CDN being reachable from Dar es Salaam.
 */

import Image from "next/image"
import { Reveal } from "./reveal"

type Facility = {
  src: string
  name: string
  note: string
  module: string
  /** wider tile in the grid, so the row does not read as a contact sheet */
  wide?: boolean
}

const PEOPLE = [
  {
    src: "/media/students/learners-senior.jpg",
    alt: "Two senior learners with backpacks",
    name: "Form 3 · the science stream",
    note: "Every learner on the register has a row, a guardian and a balance.",
  },
  {
    src: "/media/students/learners-junior.jpg",
    alt: "Two junior learners in school uniform",
    name: "Form 1 · the new intake",
    note: "Enrolled in ninety seconds — photo, guardian, class, house.",
  },
  {
    src: "/media/students/learner-portrait.jpg",
    alt: "A learner holding textbooks",
    name: "Term 2 · mid-morning",
    note: "The same record prints the ID card, the report card and the receipt.",
  },
]

const FACILITIES: Facility[] = [
  {
    src: "/media/campus/library.jpg",
    name: "The library",
    note: "Reading room, two shifts a day.",
    module: "Assets · catalogue",
    wide: true,
  },
  {
    src: "/media/campus/science-lab.jpg",
    name: "Chemistry laboratory",
    note: "Practical marks land in the same matrix as the theory paper.",
    module: "Academics · NECTA matrix",
  },
  {
    src: "/media/campus/computer-lab.jpg",
    name: "Computer laboratory",
    note: "Where the marks spreadsheet is typed, usually at 21:00.",
    module: "Academics · Excel import",
  },
  {
    src: "/media/campus/dormitory.jpg",
    name: "Boarding wing",
    note: "Beds, lockers and the evening roll, by house.",
    module: "Boarding · hostel roll",
  },
  {
    src: "/media/campus/dining-hall.jpg",
    name: "Dining hall",
    note: "Meal counts come from the same register as the fees.",
    module: "Canteen · daily ledger",
  },
  {
    src: "/media/campus/playing-field.jpg",
    name: "The field",
    note: "Inter-house sport, and the only timetable that never slips.",
    module: "Students · conduct",
    wide: true,
  },
]

export function SchoolLife() {
  return (
    <section className="sd-section" id="campus" data-period="12:40 · Lunch">
      <header className="sd-head">
        <Reveal>
          <span className="sd-label">12:40 — lunch</span>
        </Reveal>
        <Reveal delay={70}>
          <h2 className="sd-h2">
            The rooms the record <em className="sd-serif">comes from</em>.
          </h2>
        </Reveal>
        <Reveal delay={130}>
          <p className="sd-note">
            Six rooms and three faces. Nothing here is a stock photograph of somebody else’s
            school — the rooms are the ones a Tanzanian secondary school actually runs, and each
            one has a module that keeps it accountable.
          </p>
        </Reveal>
      </header>

      <div className="sd-life">
        <div className="sd-life-people">
          {PEOPLE.map((person, index) => (
            <Reveal key={person.src} delay={index * 80} className="sd-life-person">
              <div className="sd-life-frame">
                <Image
                  src={person.src}
                  alt={person.alt}
                  fill
                  sizes="(max-width: 860px) 90vw, 30vw"
                  className="sd-life-img"
                  priority={false}
                />
              </div>
              <p className="sd-life-name">{person.name}</p>
              <p className="sd-life-note">{person.note}</p>
            </Reveal>
          ))}
        </div>

        <div className="sd-life-grid">
          {FACILITIES.map((facility, index) => (
            <Reveal
              key={facility.src}
              delay={index * 60}
              className={facility.wide ? "sd-tile sd-tile-wide" : "sd-tile"}
            >
              <div className="sd-tile-frame">
                <Image
                  src={facility.src}
                  alt={facility.name}
                  fill
                  sizes="(max-width: 860px) 92vw, (max-width: 1200px) 45vw, 30vw"
                  className="sd-life-img"
                />
                <span className="sd-tile-module">{facility.module}</span>
              </div>
              <div className="sd-tile-copy">
                <p className="sd-tile-name">{facility.name}</p>
                <p className="sd-tile-note">{facility.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
