'use client'

/**
 * @fileOverview Keeps the server session in step with the signed-in user.
 *
 * The cookie now expires after 30 idle minutes. Without a heartbeat, someone
 * typing marks for an hour would find every export refused with no explanation.
 * This refreshes while the tab is actually in use, stops when it is hidden, and
 * tells the person plainly when the session has ended instead of letting
 * buttons fail silently.
 *
 * It also clears the cookie the moment the user signs out, so the next person
 * at a shared office machine does not inherit the previous role.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { DEMO_MODE } from '@/lib/demo/config'
import { Button } from '@/components/ui/button'

/** Refresh comfortably inside the 30-minute idle window. */
const HEARTBEAT_MS = 10 * 60 * 1000

export function SessionKeeper() {
  const { user, role, loading } = useAuth()
  const router = useRouter()
  const [expired, setExpired] = useState(false)
  const inFlight = useRef(false)

  const publish = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const idToken = !DEMO_MODE && user ? await user.getIdToken().catch(() => null) : null
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(DEMO_MODE ? { role } : { idToken }),
      })
      if (response.status === 401 || response.status === 403) {
        setExpired(true)
      } else if (response.ok) {
        setExpired(false)
      }
    } catch {
      /* offline: the gate stays closed, nothing is exposed by failing open */
    } finally {
      inFlight.current = false
    }
  }, [role, user])

  // Establish the session, and clear it on sign-out.
  useEffect(() => {
    if (loading) return
    if (!user || !role) {
      setExpired(false)
      void fetch('/api/session', { method: 'DELETE' }).catch(() => {})
      return
    }
    void publish()
  }, [user, role, loading, publish])

  // Heartbeat only while the tab is visible and the person is around.
  useEffect(() => {
    if (!user || !role) return
    let lastActivity = Date.now()
    const note = () => { lastActivity = Date.now() }
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, note, { passive: true }))

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActivity > HEARTBEAT_MS) return
      void publish()
    }, HEARTBEAT_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void publish()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      events.forEach((e) => window.removeEventListener(e, note))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, role, publish])

  if (!expired || !user) return null

  return (
    <div
      role="alertdialog"
      aria-labelledby="session-expired-title"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-border bg-card/95 px-4 py-4 md:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p id="session-expired-title" className="text-sm font-semibold text-foreground">
            Your session needs renewing
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            For the safety of learner records, access pauses after a period of inactivity.
            Your work is still here — sign in again to continue.
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => { setExpired(false); router.replace('/login') }}
        >
          Sign in again
        </Button>
      </div>
    </div>
  )
}
