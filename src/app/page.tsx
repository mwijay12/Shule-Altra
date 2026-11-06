"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  ShieldCheck, 
  ArrowRight, 
  Zap,
  Smartphone,
  Users,
  Banknote,
  Calculator,
  Shield,
  PieChart,
  Globe,
  Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StaggeredMenu } from "@/components/ui/staggered-menu"
import { FeatureCarousel } from "@/components/ui/feature-carousel"
import { MarqueeAnimation } from "@/components/ui/marquee-effect"
import ScrollReveal from "@/components/ui/scroll-reveal"
import ScrollFloat from "@/components/ui/scroll-float"
import GradientText from "@/components/ui/gradient-text"
import AnimatedContent from "@/components/ui/animated-content"
import { InstitutionalLoader } from "@/components/ui/institutional-loader"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default function LandingPage() {
  const [systemName] = useState("Shule Altra")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        ScrollTrigger.refresh();
        window.dispatchEvent(new Event('scroll'));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading])
  
  const navItems = [
    { label: "Dashboard", link: "/dashboard" },
    { label: "Staff Portal", link: "/login" },
    { label: "Support Hub", link: "/dashboard/help" },
  ]

  const socialItems = [
    { label: "Instagram", link: "https://instagram.com/shulealtra" },
    { label: "LinkedIn", link: "https://linkedin.com/company/shulealtra" },
    { label: "WhatsApp", link: "https://wa.me/255620641695" },
  ]

  return (
    <>
      {isLoading && <InstitutionalLoader onComplete={() => setIsLoading(false)} />}
      
      <div className={`min-h-screen bg-background font-body selection:bg-primary/20 overflow-x-hidden w-full relative ${isLoading ? 'hidden' : 'block'}`}>
        <StaggeredMenu items={navItems} socialItems={socialItems} />

        {/* Hero Section */}
        <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-4 sm:px-10 relative w-full overflow-hidden">
          <div className="absolute top-40 right-[-10%] w-[300px] sm:w-[800px] h-[300px] sm:h-[800px] bg-accent/5 rounded-full blur-[80px] sm:blur-[150px] -z-10 animate-pulse-soft" />
          <div className="absolute top-20 left-[-5%] w-[200px] sm:w-[500px] h-[200px] sm:h-[500px] bg-primary/5 rounded-full blur-[60px] sm:blur-[120px] -z-10 animate-float" />
          
          <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12 relative z-10">
            <div className="space-y-6 text-center lg:text-left">
              <AnimatedContent direction="vertical" distance={20}>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/5 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] border border-primary/10 w-fit mx-auto lg:mx-0">
                  <Zap className="h-3 w-3 sm:h-3.5 w-3.5 fill-primary" /> Sovereign Excellence 2026
                </div>
              </AnimatedContent>
              
              <div className="space-y-1">
                <ScrollFloat 
                  containerClassName="text-center lg:text-left"
                  textClassName="text-primary !text-[clamp(1.5rem,4vw,2.5rem)]"
                >
                  SOVEREIGN LOGIC.
                </ScrollFloat>
                <GradientText 
                  className="text-2xl sm:text-4xl font-black uppercase tracking-tighter mx-auto lg:mx-0 justify-center lg:justify-start"
                  colors={['#1F5BA6', '#945CE6', '#1F5BA6']}
                >
                  Advanced Management.
                </GradientText>
              </div>

              <div className="grid lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <ScrollReveal 
                    containerClassName="max-w-2xl mx-auto lg:mx-0"
                    textClassName="text-muted-foreground !text-[clamp(0.85rem,1.3vw,1rem)] leading-relaxed text-center lg:text-left"
                  >
                    {systemName} — The high-fidelity institutional ecosystem for the modern African landscape. Engineered for national-scale reliability, data sovereignty, and PDPA compliance.
                  </ScrollReveal>
                  <AnimatedContent distance={30} delay={0.4}>
                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
                      <Link href="/login?demo=1" className="w-full sm:w-auto">
                        <Button size="lg" className="w-full rounded-full h-14 sm:h-16 px-10 sm:px-12 font-black colorful-gradient group shadow-xl hover:scale-[1.03] transition-all text-xs sm:text-sm uppercase tracking-widest">
                          Launch Live Demo <ArrowRight className="ml-3 h-4 w-4 group-hover:translate-x-2 transition-transform" />
                        </Button>
                      </Link>
                      <Link href="/login" className="w-full sm:w-auto">
                        <Button size="lg" variant="outline" className="w-full rounded-full h-14 sm:h-16 px-10 sm:px-12 font-black border-primary/20 text-primary bg-white/70 shadow-lg hover:bg-primary/5 transition-all text-xs sm:text-sm uppercase tracking-widest">
                          Staff Entry
                        </Button>
                      </Link>
                    </div>
                  </AnimatedContent>
                </div>
                <div className="lg:col-span-5 hidden lg:block">
                  <AnimatedContent direction="horizontal" distance={40} delay={0.6} reverse>
                    <div className="p-6 rounded-[2rem] border-2 border-dashed border-primary/10 bg-white/50 backdrop-blur-sm space-y-2 shadow-inner">
                      <p className="text-[8px] font-black text-primary uppercase tracking-widest">Compliance Verified</p>
                      <p className="text-sm font-bold text-foreground/70 leading-tight">Official PDPA 2022 & NECTA Management Node</p>
                      <Badge className="bg-green-100 text-green-700 font-black border-none px-3 py-0.5 text-[7px] rounded-full uppercase tracking-tighter">SECURE HUB</Badge>
                    </div>
                  </AnimatedContent>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Marquee Visual Layer */}
        <div className="py-6 space-y-2 border-y bg-muted/30">
          <MarqueeAnimation direction="left" baseVelocity={-0.2} className="text-primary/10 text-2xl sm:text-4xl font-black">
            SHULE ALTRA • PDPA COMPLIANT • CLICKPESA SYNC • 2026 SEASON • 
          </MarqueeAnimation>
          <MarqueeAnimation direction="right" baseVelocity={-0.2} className="text-accent/10 text-2xl sm:text-4xl font-black">
            ADVANCED MANAGEMENT • PURE PERFORMANCE • TANZANIAN EXCELLENCE • 
          </MarqueeAnimation>
        </div>

        {/* Feature Architecture Grid */}
        <section className="py-16 sm:py-24 px-4 sm:px-10 bg-primary text-white overflow-hidden relative w-full">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center border-b border-white/10 pb-10">
              <div className="flex-1">
                <ScrollFloat 
                  textClassName="text-white !text-[clamp(1.3rem,3.5vw,2.2rem)]"
                  scrollStart="top bottom"
                  scrollEnd="bottom center"
                >
                  Built by Altra Node.
                </ScrollFloat>
              </div>
              <div className="flex-1">
                <ScrollReveal 
                  textClassName="text-primary-foreground/70 !text-[clamp(0.8rem,1.1vw,0.9rem)] leading-relaxed"
                  baseOpacity={0.2}
                >
                  Re-engineered for the 2026 season, focusing on privacy and sovereignty for East African institutions.
                </ScrollReveal>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { icon: Calculator, title: "NECTA Hub", desc: "Official CSEE & FTNA matrices for all tiers." },
                { icon: Banknote, title: "Revenue Node", desc: "Financial assurance via ClickPesa and Beem SMS." },
                { icon: Shield, title: "PDPA Vault", desc: "Privacy compliance with the Data Protection Act 2022." },
                { icon: Users, title: "Population", desc: "High-fidelity management for large student bodies." },
                { icon: Globe, title: "Offline Node", desc: "Edge-synced architecture for low-connectivity zones." },
                { icon: PieChart, title: "AI Analytics", desc: "Narrative reports powered by Shule Altra AI." },
              ].map((feature, i) => (
                <AnimatedContent key={i} delay={i * 0.1} distance={30}>
                  <div className="bg-white/5 p-6 rounded-[1.5rem] border border-white/10 hover:border-accent/40 hover:bg-white/10 transition-all group cursor-default h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all">
                        <feature.icon className="h-5 w-5 text-accent" />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-tighter leading-none">{feature.title}</h3>
                    </div>
                    <p className="text-xs text-primary-foreground/60 font-medium leading-relaxed">{feature.desc}</p>
                  </div>
                </AnimatedContent>
              ))}
            </div>
          </div>
        </section>

        {/* Feature Deep Dive */}
        <section className="py-16 sm:py-32 px-4 sm:px-10 relative overflow-hidden bg-background">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <AnimatedContent distance={20}>
                <Badge variant="outline" className="rounded-full px-5 py-0.5 font-black text-[8px] tracking-[0.3em] text-primary uppercase border-primary/20">System Showcase</Badge>
              </AnimatedContent>
              <ScrollFloat textClassName="text-primary !text-[clamp(1.3rem,3.5vw,2.2rem)]">Experience the Hub.</ScrollFloat>
              <p className="text-muted-foreground font-medium text-sm sm:text-base">Granular insights into the technology powering {systemName}.</p>
            </div>
            <AnimatedContent scale={0.95} distance={0} duration={1.2}>
              <FeatureCarousel />
            </AnimatedContent>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 sm:py-24 px-4 sm:px-10 bg-card relative overflow-hidden border-t w-full">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start border-b border-muted pb-12 sm:pb-20">
              <div className="lg:col-span-5 space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl colorful-gradient flex items-center justify-center text-white shadow-xl shrink-0">
                    <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span className="font-headline font-black text-xl sm:text-2xl text-primary tracking-tighter uppercase">{systemName}</span>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-md leading-relaxed">
                  The authoritative institutional hub by Altra Node Technology. Engineered for excellence.
                </p>
              </div>

              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-10 w-full">
                <div className="space-y-6">
                  <h4 className="font-black text-[9px] uppercase tracking-[0.4em] text-primary">System Nodes</h4>
                  <ul className="space-y-3 text-xs sm:text-sm font-black text-muted-foreground uppercase tracking-widest">
                    <li className="hover:text-primary cursor-pointer transition-colors flex items-center gap-3 group">
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0" /> PDPA VAULT
                    </li>
                    <li className="hover:text-primary cursor-pointer transition-colors flex items-center gap-3 group">
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0" /> FINANCE CORE
                    </li>
                    <li className="hover:text-primary cursor-pointer transition-colors flex items-center gap-3 group">
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all -ml-4 group-hover:ml-0" /> ACADEMIC MATRIX
                    </li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h4 className="font-black text-[9px] uppercase tracking-[0.4em] text-accent">Contact Architect</h4>
                  <div className="p-6 sm:p-8 rounded-[1.5rem] bg-muted/30 border-2 border-dashed border-primary/10 space-y-4 shadow-inner group transition-all hover:border-primary/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Star className="h-16 w-16 rotate-12" />
                    </div>
                    <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest relative z-10">
                      <Star className="h-3 w-3 fill-primary animate-pulse" /> Official Lead
                    </div>
                    <div className="space-y-2 relative z-10">
                      <p className="text-lg font-black leading-tight text-foreground/80 group-hover:text-primary transition-colors">Altra Support</p>
                      <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.3em]">Engineering Division</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.5em]">
                © 2026 {systemName} • Tanzanian Excellence
              </p>
              <div className="flex gap-6 text-[9px] font-black text-primary uppercase tracking-[0.3em]">
                 <Link href="/dashboard/help" className="hover:underline">Support Node</Link>
                 <span className="text-accent">V2.26.ALTRA</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
