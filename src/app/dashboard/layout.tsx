"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InstitutionalLoader } from "@/components/ui/institutional-loader"
import { AuroraShell } from "@/components/admin/shell"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, loading, error, canAccess, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  // The boot screen is decoration, never a gate. If it fails to report back —
  // a dropped frame, a stalled timer, a hydration error — the shell still opens.
  useEffect(() => {
    const failsafe = window.setTimeout(() => setIsInitialLoading(false), 2000)
    return () => window.clearTimeout(failsafe)
  }, [])

  // Tell the server which role this session acts as, so document requests can be
  // answered without trusting the UI. Cleared again on sign-out.
  useEffect(() => {
    if (!role || loading) return
    fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    }).catch(() => {
      /* the gate simply stays closed — no document is exposed by failing open */
    })
  }, [role, loading])

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!loading && user && role) {
      const module = pathname.split('/')[2]
      if (module && !canAccess(module)) {
        router.replace("/dashboard")
      }
    }
  }, [loading, user, role, pathname, canAccess, router])

  const handleSignOut = async () => {
    await fetch("/api/session", { method: "DELETE" }).catch(() => undefined)
    await signOut()
  }

  if (loading || isInitialLoading) {
    return <InstitutionalLoader onComplete={() => setIsInitialLoading(false)} />
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center font-body">
        <div className="space-y-4">
          <Badge variant="destructive" className="px-4 py-1 rounded-full font-semibold">Access denied</Badge>
          <p className="text-muted-foreground text-sm font-bold">{error}</p>
          <Button onClick={() => router.push("/login")} className="rounded-full colorful-gradient font-semibold text-[13px] px-8">Retry Entry</Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <AuroraShell role={role} canAccess={canAccess} signOut={handleSignOut}>
        {/* keyed on the route so every screen replays the same entrance */}
        <div key={pathname} className="sd-page-enter">
          {children}
        </div>
      </AuroraShell>
      <Toaster />
    </>
  )
}
