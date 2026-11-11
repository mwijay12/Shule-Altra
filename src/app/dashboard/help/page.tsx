
"use client"

import * as React from "react"
import {
  BookOpen,
  HelpCircle,
  Search,
  ArrowRight,
  Video,
  Mail,
  MessageSquare,
  ShieldCheck,
  ClipboardCheck,
  Banknote,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  LifeBuoy,
  FileText
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils"
import { COMPANY, SUPPORT } from "@/lib/company"

const articles = [
  {
    cat: "Academics",
    icon: GraduationCap,
    color: "text-accent",
    bg: "bg-accent/10",
    items: [
      "How to use NECTA-aligned grading",
      "Uploading results via Excel",
      "Analyzing student progress with AI"
    ]
  },
  {
    cat: "Finance",
    icon: Banknote,
    color: "text-green-600",
    bg: "bg-green-100",
    items: [
      "Generating Control Numbers",
      "Reconciling ClickPesa payments",
      "Managing operational petty cash"
    ]
  },
  {
    cat: "Attendance",
    icon: ClipboardCheck,
    color: "text-blue-600",
    bg: "bg-blue-100",
    items: [
      "Marking the daily register",
      "Absence flags for guardian follow-up",
      "Tracking long-term absenteeism"
    ]
  },
  {
    cat: "Admin",
    icon: ShieldCheck,
    color: "text-primary",
    bg: "bg-primary/10",
    items: [
      "Setting up school center IDs",
      "Issuing personnel access keys",
      "Branding and customization guide"
    ]
  },
]

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 px-4">
      <div className="text-center space-y-4 py-12 px-6 rounded-[3rem] bg-primary text-primary-foreground relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 p-8 opacity-10">
          <LifeBuoy className="h-48 w-48 rotate-12" />
        </div>
        <Badge className="bg-white/20 text-white border-none font-semibold text-[13px] px-6 py-1">Help</Badge>
        <h1 className="text-4xl sm:text-5xl font-headline font-semibold tracking-tight">How can we help?</h1>
        <p className="text-primary-foreground/80 font-medium max-w-xl mx-auto text-sm sm:text-base">Search our documentation for professional guides on using ShuleDirect Pro.</p>

        <div className="relative max-w-2xl mx-auto pt-4 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
          <Input
            placeholder="Search guides, tutorials, and FAQs..."
            className="h-14 pl-12 rounded-2xl bg-white border-none text-black font-bold shadow-xl focus-visible:ring-4 focus-visible:ring-white/20"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-reveal>
        {articles.map((section) => (
          <Card key={section.cat} className="border-none shadow-sm hover:shadow-xl transition-shadow duration-500 group cursor-pointer overflow-hidden rounded-[2rem]">
            <CardHeader className="pb-4">
              <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", section.bg, section.color)}>
                <section.icon className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-semibold">{section.cat}</CardTitle>
              <CardDescription className="text-xs font-bold text-muted-foreground"><AnimatedNumber value={section.items.length} /> Modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-6">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[14px] font-bold text-muted-foreground hover:text-primary transition-colors">
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item}</span>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-4 text-[13px] font-semibold text-primary hover:bg-primary/5 rounded-full">
                View All <ArrowRight className="ml-2 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3" data-reveal>
        <Card className="lg:col-span-2 border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
            <CardDescription>Quick answers to common operational questions.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1" className="border-none mb-2">
                <AccordionTrigger className="hover:no-underline p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 font-bold text-sm text-left transition-colors">
                  Is the system truly NECTA-compliant?
                </AccordionTrigger>
                <AccordionContent className="p-4 text-sm text-muted-foreground leading-relaxed font-medium">
                  Yes. Grading follows the official NECTA CSEE point aggregation and division rules (I-IV, 0) used for O-level. The grading library also carries PSLE, FTNA and ACSEE matrices for schools that need them.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2" className="border-none mb-2">
                <AccordionTrigger className="hover:no-underline p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 font-bold text-sm text-left transition-colors">
                  How does ClickPesa reconciliation work?
                </AccordionTrigger>
                <AccordionContent className="p-4 text-sm text-muted-foreground leading-relaxed font-medium">
                  Each bill carries a control number, which the parent pays through ClickPesa, mobile money or the school bank account. When ClickPesa confirms a payment it calls our webhook and the learner's ledger updates automatically. Payments made outside ClickPesa are matched to the learner by the bursar.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3" className="border-none mb-2">
                <AccordionTrigger className="hover:no-underline p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 font-bold text-sm text-left transition-colors">
                  Can we use the system without Internet?
                </AccordionTrigger>
                <AccordionContent className="p-4 text-sm text-muted-foreground leading-relaxed font-medium">
                  Demo data stays in this browser and does not sync across devices. Live Firebase, sign-in, loading pages and external services may need a connection; offline operation is not guaranteed.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm colorful-gradient text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <Video className="h-24 w-24" />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Video Academy</CardTitle>
              <CardDescription className="text-white/70 font-medium">Watch 2-minute tutorials on core workflows.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-white text-primary hover:bg-card rounded-full font-semibold shadow-lg">
                <Video className="mr-2 h-4 w-4" /> Start Learning
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-accent" /> Expert Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <a href={`mailto:${SUPPORT.email}`} className="flex items-center gap-4 p-3 rounded-xl bg-card border border-accent/10 hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Email support</p>
                  <p className="break-all text-sm font-bold">{SUPPORT.email}</p>
                </div>
              </a>
              <a href={SUPPORT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 rounded-xl bg-card border border-accent/10 hover:border-accent/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">WhatsApp Help</p>
                  <p className="text-sm font-bold">{SUPPORT.phone}</p>
                </div>
              </a>
              <a href={COMPANY.phoneHref} className="block text-sm font-semibold text-accent underline underline-offset-4">Call {SUPPORT.phone}</a>
              <p className="text-xs leading-relaxed text-muted-foreground">{SUPPORT.hours} · {SUPPORT.responseAim}</p>
              <Button asChild variant="outline" className="w-full rounded-full border-accent/20 text-accent font-bold h-11">
                <a href={`mailto:${SUPPORT.email}`}>Email support</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
