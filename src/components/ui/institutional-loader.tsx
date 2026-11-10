"use client"

import * as React from "react"
import { BrandMark, Wordmark } from "@/components/brand/logo"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

/** The screen stays visible until the session has actually resolved. */
export function InstitutionalLoader({
  ready = true,
  onComplete,
}: {
  ready?: boolean
  onComplete?: () => void
}) {
  const reducedMotion = useReducedMotion()
  const [leaving, setLeaving] = React.useState(false)
  const [slow, setSlow] = React.useState(false)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  React.useEffect(() => {
    if (ready) {
      setSlow(false)
      const startExit = window.setTimeout(() => setLeaving(true), reducedMotion ? 0 : 400)
      const complete = window.setTimeout(() => onCompleteRef.current?.(), reducedMotion ? 0 : 780)
      return () => {
        window.clearTimeout(startExit)
        window.clearTimeout(complete)
      }
    }
    setLeaving(false)
    const slowTimer = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(slowTimer)
  }, [ready, reducedMotion])

  return (
    <div
      className="inst-boot fixed inset-0 z-[9999] flex flex-col justify-between overflow-hidden p-6 sm:p-10"
      data-leaving={leaving ? "true" : "false"}
    >
      <div className="inst-boot-glow" aria-hidden />

      <div className="relative flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-white/75 sm:text-[13px]">
        <span>Shule Altra</span>
        <span>School management</span>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
        <BrandMark size={92} radius={26} className="inst-boot-mark drop-shadow-[0_24px_60px_rgba(10,8,30,0.55)]" />
        <div className="flex flex-col items-center gap-3">
          <Wordmark size={30} className="text-white" onDark />
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/70 sm:text-[12px]">
            Dar es Salaam · school-001
          </p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-xl space-y-4 pb-2">
        <div role="progressbar" aria-label="Loading your session" className="h-1 w-full overflow-hidden rounded-full bg-white/20">
          <div className="inst-boot-bar h-full w-1/3 rounded-full" />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p role="status" aria-live="polite" className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/80 sm:text-[12px]">
            {ready ? "Opening the dashboard" : slow ? "Taking longer than expected. Check your connection." : "Verifying your session"}
          </p>
          {slow && !ready && (
            <button type="button" onClick={() => window.location.reload()} className="self-start rounded-lg border border-white/40 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
