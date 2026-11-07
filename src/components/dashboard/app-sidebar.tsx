
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Banknote, 
  Settings,
  ShieldCheck,
  Bus,
  Bed,
  ClipboardCheck,
  Zap,
  LogOut,
  X,
  HelpCircle,
  PackageSearch,
  UtensilsCrossed,
  Calendar
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { DEMO_MODE } from "@/lib/demo/config"

const allNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "Students", url: "/dashboard/students", icon: Users, module: "students" },
  { title: "Attendance", url: "/dashboard/attendance", icon: ClipboardCheck, module: "attendance" },
  { title: "Academics", url: "/dashboard/academics", icon: GraduationCap, module: "academics" },
  { title: "Finance", url: "/dashboard/finance", icon: Banknote, module: "finance" },
  { title: "Canteen", url: "/dashboard/canteen", icon: UtensilsCrossed, module: "canteen" },
  { title: "Inventory", url: "/dashboard/assets", icon: PackageSearch, module: "assets" },
  { title: "Timetable", url: "/dashboard/timetable", icon: Calendar, module: "timetable" },
  { title: "Transport", url: "/dashboard/transport", icon: Bus, module: "transport" },
  { title: "Hostel", url: "/dashboard/hostel", icon: Bed, module: "hostel" },
  { title: "Reports", url: "/dashboard/reports", icon: Zap, module: "reports" },
  { title: "Help", url: "/dashboard/help", icon: HelpCircle, module: "help" },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, module: "settings" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { state, setOpenMobile, isMobile } = useSidebar()
  const { role, canAccess, signOut } = useAuth()
  const isCollapsed = state === "collapsed"

  const filteredItems = allNavItems.filter(item => canAccess(item.module))

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 shadow-sm transition-all duration-300 font-body">
      <SidebarHeader className="p-4 sm:p-6 mb-2 sm:mb-4 relative">
        <Link href="/" className="flex items-center gap-3 group overflow-hidden">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl colorful-gradient text-white shadow-xl group-hover:rotate-12 transition-transform duration-500">
            <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col gap-0.5 leading-none overflow-hidden animate-in fade-in slide-in-from-left-4 duration-500">
              <span className="font-headline font-black text-lg sm:text-xl text-primary tracking-tighter whitespace-nowrap uppercase">Shule Altra</span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-black">Academic Season 2026</span>
            </div>
          )}
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" className="absolute top-4 right-2 h-8 w-8 rounded-full bg-muted/50" onClick={() => setOpenMobile(false)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </SidebarHeader>
      
      <SidebarContent className="px-3 sm:px-4">
        <SidebarMenu className="gap-1 sm:gap-2">
          {filteredItems.map((item) => {
            const isActive = pathname === item.url || (item.url !== '/dashboard' && pathname.startsWith(item.url))
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "relative group h-10 sm:h-12 px-3 sm:px-4 rounded-xl sm:rounded-[1.25rem] transition-all duration-300",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                  onClick={() => isMobile && setOpenMobile(false)}
                >
                  <Link href={item.url} className="flex items-center">
                    <item.icon className={cn(
                      "h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-500 group-hover:rotate-12",
                      isActive ? "text-white" : "text-muted-foreground"
                    )} />
                    {!isCollapsed && (
                      <span className="ml-3 sm:ml-4 font-black text-[10px] sm:text-xs uppercase tracking-widest truncate flex-1">
                        {item.title}
                      </span>
                    )}
                    {!isCollapsed && isActive && (
                      <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 sm:p-6 border-t border-border/40 mt-auto overflow-hidden">
        <div className={cn(
          "flex flex-col gap-3",
          isCollapsed ? "items-center" : ""
        )}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 group bg-primary/5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-primary/10 shadow-inner overflow-hidden">
              <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-full colorful-gradient flex items-center justify-center text-white font-black text-xs shadow-lg uppercase">
                {role?.charAt(0) || 'A'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-primary truncate">Active Hub</span>
                <span className="text-[7px] sm:text-[9px] text-muted-foreground font-black uppercase tracking-tighter truncate">{role} NODE</span>
                {DEMO_MODE && (
                  <span className="text-[7px] text-accent font-black uppercase tracking-tighter truncate">Demo dataset · offline</span>
                )}
              </div>
            </div>
          )}
          <button 
            onClick={signOut}
            className={cn(
              "flex items-center gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl text-destructive font-black text-[8px] sm:text-[10px] uppercase tracking-widest hover:bg-destructive/10 transition-all group",
              isCollapsed ? "justify-center" : "w-full"
            )}
          >
            <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform shrink-0" />
            {!isCollapsed && <span className="truncate">Exit Node</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
