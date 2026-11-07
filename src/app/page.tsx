"use client"

/**
 * @fileOverview Public landing page.
 *
 * Direction: institutional paper, ink type, one bold field colour. The whole
 * page follows a single motion verb — *settle* — and carries exactly one
 * signature interaction (the registrar's index with its live preview), one
 * idle system (the ledger that keeps recording) and one contrasting voice
 * (an italic serif against a tight grotesk).
 */

import * as React from "react"
import Link from "next/link"
import { DisplayLines, Reveal, useCountUp } from "@/components/landing/reveal"
import { LandingLoader } from "@/components/landing/landing-loader"
import { LedgerPanel } from "@/components/landing/ledger-panel"
import { IndexList } from "@/components/landing/index-list"
import { DayNarrative } from "@/components/landing/day-narrative"

const NAV = [
  { label: "Index", href: "#index" },
  { label: "Method", href: "#method" },
  { label: "Documents", href: "#documents" },
  { label: "Compliance", href: "#compliance" },
]

const TICKER = [
  "EVERY REGISTER",
  "EVERY SHILLING",
  "ON RECORD",
  "PDPA 2022",
  "NECTA MATRICES",
  "VECTOR DOCUMENTS",
]

const DOCUMENTS = [
  {
    name: "Fee statement",
    meta: "Financial · per learner",
    stat: "4 pages",
    file: "/printables/reports/fee-ledger.pdf",
    note: "140 movements, running balance, verification status.",
  },
  {
    name: "Report card",
    meta: "Academic · NECTA",
    stat: "Division I–IV",
    file: "/printables/report-card.pdf",
    note: "Grade points, class position, teacher and head remarks.",
  },
  {
    name: "Timetable",
    meta: "Operations · A4 landscape",
    stat: "40 periods",
    file: "/printables/timetable.pdf",
    note: "Real subject weighting across five days, signed off.",
  },
  {
    name: "Master sheet",
    meta: "Academic · whole cohort",
    stat: "7 pages",
    file: "/printables/reports/master-sheet.pdf",
    note: "150 learners by subject code, totals and averages.",
  },
]

function StatCell({ target, suffix, label, format }: { target: number; suffix?: string; label: string; format?: (n: number) => string }) {
  const { ref, value } = useCountUp(target)
  const text = format ? format(value) : Math.round(value).toLocaleString("en-US")
  return (
    <div className="land-stat">
      <span className="land-stat-value" ref={ref}>
        {text}
        {suffix ? <em>{suffix}</em> : null}
      </span>
      <span className="land-label">{label}</span>
    </div>
  )
}

