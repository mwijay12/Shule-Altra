"use client"

/**
 * @fileOverview Motion preference for the public landing page.
 *
 * Reduced-motion must *reduce* motion, never delete it: the previous build
 * switched every transition off under `prefers-reduced-motion`, which left the
 * page looking like a static PDF. Here the visitor can always turn motion back
 * on (persisted), and the system flag only sets the default.
 */

import * as React from "react"
import { Sparkles, ZapOff } from "lucide-react"

type MotionContextValue = {
  on: boolean
  toggle: () => void
  systemReduced: boolean
  /** false until the client has read the system flag + stored choice */
  hydrated: boolean
}

const MotionContext = React.createContext<MotionContextValue>({
  on: true,
  toggle: () => {},
  systemReduced: false,
  hydrated: false,
})

export const MOTION_KEY = "altra:motion"

/** Safe media query, the smoke harness (JSDOM) has no `matchMedia`. */
export function mediaMatches(query: string) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
  return window.matchMedia(query).matches
}

export function useLandingMotion() {
  return React.useContext(MotionContext)
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [on, setOn] = React.useState(true)
  const [systemReduced, setSystemReduced] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)

  React.useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      setHydrated(true)
      return
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setSystemReduced(mq.matches)
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(MOTION_KEY)
    } catch {
      stored = null
    }
    setOn(stored ? stored === "on" : !mq.matches)
    setHydrated(true)

    const onChange = (event: MediaQueryListEvent) => {
      setSystemReduced(event.matches)
      let choice: string | null = null
      try {
        choice = window.localStorage.getItem(MOTION_KEY)
      } catch {
        choice = null
      }
      if (!choice) setOn(!event.matches)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  React.useEffect(() => {
    document.documentElement.dataset.motion = on ? "on" : "off"
  }, [on])

  const toggle = React.useCallback(() => {
    setOn((value) => {
      const next = !value
      try {
        window.localStorage.setItem(MOTION_KEY, next ? "on" : "off")
      } catch {
        /* storage may be unavailable, the session still works */
      }
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ on, toggle, systemReduced, hydrated }),
    [on, toggle, systemReduced, hydrated]
  )

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export function MotionToggle({ className = "" }: { className?: string }) {
  const { on, toggle } = useLandingMotion()
  const Icon = on ? Sparkles : ZapOff
  return (
    <button
      type="button"
      className={`sd-motion-toggle ${className}`}
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Pause animation" : "Play animation"}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
      <span className="sd-motion-toggle-label">Motion</span>
      <span className="sd-motion-toggle-state">{on ? "on" : "off"}</span>
    </button>
  )
}
