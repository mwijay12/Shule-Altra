"use client"

/**
 * @fileOverview Public landing page — "one school day, on the timetable".
 *
 * The concept owns the page: scroll progress is the school clock (06:40 →
 * 16:40), each section is a period, and the red pen rule at the top fills as the
 * day is worked through. Everything else — the paper's daylight, the bell
 * marquee, the photographs — derives from that one variable.
 */

import * as React from "react"
import Link from "next/link"
import { DisplayLines, Reveal, useCountUp } from "@/components/landing/reveal"
import { LandingLoader } from "@/components/landing/landing-loader"
import { LandNav } from "@/components/landing/nav"
import { NAV_LINKS } from "@/components/landing/links"
import { BrandMark } from "@/components/brand/logo"
import { MotionProvider, MotionToggle, useLandingMotion } from "@/components/landing/motion"
import { SchoolClock } from "@/components/landing/clock"
import { Marquee } from "@/components/landing/marquee"
import { Hero } from "@/components/landing/hero"
import { Timetable } from "@/components/landing/timetable"
import { DayStory } from "@/components/landing/day-story"
import { DocCards } from "@/components/landing/doc-cards"
import { SchoolLife } from "@/components/landing/school-life"
import { Interlude } from "@/components/landing/interlude"
import { LandingContentProvider, useLandingContent } from "@/components/landing/content-provider"
import {
  Banknote,
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react"

const BELL = [
  "EVERY REGISTER",
  "EVERY SHILLING",
  "ON RECORD",
  "PDPA 2022",
  "NECTA MATRICES",
  "VECTOR DOCUMENTS",
]

function Stat({
  target,
  suffix,
  label,
  note,
  icon,
  format,
}: {
  target: number
  suffix?: string
  label: string
  note: string
  icon: React.ReactNode
  format?: (n: number) => string
}) {
  const { ref, value } = useCountUp(target)
  const text = format ? format(value) : Math.round(value).toLocaleString("en-US")
  return (
    <div className="sd-stat">
      <span className="sd-stat-icon" aria-hidden>
        {icon}
      </span>
      <span className="sd-stat-value" ref={ref}>
        {text}
        {suffix ? <em>{suffix}</em> : null}
      </span>
      <span className="sd-stat-label">{label}</span>
      <span className="sd-stat-note">{note}</span>
    </div>
  )
}

function Closing() {
  const ref = React.useRef<HTMLElement | null>(null)
  const { on } = useLandingMotion()
  const content = useLandingContent()

  React.useEffect(() => {
    const node = ref.current
    if (!node || !on) return
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      node.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`)
      node.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`)
    }
    node.addEventListener("pointermove", onMove)
    return () => node.removeEventListener("pointermove", onMove)
  }, [on])

  return (
    <section className="sd-close" id="compliance" ref={ref} data-period="16:05 · The gate">
      <span className="sd-close-spot" aria-hidden />
      <div className="sd-close-inner">
        <Reveal>
          <span className="sd-label sd-label-light">16:05 — the gate</span>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="sd-close-title">
            {content.sections.compliance.title}
            <br />
            <em className="sd-serif">{content.sections.compliance.accent}</em> by design.
          </h2>
        </Reveal>

        <div className="sd-close-facts">
          {[
            ["PDPA 2022", "Data Protection Act alignment, role-scoped access, no learner record outside the school's own store."],
            ["NECTA", "CSEE matrices, divisions, grade points and class position for Form 1–4 — computed, not retyped."],
            ["Accountability", "Every payment records who captured it and when, and each screen and document opens only for the roles allowed to see it."],
          ].map(([title, body], index) => (
            <Reveal key={title} delay={120 + index * 70} mask={false}>
              <div className="sd-fact">
                <span className="sd-fact-title">{title}</span>
                <span className="sd-fact-body">{body}</span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={300}>
          <div className="sd-close-actions">
            <Link href="/login?demo=1" className="sd-cta sd-cta-inverse">
              <span className="sd-cta-fill" aria-hidden />
              <span className="sd-cta-label">
                Open the demo school <span aria-hidden>↗</span>
              </span>
            </Link>
            <span className="sd-close-note">
              admin@shule.pro · demo2026 · no sign-up
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  const content = useLandingContent()
  return (
    <footer className="sd-footer">
      <Marquee
        items={["SHULE ALTRA", "O-LEVEL · FORM 1–4", "DAR ES SALAAM", "2026"]}
        separator="·"
        speed={52}
        className="sd-wordmark"
      />

      <div className="sd-footer-grid">
        <div className="sd-footer-col">
          <span className="sd-label">The product</span>
          <p>
            {content.footer.product}
          </p>
        </div>
        <div className="sd-footer-col">
          <span className="sd-label">Walk through it</span>
          <nav aria-label="Footer">
            {NAV_LINKS.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <Link href="/dashboard/help">Support</Link>
          </nav>
        </div>
        <div className="sd-footer-col">
          <span className="sd-label">Demo credentials</span>
          <p className="sd-footer-mono">
            admin@shule.pro
            <br />
            teacher@shule.pro
            <br />
            bursar@shule.pro
            <br />
            <b>demo2026</b>
          </p>
        </div>
        <div className="sd-footer-col">
          <span className="sd-label">Where</span>
          <p className="sd-footer-mono">
            {content.footer.location.split("\n").map((line, index) => (
              <React.Fragment key={line}>{index > 0 ? <br /> : null}{line}</React.Fragment>
            ))}
          </p>
        </div>
      </div>

      <div className="sd-footer-base">
        <span>© 2026 Shule Altra · V3.26</span>
        <span>PDPA 2022 · NECTA · ClickPesa</span>
        <span>Every document generated, none photographed</span>
      </div>
    </footer>
  )
}

function Landing() {
  const [ready, setReady] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)
  const { on } = useLandingMotion()
  const content = useLandingContent()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  React.useEffect(() => {
    document.body.dataset.landing = "true"
    return () => {
      delete document.body.dataset.landing
    }
  }, [])

  return (
    <div className="landing" data-motion={on ? "on" : "off"} data-font={content.font}>
      {!ready && <LandingLoader onDone={() => setReady(true)} />}

      <a className="sd-skip uh" href="#main">
        Skip to content
      </a>

      <SchoolClock />

      <header className="sd-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="sd-header-inner">
          <Link href="/" className="sd-brand" aria-label="Shule Altra — home">
            <BrandMark size={34} radius={10} />
            <span className="sd-brand-text">
              Shule Altra
              <em>{content.brandTagline}</em>
            </span>
          </Link>

          <LandNav />

          <div className="sd-header-actions">
            <MotionToggle />
            <Link href="/login?demo=1" className="sd-cta sd-cta-small">
              <span className="sd-cta-fill" aria-hidden />
              <span className="sd-cta-label">
                Live demo <span aria-hidden>↗</span>
              </span>
            </Link>
            <button
              type="button"
              className="sd-burger"
              aria-expanded={menuOpen}
              aria-controls="sd-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>{menuOpen ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>
      </header>

      <div id="sd-mobile-menu" className="sd-mobile" data-open={menuOpen ? "true" : "false"}>
        <nav aria-label="Mobile">
          {NAV_LINKS.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{ transitionDelay: `${index * 40}ms` }}
            >
              <span>{item.label}</span>
              <em>0{index + 1}</em>
            </a>
          ))}
          <Link href="/login?demo=1" onClick={() => setMenuOpen(false)}>
            <span>Open the live demo</span>
            <em>↗</em>
          </Link>
        </nav>
        <p className="sd-mobile-foot">Dar es Salaam · 06°48′S 39°17′E</p>
      </div>

      <main id="main">
        <Hero ready={ready} />

        <div id="bell" className="sd-bell" aria-hidden>
          <Marquee items={BELL} speed={86} className="sd-bell-a" />
          <Marquee items={BELL} speed={62} reverse className="sd-bell-b" />
        </div>

        <section className="sd-register" data-period="07:40 · Registration">
          <header className="sd-head">
            <Reveal>
              <span className="sd-label">07:40 — registration</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="sd-h2">
                {content.sections.register.title} <em className="sd-serif">{content.sections.register.accent}</em>.
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="sd-note">
                {content.sections.register.note}
              </p>
            </Reveal>
          </header>

          <div className="sd-stats">
            {content.stats.map((stat, index) => (
              <Stat
                key={stat.label}
                target={stat.target}
                suffix={stat.suffix}
                label={stat.label}
                note={stat.note}
                icon={[
                  <Users key="users" className="h-4 w-4" strokeWidth={1.7} />,
                  <GraduationCap key="grad" className="h-4 w-4" strokeWidth={1.7} />,
                  <CalendarCheck key="cal" className="h-4 w-4" strokeWidth={1.7} />,
                  <Banknote key="bank" className="h-4 w-4" strokeWidth={1.7} />,
                ][index]}
                format={
                  stat.format === 'decimal'
                    ? (n) => n.toFixed(1)
                    : stat.format === 'millions'
                      ? (n) => `${(n / 1_000_000).toFixed(1)}M`
                      : undefined
                }
              />
            ))}
          </div>
        </section>

        <section className="sd-section" id="timetable" data-period="09:10 · Period two">
          <header className="sd-head">
            <Reveal>
              <span className="sd-label">09:10 — period two</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="sd-h2">
                {content.sections.timetable.title} <em className="sd-serif">{content.sections.timetable.accent}</em>.
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="sd-note">
                {content.sections.timetable.note}
              </p>
            </Reveal>
          </header>
          <Timetable />
        </section>

        <section className="sd-section sd-section-day" id="day" data-period="11:20 · Period four">
          <header className="sd-head">
            <Reveal>
              <span className="sd-label">11:20 — period four</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="sd-h2">
                {content.sections.day.title} <em className="sd-serif">{content.sections.day.accent}</em>.
              </h2>
            </Reveal>
          </header>
          <DayStory />
        </section>

        <section className="sd-section" id="documents" data-period="14:00 · Period six">
          <header className="sd-head">
            <Reveal>
              <span className="sd-label">14:00 — period six</span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="sd-h2">
                {content.sections.documents.title} <em className="sd-serif">{content.sections.documents.accent}</em>.
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="sd-note">
                {content.sections.documents.note}
              </p>
            </Reveal>
          </header>
          <DocCards />
        </section>

        <SchoolLife />

        <Interlude />

        <Closing />
      </main>

      <Footer />
    </div>
  )
}

export default function LandingPage() {
  return (
    <MotionProvider>
      <LandingContentProvider>
        <Landing />
      </LandingContentProvider>
    </MotionProvider>
  )
}