export default function LandingPage() {
  const [ready, setReady] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="landing">
      {!ready && <LandingLoader onDone={() => setReady(true)} />}

      <a className="land-skip uh" href="#main">
        Skip to content
      </a>

      <header className="land-header" data-scrolled={scrolled ? "true" : "false"}>
        <div className="land-header-inner">
          <Link href="/" className="land-brand" aria-label="Shule Altra — home">
            <span className="land-brand-mark" aria-hidden />
            <span className="land-brand-text">
              Shule Altra
              <em>Institutional OS · 2026</em>
            </span>
          </Link>

          <nav className="land-nav" aria-label="Primary">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="land-nav-link">
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          <div className="land-header-actions">
            <Link href="/login" className="land-link-quiet">
              Staff entry
            </Link>
            <Link href="/login?demo=1" className="land-cta land-cta-small">
              <span className="land-cta-fill" aria-hidden />
              <span className="land-cta-label">
                Live demo <span aria-hidden>↗</span>
              </span>
            </Link>
            <button
              type="button"
              className="land-burger"
              aria-expanded={menuOpen}
              aria-controls="land-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span>{menuOpen ? "Close" : "Menu"}</span>
            </button>
          </div>
        </div>
      </header>

      <div id="land-mobile-menu" className="land-mobile" data-open={menuOpen ? "true" : "false"}>
        <nav aria-label="Mobile">
          {NAV.map((item, i) => (
            <a key={item.href} href={item.href} onClick={closeMenu} style={{ transitionDelay: `${i * 40}ms` }}>
              <span>{item.label}</span>
              <em>0{i + 1}</em>
            </a>
          ))}
          <Link href="/login?demo=1" onClick={closeMenu}>
            <span>Open the live demo</span>
            <em>↗</em>
          </Link>
        </nav>
        <p className="land-mobile-foot">Dar es Salaam · 06°48′S 39°17′E</p>
      </div>

      <main id="main">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="land-hero">
          <div className="land-hero-meta">
            <span className="land-label">Tanzania · secondary schools</span>
            <span className="land-label land-hero-meta-right">Dar es Salaam · 06°48′S 39°17′E</span>
          </div>

          <h1 className="land-hero-title">
            <DisplayLines
              active={ready}
              stagger={110}
              lines={[
                <span key="1">Every register,</span>,
                <span key="2">every shilling,</span>,
                <span key="3" className="land-serif">
                  on record.
                </span>,
              ]}
            />
          </h1>

          <div className="land-hero-grid">
            <div className="land-hero-copy">
              <Reveal delay={260}>
                <p className="land-lede">
                  Shule Altra is the institutional operating system for Tanzanian secondary schools.
                  Learners, fees, NECTA matrices, attendance and the documents a school actually
                  hands over — kept in one sovereign record.
                </p>
              </Reveal>

              <Reveal delay={340}>
                <div className="land-hero-actions">
                  <Link href="/login?demo=1" className="land-cta">
                    <span className="land-cta-fill" aria-hidden />
                    <span className="land-cta-label">
                      Open the live demo <span aria-hidden>↗</span>
                    </span>
                  </Link>
                  <a href="#documents" className="land-ghost">
                    <span>See the documents</span>
                    <span aria-hidden>↓</span>
                  </a>
                </div>
              </Reveal>

              <Reveal delay={420} mask={false}>
                <p className="land-hero-footnote">
                  No screenshots, no photographed print-outs. Every document is generated,
                  set in vector type, and carries the school crest.
                </p>
              </Reveal>
            </div>

            <Reveal className="land-hero-ledger" delay={200} mask={false}>
              <LedgerPanel />
            </Reveal>
          </div>
        </section>

        {/* ── Field band ───────────────────────────────────────── */}
        <div className="land-ticker" aria-hidden>
          <div className="land-ticker-track">
            {[0, 1].map((copy) => (
              <div className="land-ticker-run" key={copy}>
                {TICKER.map((word) => (
                  <span key={`${copy}-${word}`}>
                    {word}
                    <i>◆</i>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── Numbers ──────────────────────────────────────────── */}
        <section className="land-stats" aria-label="System at a glance">
          <StatCell target={150} label="Learners on the register" />
          <StatCell target={2788} label="Scores assessed this term" />
          <StatCell target={88.2} suffix="%" label="Presence across all streams" format={(n) => n.toFixed(1)} />
          <StatCell target={19500000} label="Fees reconciled · TZS" format={(n) => `${(n / 1_000_000).toFixed(1)}M`} />
        </section>

        {/* ── Index ────────────────────────────────────────────── */}
        <section className="land-section" id="index">
          <div className="land-section-head">
            <Reveal>
              <span className="land-label">01 — The index</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="land-h2">
                Six modules, one <em className="land-serif">record</em>.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="land-section-note">
                Point at a row to see what it holds today. Everything below is live demo data,
                not a mock-up.
              </p>
            </Reveal>
          </div>
          <IndexList />
        </section>

        {/* ── Method ───────────────────────────────────────────── */}
        <section className="land-section land-section-dark" id="method">
          <div className="land-section-head">
            <Reveal>
              <span className="land-label">02 — Method</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="land-h2">
                One day becomes <em className="land-serif">one record</em>.
              </h2>
            </Reveal>
          </div>
          <DayNarrative />
        </section>

        {/* ── Documents ────────────────────────────────────────── */}
        <section className="land-section" id="documents">
          <div className="land-section-head">
            <Reveal>
              <span className="land-label">03 — Documents</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="land-h2">
                Paperwork that <em className="land-serif">holds up</em>.
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="land-section-note">
                Open any of these — they are the real exports from the demo school, generated
                with pdf-lib from live records.
              </p>
            </Reveal>
          </div>

          <div className="land-docs">
            {DOCUMENTS.map((doc, i) => (
              <Reveal key={doc.name} delay={i * 70} mask={false}>
                <a className="land-doc-card" href={doc.file} target="_blank" rel="noreferrer">
                  <span className="land-doc-card-top">
                    <span className="land-label">{doc.meta}</span>
                    <span aria-hidden>↗</span>
                  </span>
                  <span className="land-doc-card-name">{doc.name}</span>
                  <span className="land-doc-card-note">{doc.note}</span>
                  <span className="land-doc-card-stat">{doc.stat}</span>
                </a>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Compliance ───────────────────────────────────────── */}
        <section className="land-statement" id="compliance">
          <div className="land-statement-inner">
            <Reveal>
              <span className="land-label land-label-light">04 — Compliance</span>
            </Reveal>
            <Reveal delay={80}>
              <p className="land-statement-line">
                Sovereign by default, <em className="land-serif">auditable</em> by design.
              </p>
            </Reveal>
            <div className="land-statement-facts">
              {[
                ["PDPA 2022", "Data Protection Act alignment, role-scoped access."],
                ["NECTA", "CSEE and FTNA matrices, divisions and points."],
                ["Audit trail", "Every export and edit written to the log."],
              ].map(([title, body], i) => (
                <Reveal key={title} delay={120 + i * 80} mask={false}>
                  <div className="land-fact">
                    <span className="land-fact-title">{title}</span>
                    <span className="land-fact-body">{body}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={320}>
              <Link href="/login?demo=1" className="land-cta land-cta-inverse">
                <span className="land-cta-fill" aria-hidden />
                <span className="land-cta-label">
                  Enter the demo school <span aria-hidden>↗</span>
                </span>
              </Link>
            </Reveal>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="land-footer">
        <div className="land-footer-grid">
          <div>
            <span className="land-label">Shule Altra</span>
            <p className="land-footer-line">
              Built by Altra Node for Tanzanian secondary schools. Dar es Salaam.
            </p>
          </div>
          <div className="land-footer-links">
            <a href="#index">Index</a>
            <a href="#method">Method</a>
            <a href="#documents">Documents</a>
            <Link href="/dashboard/help">Support</Link>
          </div>
        </div>
        <div className="land-footer-base">
          <span>© 2026 Shule Altra · V2.26.ALTRA</span>
          <span>admin@shule.pro · demo2026</span>
          <span>PDPA 2022 · NECTA · ClickPesa</span>
        </div>
      </footer>
    </div>
  )
}
