"use client"

/**
 * @fileOverview Route-level error boundary.
 *
 * A blank white screen with "A client-side exception has occurred" is the worst
 * possible failure mode for a school system, the bursar mid-term. This renders
 * a branded recovery surface instead: what happened, what to do, and a reload
 * that re-requests the latest chunks (the usual cause after a redeploy).
 */

import * as React from "react"
import Link from "next/link"
import { BrandMark } from "@/components/brand/logo"

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("[shule-altra] route error:", error)
  }, [error])

  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-6 py-16">
      <div className="w-full max-w-lg rounded-[28px] border border-border bg-card p-8 shadow-[0_40px_80px_-60px_rgba(15,23,42,.7)]">
        <div className="flex items-center gap-3">
          <BrandMark size={44} radius={13} />
          <div className="leading-none">
            <p className="font-headline text-[13px] font-black uppercase tracking-[0.16em]">
              Shule Altra
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
              Recovery surface
            </p>
          </div>
        </div>

        <h1 className="mt-7 font-headline text-[clamp(1.4rem,4vw,1.9rem)] font-black uppercase leading-none tracking-tight">
          This page did not finish loading
        </h1>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Your records are safe — nothing was written. This is almost always a stale
          bundle after a deploy: the browser is holding a file the server no longer has.
          A reload fixes it.
        </p>

        {error.digest ? (
          <p className="mt-4 rounded-xl bg-muted px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Reference {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-11 rounded-full bg-gradient-to-r from-primary to-accent px-5 text-[11px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/25"
          >
            Reload the page
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-full border border-border px-5 text-[11px] font-black uppercase tracking-[0.16em] text-foreground"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="grid h-11 place-items-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
