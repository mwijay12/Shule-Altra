
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { 
  Bell, 
  Menu,
  ShieldCheck,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { InstitutionalLoader } from "@/components/ui/institutional-loader"
import { useAuth } from "@/hooks/use-auth"
import { DEMO_MODE } from "@/lib/demo/config"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, role, loading, error, canAccess, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [greeting, setGreeting] = useState("Welcome")
  const [isInitialLoading, setIsInitialLoading] = useState(true)

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

  useEffect(() => {
    const hours = new Date().getHours()
    let msg = "Habari za asubuhi"
    if (hours >= 12 && hours < 16) msg = "Habari za mchana"
    if (hours >= 16) msg = "Habari za jioni"
    setGreeting(msg)
  }, [])

  if (loading || isInitialLoading) {
    return <InstitutionalLoader onComplete={() => setIsInitialLoading(false)} />
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center font-body">
        <div className="space-y-4">
          <Badge variant="destructive" className="px-4 py-1 rounded-full uppercase font-black tracking-widest">Access Node Denied</Badge>
          <p className="text-muted-foreground text-sm uppercase font-bold">{error}</p>
          <Button onClick={() => router.push("/login")} className="rounded-full colorful-gradient font-black text-[10px] uppercase px-8">Retry Entry</Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background flex flex-col min-w-0 w-full relative overflow-hidden min-h-screen">
        <header className="flex h-16 sm:h-20 shrink-0 items-center gap-2 border-b bg-card/80 backdrop-blur-md px-4 sm:px-8 sticky top-0 z-20 w-full">
          <div className="flex items-center gap-2 md:hidden">
             <SidebarTrigger>
               <Menu className="h-5 w-5" />
             </SidebarTrigger>
          </div>
          <div className="hidden md:block">
            <SidebarTrigger className="hover:bg-accent/10" />
          </div>
          
          <div className="flex flex-1 items-center gap-4 min-w-0 px-2">
            <div className="flex flex-col min-w-0">
              <h2 className="text-xs sm:text-lg font-black text-primary flex items-center gap-2 truncate tracking-tight uppercase">
                {greeting}<span className="hidden lg:inline">, {role}! 👋</span>
              </h2>
              <div className="flex items-center gap-2 overflow-hidden">
                <p className="text-[8px] sm:text-[9px] text-muted-foreground font-black uppercase tracking-widest truncate">
                  Sovereign Institutional Node
                </p>
                <Badge variant="outline" className="hidden sm:flex border-green-200 bg-green-50 text-green-700 h-4 text-[7px] font-black px-2 rounded-full whitespace-nowrap">
                  VERIFIED SESSION
                </Badge>
                {DEMO_MODE && (
                  <Badge variant="outline" className="hidden lg:flex border-accent/30 bg-accent/10 text-accent h-4 text-[7px] font-black px-2 rounded-full whitespace-nowrap">
                    DEMO NODE · LOCAL DATA
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground rounded-full h-10 w-10">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2.5 right-2.5 flex h-2 w-2 rounded-full bg-destructive border-2 border-white" />
            </Button>
            <div className="h-9 w-9 rounded-2xl colorful-gradient flex items-center justify-center text-white font-black text-sm shadow-xl shadow-primary/20 shrink-0 uppercase">
              {role?.charAt(0) || 'A'}
            </div>
          </div>
        </header>
        
        <main className="flex-1 w-full relative p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto min-w-0">
            {children}
          </div>
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  )
}
