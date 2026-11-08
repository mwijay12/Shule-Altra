
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, Key, ArrowRight, Sparkles, Loader2, AlertCircle, Building2, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth as useFirebaseId } from "@/firebase"
import { signInWithEmailAndPassword, signInAnonymously, onAuthStateChanged } from "firebase/auth"
import { DEMO_MODE } from "@/lib/demo/config"
import { BrandMark, Wordmark } from "@/components/brand/logo"

const DEMO_ROLES = [
  { email: "admin@shule.pro", label: "Administrator", scope: "Full institutional control" },
  { email: "teacher@shule.pro", label: "Teacher", scope: "Students • Attendance • Academics" },
  { email: "bursar@shule.pro", label: "Bursar", scope: "Finance • Canteen • Boarding" },
] as const

export default function LoginPage() {
  const auth = useFirebaseId()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [systemName] = useState("Shule Altra")
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [demoRole, setDemoRole] = useState("ADMIN")
  const [activeDemoEmail, setActiveDemoEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/dashboard")
      }
    })
    return () => unsubscribe()
  }, [auth, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: any) {
      setError("Vitambulisho siyo sahihi. Hakiki Email na Password.")
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError(null)
    try {
      await signInAnonymously(auth)
    } catch (err) {
      setError("Demo access is currently unavailable.")
      setDemoLoading(false)
    }
  }

  const handleRoleLogin = async (roleEmail: string) => {
    setDemoLoading(true)
    setActiveDemoEmail(roleEmail)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, roleEmail, "demo2026")
      router.replace("/dashboard")
    } catch (err) {
      setError("Demo role access failed to initialize.")
      setDemoLoading(false)
      setActiveDemoEmail(null)
    }
  }

  // Arriving from the landing page "Live Demo" call to action
  useEffect(() => {
    if (typeof window === "undefined") return
    const wantsDemo = new URLSearchParams(window.location.search).get("demo")
    if (wantsDemo) {
      void handleRoleLogin("admin@shule.pro")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-6 font-body selection:bg-primary/20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-5 pointer-events-none">
        <div className="grid grid-cols-6 sm:grid-cols-12 h-full gap-px">
          {Array.from({length: 144}).map((_, i) => (
            <div key={i} className="border-r border-b border-primary/20" />
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-4">
          <BrandMark size={80} radius={24} className="mx-auto mb-6 animate-float drop-shadow-2xl" />
          <div className="space-y-2 px-4">
            <h1 className="flex justify-center">
              <Wordmark size={34} pro />
            </h1>
            <p className="text-muted-foreground font-black text-[9px] uppercase tracking-[0.4em]">School staff sign-in</p>
          </div>
        </div>

        <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-xl">
          <CardHeader className="bg-primary/5 pb-10 pt-12 border-b text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <Building2 className="h-64 w-64 -right-10 -top-10 absolute rotate-12" />
            </div>
            <CardTitle className="text-xl sm:text-2xl flex items-center justify-center gap-3 text-primary font-black uppercase tracking-tight">
              <Lock className="h-5 w-5" /> Secure Hub Access
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">Authorized Personnel Required</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-12 space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Official Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="email"
                    type="email" 
                    placeholder="e.g. admin@shulealtra.tech" 
                    className="pl-14 h-14 rounded-2xl border-none bg-muted/30 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-white text-sm font-bold shadow-inner"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="pass" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Secure Passkey</Label>
                <div className="relative group">
                  <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input 
                    id="pass"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-14 h-14 rounded-2xl border-none bg-muted/30 focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:bg-white text-sm font-bold shadow-inner"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10 text-destructive animate-in zoom-in-95">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-[10px] font-black uppercase tracking-tight ml-2">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4 mt-6">
                <Button 
                  type="submit"
                  disabled={loading || demoLoading} 
                  className="w-full h-14 rounded-2xl font-black colorful-gradient shadow-2xl text-sm group hover:scale-[1.02] transition-transform uppercase tracking-[0.2em]"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Initialize Hub <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </Button>

                <div className="pt-6 border-t border-dashed space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">Demo Roles</p>
                    <span className="text-[8px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full">No setup</span>
                  </div>

                  <div className="grid gap-2">
                    {DEMO_ROLES.map((role) => (
                      <button
                        key={role.email}
                        type="button"
                        onClick={() => handleRoleLogin(role.email)}
                        disabled={loading || demoLoading}
                        className="group flex items-center justify-between gap-3 w-full rounded-2xl border border-primary/10 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 disabled:opacity-60"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-widest text-primary">{role.label}</p>
                          <p className="text-[9px] font-bold uppercase tracking-tight text-muted-foreground truncate">{role.scope}</p>
                        </div>
                        {demoLoading && activeDemoEmail === role.email ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-primary shrink-0 transition-transform group-hover:translate-x-1" />
                        )}
                      </button>
                    ))}
                  </div>

                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleDemoLogin}
                    disabled={loading || demoLoading}
                    className="w-full h-12 rounded-2xl font-black border-primary/20 text-primary bg-white shadow-sm text-[10px] group hover:bg-primary/5 transition-all uppercase tracking-[0.2em]"
                  >
                    {demoLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserCircle className="mr-3 h-4 w-4" /> Continue as Guest Admin
                      </>
                    )}
                  </Button>

                  {DEMO_MODE && (
                    <p className="text-[9px] leading-relaxed text-center font-bold uppercase tracking-tight text-muted-foreground/70">
                      The demo runs fully offline · Mwalimu Nyerere Secondary School · 150 students seeded
                    </p>
                  )}
                </div>
              </div>
            </form>

            <div className="pt-8 border-t border-dashed flex flex-col items-center gap-4 text-center">
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-[0.3em]">
                <Sparkles className="h-4 w-4" /> SECURE SESSION READY
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Shule Altra · 2026</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
