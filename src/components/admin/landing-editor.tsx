"use client"

import * as React from "react"
import { doc, setDoc } from "firebase/firestore"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { useToast } from "@/hooks/use-toast"
import { uploadLandingImage } from "@/lib/storage"
import { useMediaSrc } from "@/components/landing/use-media-src"
import { deleteDemoMedia, isDemoMediaRef, landingMediaKey } from "@/lib/demo/media-store"
import { DEMO_MODE } from "@/lib/demo/config"
import {
  DEFAULT_LANDING_CONTENT,
  LANDING_DOC_PATH,
  LANDING_FONTS,
  LANDING_IMAGE_SLOTS,
  LANDING_SCHOOL_ID,
  mergeLandingContent,
  type LandingContent,
  type LandingImageSlot,
} from "@/lib/landing/content"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Upload, RotateCcw, ExternalLink, Type } from "lucide-react"
import { cn } from "@/lib/utils"

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const id = React.useId()
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[9px] font-black uppercase text-muted-foreground ml-1">{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-xl min-h-24 bg-muted/20 border-none font-medium shadow-inner px-4 py-3 text-sm"
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-xl h-11 bg-muted/20 border-none font-bold shadow-inner px-4 text-sm"
        />
      )}
    </div>
  )
}

function PhotoPreview({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const resolved = useMediaSrc(src, fallback)
  /* Any administrator-pasted URL must preview, so this bypasses the optimizer. */
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src={resolved} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
}

export function LandingEditor() {
  const db = useFirestore()
  const { toast } = useToast()
  const ref = useMemoFirebase(() => doc(db, LANDING_DOC_PATH), [db])
  const { data, isLoading } = useDoc(ref)
  const [form, setForm] = React.useState<LandingContent>(DEFAULT_LANDING_CONTENT)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState<LandingImageSlot | null>(null)
  const [published, setPublished] = React.useState<LandingContent>(DEFAULT_LANDING_CONTENT)

  React.useEffect(() => {
    if (isLoading) return
    const merged = mergeLandingContent(data)
    setForm(merged)
    setPublished(merged)
  }, [data, isLoading])

  const dirty = React.useMemo(() => JSON.stringify(form) !== JSON.stringify(published), [form, published])

  const patch = (updater: (current: LandingContent) => LandingContent) => setForm(updater)

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(ref, { ...form, updatedAt: new Date().toISOString() }, { merge: true })
      setPublished(form)
      toast({ title: "Landing page published", description: "Copy, photography and font choice are live on the public page." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Publish failed", description: error?.message ?? "Could not save landing content." })
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (slot: LandingImageSlot, file: File) => {
    setUploading(slot)
    try {
      const src = await uploadLandingImage(LANDING_SCHOOL_ID, slot, file)
      patch((current) => ({ ...current, images: { ...current.images, [slot]: { ...current.images[slot], src } } }))
      toast({ title: "Photograph attached", description: "Press Publish landing page to make it public." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error?.message ?? "Could not upload photograph." })
    } finally {
      setUploading(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60 p-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60 backdrop-blur-md">
        <CardHeader className="bg-primary/5 border-b p-8">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-widest">Landing page studio</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase leading-relaxed mt-1">
                Edit the public story, replace every photograph with your own consented imagery, and choose the type pairing.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {dirty ? (
                <Badge variant="outline" className="rounded-full border-amber-300 bg-amber-50 text-amber-700 text-[8px] font-black uppercase">
                  Unpublished changes
                </Badge>
              ) : null}
              <Button variant="outline" asChild className="rounded-full h-10 px-5 text-[9px] uppercase font-black">
                <a href="/" target="_blank" rel="noreferrer" title="Opens the published landing page in a new tab">
                  <ExternalLink className="mr-2 h-3 w-3" /> View published
                </a>
              </Button>
              <Button onClick={handleSave} disabled={saving || uploading !== null} className="rounded-full colorful-gradient h-10 px-6 text-[9px] uppercase font-black text-white">
                {saving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />} Publish landing page
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="School name" value={form.schoolName} onChange={(value) => patch((c) => ({ ...c, schoolName: value }))} />
            <Field label="Brand tagline" value={form.brandTagline} onChange={(value) => patch((c) => ({ ...c, brandTagline: value }))} />
          </div>

          <div className="space-y-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary"><Type className="h-3 w-3" /> Font choice</p>
            <div className="grid gap-4 md:grid-cols-3">
              {LANDING_FONTS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  aria-pressed={form.font === font.id}
                  onClick={() => patch((c) => ({ ...c, font: font.id }))}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all",
                    form.font === font.id ? "border-primary bg-primary/5 shadow-lg" : "border-border/60 bg-muted/20 hover:border-primary/40"
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase">{font.name}</span>
                    {form.font === font.id ? <Badge className="rounded-full text-[8px]">Active</Badge> : null}
                  </span>
                  <span
                    className="block mt-3 text-2xl leading-tight"
                    style={{
                      fontFamily:
                        font.id === 'gazette'
                          ? 'var(--font-serif)'
                          : font.id === 'signal'
                            ? 'var(--font-body)'
                            : 'var(--font-display)',
                      fontStyle: font.id === 'gazette' ? 'italic' : undefined,
                    }}
                  >
                    {font.sample}
                  </span>
                  <span className="block mt-2 text-[10px] text-muted-foreground leading-relaxed">{font.description}</span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60">
        <CardHeader className="bg-primary/5 border-b p-8">
          <CardTitle className="text-base font-black uppercase tracking-widest">Hero copy</CardTitle>
        </CardHeader>
        <CardContent className="p-8 grid gap-6 md:grid-cols-2">
          <Field label="Kicker" value={form.hero.kicker} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, kicker: value } }))} />
          <Field label="Primary button" value={form.hero.primaryCta} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, primaryCta: value } }))} />
          {form.hero.titleLines.map((line, index) => (
            <Field
              key={index}
              label={`Headline line ${index + 1}`}
              value={line}
              onChange={(value) =>
                patch((c) => {
                  const titleLines = [...c.hero.titleLines] as [string, string, string]
                  titleLines[index] = value
                  return { ...c, hero: { ...c.hero, titleLines } }
                })
              }
            />
          ))}
          <Field label="Secondary button" value={form.hero.secondaryCta} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, secondaryCta: value } }))} />
          <div className="md:col-span-2">
            <Field label="Hero paragraph" multiline value={form.hero.lede} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, lede: value } }))} />
          </div>
          <Field label="Photo caption title" value={form.hero.captionTitle} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, captionTitle: value } }))} />
          <Field label="Photo caption note" value={form.hero.captionNote} onChange={(value) => patch((c) => ({ ...c, hero: { ...c.hero, captionNote: value } }))} />
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60">
        <CardHeader className="bg-primary/5 border-b p-8">
          <CardTitle className="text-base font-black uppercase tracking-widest">Register numbers</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">Keep these aligned with the demo registry, or replace them with your own school figures.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 grid gap-6 md:grid-cols-2">
          {form.stats.map((stat, index) => (
            <div key={index} className="rounded-2xl border border-border/60 bg-muted/10 p-5 space-y-4">
              <Field
                label={`Stat ${index + 1} value`}
                value={String(stat.target)}
                onChange={(value) =>
                  patch((c) => ({
                    ...c,
                    stats: c.stats.map((item, i) => (i === index ? { ...item, target: Number(value) || 0 } : item)),
                  }))
                }
              />
              <Field label="Label" value={stat.label} onChange={(value) => patch((c) => ({ ...c, stats: c.stats.map((item, i) => (i === index ? { ...item, label: value } : item)) }))} />
              <Field label="Note" value={stat.note} onChange={(value) => patch((c) => ({ ...c, stats: c.stats.map((item, i) => (i === index ? { ...item, note: value } : item)) }))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60">
        <CardHeader className="bg-primary/5 border-b p-8">
          <CardTitle className="text-base font-black uppercase tracking-widest">Photography</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase leading-relaxed">
            Upload your own school photographs, paste a hosted URL, or restore the placeholder. Learner faces require guardian consent before publication.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {LANDING_IMAGE_SLOTS.map((slot) => {
            const image = form.images[slot.id]
            const busy = uploading === slot.id
            return (
              <div key={slot.id} className="rounded-2xl border border-border/60 bg-muted/10 overflow-hidden">
                <div className="relative aspect-[4/3] bg-muted">
                  <PhotoPreview src={image.src} alt={image.alt} fallback={DEFAULT_LANDING_CONTENT.images[slot.id].src} />
                  {busy ? <div className="absolute inset-0 grid place-items-center bg-background/70"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : null}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase">{slot.label}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full text-[8px] uppercase font-black"
                      onClick={() => {
                        // Drop the stored demo blob so resetting really frees space.
                        if (DEMO_MODE) void deleteDemoMedia(landingMediaKey(LANDING_SCHOOL_ID, slot.id))
                        patch((c) => ({ ...c, images: { ...c.images, [slot.id]: DEFAULT_LANDING_CONTENT.images[slot.id] } }))
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" /> Reset
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{slot.hint}</p>
                  <Input
                    aria-label={`${slot.label} image source`}
                    value={image.src.startsWith('data:') || isDemoMediaRef(image.src) ? '(uploaded photograph)' : image.src}
                    readOnly={image.src.startsWith('data:') || isDemoMediaRef(image.src)}
                    onChange={(event) => patch((c) => ({ ...c, images: { ...c.images, [slot.id]: { ...c.images[slot.id], src: event.target.value } } }))}
                    className="h-9 rounded-lg bg-background/70 border-none text-[10px] font-mono"
                  />
                  <Input
                    aria-label={`${slot.label} alt text`}
                    value={image.alt}
                    onChange={(event) => patch((c) => ({ ...c, images: { ...c.images, [slot.id]: { ...c.images[slot.id], alt: event.target.value } } }))}
                    className="h-9 rounded-lg bg-background/70 border-none text-[10px]"
                    placeholder="Alt text"
                  />
                  <label className="flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 h-9 text-[9px] font-black uppercase text-primary cursor-pointer hover:bg-primary/10">
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} Replace photograph
                    <input
                      type="file"
                      accept="image/*"
                      aria-label={`Replace ${slot.label} photograph`}
                      className="hidden"
                      disabled={busy}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleUpload(slot.id, file)
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/60">
        <CardHeader className="bg-primary/5 border-b p-8">
          <CardTitle className="text-base font-black uppercase tracking-widest">Section copy</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          {(Object.keys(form.sections) as Array<keyof LandingContent['sections']>).map((key) => {
            const section = form.sections[key]
            return (
              <div key={key} className="grid gap-4 md:grid-cols-3 border-b border-border/50 pb-6 last:border-none last:pb-0">
                <Field label={`${key} · label`} value={section.label} onChange={(value) => patch((c) => ({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], label: value } } }))} />
                <Field label={`${key} · title`} value={section.title} onChange={(value) => patch((c) => ({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], title: value } } }))} />
                <Field label={`${key} · accent`} value={section.accent} onChange={(value) => patch((c) => ({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], accent: value } } }))} />
                {'note' in section && section.note ? (
                  <div className="md:col-span-3">
                    <Field label={`${key} · note`} multiline value={section.note} onChange={(value) => patch((c) => ({ ...c, sections: { ...c.sections, [key]: { ...c.sections[key], note: value } } }))} />
                  </div>
                ) : null}
              </div>
            )
          })}
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Interlude line" value={form.interlude.line} onChange={(value) => patch((c) => ({ ...c, interlude: { ...c.interlude, line: value } }))} />
            <Field label="Interlude accent" value={form.interlude.accent} onChange={(value) => patch((c) => ({ ...c, interlude: { ...c.interlude, accent: value } }))} />
            <Field label="Interlude meta" value={form.interlude.meta} onChange={(value) => patch((c) => ({ ...c, interlude: { ...c.interlude, meta: value } }))} />
            <Field label="Footer location" value={form.footer.location} onChange={(value) => patch((c) => ({ ...c, footer: { ...c.footer, location: value } }))} />
            <div className="md:col-span-2">
              <Field label="Footer product paragraph" multiline value={form.footer.product} onChange={(value) => patch((c) => ({ ...c, footer: { ...c.footer, product: value } }))} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
