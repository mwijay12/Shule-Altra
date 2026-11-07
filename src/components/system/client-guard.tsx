"use client"

/**
 * @fileOverview Recover from a stale build instead of showing a dead page.
 *
 * The one client-side failure that hits real visitors but never a test runner
 * is the chunk that does not exist any more: a tab left open across a deploy,
 * or a CDN serving yesterday's manifest. It surfaces as "A client-side
 * exception has occurred". One silent reload fixes it, so we do that — once,
 * and never in a loop.
 */

import * as React from "react"

const STALE_CHUNK =
  /ChunkLoadError|Loading chunk [\w-]+ failed|dynamically imported module|Importing a module script failed|Unable to preload CSS/i

const RELOAD_KEY = "altra:chunk-reload"
const COOLDOWN_MS = 20_000

export function ClientGuard() {
  React.useEffect(() => {
    let fired = false

    const reloadOnce = () => {
      if (fired) return
      fired = true
      try {
        const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0)
        if (Date.now() - last < COOLDOWN_MS) return // already tried: stay put
        window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
      } catch {
        return // no storage (private mode): do not risk a reload loop
      }
      window.location.reload()
    }

    const onError = (event: ErrorEvent) => {
      const message = `${event?.message ?? ""} ${(event?.error as Error | undefined)?.message ?? ""}`
      if (STALE_CHUNK.test(message)) reloadOnce()
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason as { message?: string; name?: string } | string | undefined
      const message =
        typeof reason === "string" ? reason : `${reason?.name ?? ""} ${reason?.message ?? ""}`
      if (STALE_CHUNK.test(message)) reloadOnce()
    }

    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
