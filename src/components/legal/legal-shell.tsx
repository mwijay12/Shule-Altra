import Link from 'next/link'
import { COMPANY, PRODUCT, LEGAL_UPDATED, SUPPORT } from '@/lib/company'

/**
 * A quiet reading layout for the legal pages. No dashboard chrome, no motion , 
 * these are documents a head teacher or a procurement officer reads and prints.
 */
export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            {PRODUCT.name}
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" href="/legal/privacy">Privacy</Link>
            <Link className="transition-colors hover:text-foreground" href="/legal/terms">Terms</Link>
            <Link className="transition-colors hover:text-foreground" href="/legal/security">Security</Link>
            <Link className="transition-colors hover:text-foreground" href="/legal/dpa">Data agreement</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">{intro}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          Last updated {LEGAL_UPDATED} · {COMPANY.legalName}, {COMPANY.city}, {COMPANY.country}
        </p>

        <div className="mt-12 space-y-10">{children}</div>

        <section className="mt-16 rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold">Questions about this document</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {SUPPORT.responseAim}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${SUPPORT.email}`}>
              {SUPPORT.email}
            </a>
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={COMPANY.phoneHref}>
              {SUPPORT.phone}
            </a>
            <a
              className="font-medium text-primary underline-offset-4 hover:underline"
              href={SUPPORT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </div>
        </section>

        <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
          This document describes how {PRODUCT.name} is built and operated today. It is not legal
          advice, and a school deploying it remains the data controller for its own records. Have
          your own counsel review it before signature.
        </p>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            Built by{' '}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href={COMPANY.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {COMPANY.name}
            </a>
          </span>
          <span>{COMPANY.city}, {COMPANY.country} · {COMPANY.hours}</span>
        </div>
      </footer>
    </div>
  )
}

export function Section({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="scroll-mt-8">
      <h2 className="flex items-baseline gap-3 text-xl font-semibold tracking-tight">
        <span className="font-mono text-sm font-normal text-muted-foreground">{number}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_li]:leading-relaxed [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  )
}
