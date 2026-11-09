import Link from 'next/link'
import { COMPANY, PRODUCT, SUPPORT } from '@/lib/company'

/**
 * A 404 that behaves like the rest of the product: says what happened, offers
 * the two places a person actually wants, and carries the studio's contact so a
 * broken link on a proposal does not become a dead end.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-lg">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          This page isn&apos;t here
        </h1>
        <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground">
          The link may be out of date, or the page may sit behind a sign-in. Nothing is wrong with
          your account.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to the overview
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm font-medium transition-colors hover:bg-accent/10"
          >
            Open the dashboard
          </Link>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>
            Followed a link we sent you? Tell us and we&apos;ll fix it —{' '}
            <a className="font-medium text-primary underline-offset-4 hover:underline" href={`mailto:${SUPPORT.email}`}>
              {SUPPORT.email}
            </a>
          </p>
          <p className="mt-3 text-xs">
            {PRODUCT.name} · built by{' '}
            <a
              className="underline-offset-4 hover:underline"
              href={COMPANY.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {COMPANY.name}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
