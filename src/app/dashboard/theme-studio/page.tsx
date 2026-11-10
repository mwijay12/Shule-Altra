'use client';

/**
 * @fileOverview Theme Studio, the super admin's brand control room.
 *
 * Everything here writes to the same two documents the rest of the app reads:
 * `config/branding` (palette + type pairing) and `config/identity` (name, logo,
 * contacts). Change a colour or upload a crest and the sidebar, the orb and the
 * next PDF all move together. The proof button generates a real letterhead
 * through the production document kit, so what you approve is what prints.
 */

import * as React from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Check,
  Download,
  Loader2,
  Monitor,
  Moon,
  Palette as PaletteIcon,
  RotateCcw,
  ShieldCheck,
  Sun,
  Type,
  Upload,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/components/admin/theme-provider';
import { useSchoolBrand } from '@/components/admin/brand-provider';
import { SchoolLogo } from '@/components/brand/school-logo';
import { APP_FONTS, PALETTE_LIST, type AppFontId, type Palette } from '@/lib/theme/palettes';
import { getActiveBrand, monogram, resolveBrand, setActiveBrand } from '@/lib/brand/identity';
import { uploadSchoolLogo } from '@/lib/storage';
import { cn } from '@/lib/utils';

const SCHOOL_ID = 'school-001';

/** Match the PDF kit's letterhead band: primary at 55% lightness. */
function bandColour(triple: string): string {
  const parts = triple.trim().split(/\s+/);
  const lightness = parseFloat((parts[2] ?? '0').replace('%', ''));
  return `hsl(${parts[0]} ${parts[1]} ${Math.max(8, lightness * 0.55)}%)`;
}

function PaletteCard({
  palette,
  active,
  published,
  disabled,
  onSelect,
}: {
  palette: Palette;
  active: boolean;
  published: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      aria-label={`Use the ${palette.name} palette`}
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition-[color,background-color,border-color,box-shadow]',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'border-primary ring-2 ring-primary/30' : 'border-border',
        disabled && 'cursor-not-allowed opacity-60 hover:translate-y-0 hover:shadow-none'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div aria-hidden className="flex h-20 w-36 overflow-hidden rounded-lg border" style={{ background: `hsl(${palette.light.background})`, borderColor: `hsl(${palette.light.border})` }}>
          <div className="w-9 space-y-1 p-1.5" style={{ background: `hsl(${palette.light.card})` }}>
            <div className="h-2 rounded" style={{ background: `hsl(${palette.light.primary})` }} />
            <div className="h-1 rounded" style={{ background: `hsl(${palette.light.border})` }} />
            <div className="h-1 rounded" style={{ background: `hsl(${palette.light.border})` }} />
          </div>
          <div className="flex-1 space-y-1.5 p-2">
            <div className="h-1.5 w-12 rounded" style={{ background: `hsl(${palette.light.foreground})` }} />
            <div className="h-7 rounded border" style={{ background: `hsl(${palette.light.card})`, borderColor: `hsl(${palette.light.border})` }} />
            <div className="flex gap-1"><span className="h-2 w-8 rounded" style={{ background: `hsl(${palette.light.primary})` }} /><span className="h-2 w-5 rounded" style={{ background: `hsl(${palette.light.accent})` }} /></div>
          </div>
        </div>
        {(active || published) && <Badge className="gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"><Check className="h-3 w-3" />{active ? (published ? 'Live' : 'Preview') : 'Live'}</Badge>}
      </div>

      <div>
        <p className="font-headline text-[15px] font-semibold text-card-foreground">{palette.name}</p>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{palette.description}</p>
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {palette.swatch.map((colour) => (
          <span
            key={colour}
            className="h-4 w-4 rounded-full border border-border"
            style={{ backgroundColor: colour }}
          />
        ))}
      </div>
    </button>
  );
}

export default function ThemeStudioPage() {
  const db = useFirestore();
  const { toast } = useToast();
  const { role, isSuperAdmin, user, loading: authLoading } = useAuth();
  const {
    theme,
    setTheme,
    paletteId,
    fontId,
    setPaletteId,
    setFontId,
    published,
    isPreviewing,
    resetToPublished,
  } = useTheme();
  const { brand, logoSrc } = useSchoolBrand();

  const identityRef = useMemoFirebase(
    () => doc(db, 'schools', SCHOOL_ID, 'config', 'identity'),
    [db]
  );
  const brandingRef = useMemoFirebase(
    () => doc(db, 'schools', SCHOOL_ID, 'config', 'branding'),
    [db]
  );
  const { data: identity } = useDoc(identityRef);

  const canPublish = role === 'ADMIN' || isSuperAdmin;
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [proving, setProving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: '',
    shortName: '',
    motto: '',
    address: '',
    district: '',
    region: '',
    contactEmail: '',
    contactPhone: '',
    centerId: '',
    registrationNumber: '',
  });

  React.useEffect(() => {
    if (!identity) return;
    setForm({
      name: identity.name ?? '',
      shortName: identity.shortName ?? '',
      motto: identity.motto ?? '',
      address: identity.address ?? '',
      district: identity.district ?? '',
      region: identity.region ?? '',
      contactEmail: identity.contactEmail ?? '',
      contactPhone: identity.contactPhone ?? '',
      centerId: identity.centerId ?? '',
      registrationNumber: identity.registrationNumber ?? '',
    });
  }, [identity]);

  /**
   * Only fields the operator actually edited are written back.
   *
   * The form starts empty and fills from Firestore a moment later. Sending the
   * whole form meant an early click on "Save identity", before that snapshot
   * arrived, merged empty strings over the school's real name and contacts.
   * A touched-set makes that impossible whatever the connection does.
   */
  const [touched, setTouched] = React.useState<Set<keyof typeof form>>(new Set());
  const [brandingTouched, setBrandingTouched] = React.useState(false);

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      setTouched((current) => new Set(current).add(key));
      setForm((current) => ({ ...current, [key]: event.target.value }));
    },
  });

  const choosePalette = (id: Parameters<typeof setPaletteId>[0]) => {
    setBrandingTouched(true);
    setPaletteId(id);
  };
  const chooseFont = (id: Parameters<typeof setFontId>[0]) => {
    setBrandingTouched(true);
    setFontId(id);
  };

  const publishBranding = async () => {
    if (!canPublish || !brandingTouched) return;
    setSaving(true);
    try {
      await setDoc(
        brandingRef,
        {
          paletteId,
          fontId,
          updatedAt: serverTimestamp(),
          updatedBy: user?.email ?? user?.uid ?? 'unknown',
        },
        { merge: true }
      );
      setBrandingTouched(false);
      toast({
        title: 'Branding published',
        description: 'Every signed-in workstation picks up this palette and type pairing.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not publish branding',
        description: error instanceof Error ? error.message : 'Check your permissions and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveIdentity = async () => {
    if (!canPublish || touched.size === 0) return;
    setSaving(true);
    try {
      const changes = Object.fromEntries([...touched].map((key) => [key, form[key]]));
      await setDoc(
        identityRef,
        { ...changes, updatedAt: serverTimestamp(), updatedBy: user?.email ?? user?.uid ?? 'unknown' },
        { merge: true }
      );
      setTouched(new Set());
      toast({
        title: 'School identity saved',
        description: 'Letterheads, report cards and fee statements now use these details.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save identity',
        description: error instanceof Error ? error.message : 'Check your permissions and try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onLogoFile = async (file: File) => {
    setUploading(true);
    try {
      const src = await uploadSchoolLogo(SCHOOL_ID, file);
      await setDoc(identityRef, { logo: src, updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Logo updated', description: 'It is now on the sidebar and every letterhead.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logo not uploaded',
        description: error instanceof Error ? error.message : 'Try a smaller PNG or JPEG.',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    setUploading(true);
    try {
      await setDoc(identityRef, { logo: '', updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: 'Logo removed', description: 'Documents fall back to the drawn crest.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not remove the logo',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  /**
   * The studio previews unpublished choices, so the letterhead mock and the PDF
   * proof must include those choices and any unsaved identity edits.
   */
  const previewBrand = React.useMemo(
    () => resolveBrand({ ...(identity ?? {}), ...form }, { paletteId, fontId }),
    [identity, form, paletteId, fontId]
  );

  const downloadProof = async () => {
    setProving(true);
    try {
      const { downloadBrandSample } = await import('@/lib/pdf/brand-sample');
      // The proof may include unsaved identity edits. Restore the current live
      // workstation brand afterwards, not the school's older published palette.
      const previousBrand = getActiveBrand();
      setActiveBrand(previewBrand);
      try {
        await downloadBrandSample();
      } finally {
        if (getActiveBrand() === previewBrand) setActiveBrand(previousBrand);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not build the proof',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setProving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canPublish) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Theme Studio is restricted
          </CardTitle>
          <CardDescription>
            Only an administrator or the super admin can change the school&apos;s colours, type and
            letterhead. Ask them to make the change, or sign in with an administrator account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const previewName = form.name || brand.name;
  const previewShort = form.shortName || brand.shortName;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="flex items-center gap-2">
            <PaletteIcon className="h-6 w-6 text-primary" />
            Theme Studio
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
            Set the school&apos;s colours, type pairing and letterhead. Changes preview here
            immediately; publishing applies them to every workstation and to every document the
            school prints.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPreviewing ? (
            <Button variant="outline" onClick={resetToPublished} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Discard preview
            </Button>
          ) : null}
          <Button onClick={publishBranding} disabled={saving || !brandingTouched} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Publish to school
          </Button>
        </div>
      </header>

      {isPreviewing ? (
        <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-[13px] text-foreground">
          You are previewing an unpublished change. The school still sees{' '}
          <strong>{PALETTE_LIST.find((p) => p.id === published.paletteId)?.name}</strong> with{' '}
          <strong>{APP_FONTS[published.fontId]?.name}</strong>. New documents generated on this workstation use your preview; publish to share it with the school.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" data-reveal>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Palette</CardTitle>
              <CardDescription>
                Choose a colour to preview it on your screen. The miniature shows its light appearance;
                every option also supports dark mode. Select “Publish to school” to share your choice.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {PALETTE_LIST.map((palette) => (
                <PaletteCard
                  key={palette.id}
                  palette={palette}
                  active={palette.id === paletteId}
                  published={palette.id === published.paletteId}
                  disabled={false}
                  onSelect={() => choosePalette(palette.id)}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Light is the default for new workstations. Each person can still switch their own
                screen without changing the school&apos;s palette.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                {([
                  ['light', 'Light', Sun],
                  ['dark', 'Dark', Moon],
                ] as const).map(([mode, label, Icon]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    aria-pressed={theme === mode}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors',
                      theme === mode
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-4 w-4 text-primary" />
                Type pairing
              </CardTitle>
              <CardDescription>
                Headings and body text, chosen together so the dashboard and the prospectus agree.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.values(APP_FONTS).map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => chooseFont(font.id as AppFontId)}
                  aria-pressed={fontId === font.id}
                  className={cn(
                    'flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors',
                    fontId === font.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold" style={{ fontFamily: font.display }}>
                      {font.name}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted-foreground">
                      {font.description}
                    </span>
                    <span className="mt-2 block text-[14px] text-foreground" style={{ fontFamily: font.body }}>
                      Form 3B · 38 learners · Term II attendance 90.1%
                    </span>
                  </span>
                  {fontId === font.id ? <Check className="h-5 w-5 shrink-0 text-primary" /> : null}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>School identity</CardTitle>
              <CardDescription>
                These lines print on every letterhead, report card, fee statement and ID card.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
                <SchoolLogo src={brand.logo} name={previewShort} size={64} radius={14} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">School logo</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    PNG or JPEG, under 2MB. Transparent PNG works best. SVG is not accepted because
                    the PDF engine cannot embed it.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" disabled={uploading} className="gap-2">
                    <label className="cursor-pointer">
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {brand.logo ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        aria-label="Upload school logo"
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void onLogoFile(file);
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </Button>
                  {brand.logo ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeLogo}
                      disabled={uploading}
                      aria-label="Remove school logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="brand-name">School name (as printed)</Label>
                  <Input id="brand-name" {...field('name')} placeholder="Shule Altra Secondary School" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-short">Short name</Label>
                  <Input id="brand-short" {...field('shortName')} placeholder="Mwalimu Nyerere" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-motto">Motto</Label>
                  <Input id="brand-motto" {...field('motto')} placeholder="Elimu Bora, Maisha Bora" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="brand-address">Postal address</Label>
                  <Input id="brand-address" {...field('address')} placeholder="Plot 14, Bagamoyo Road" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-district">District</Label>
                  <Input id="brand-district" {...field('district')} placeholder="Kinondoni" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-region">Region</Label>
                  <Input id="brand-region" {...field('region')} placeholder="Dar es Salaam" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-email">Contact email</Label>
                  <Input id="brand-email" type="email" {...field('contactEmail')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-phone">Contact phone</Label>
                  <Input id="brand-phone" {...field('contactPhone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-centre">NECTA centre number</Label>
                  <Input id="brand-centre" {...field('centerId')} placeholder="0412" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-reg">Registration number</Label>
                  <Input id="brand-reg" {...field('registrationNumber')} placeholder="S/DSM/2016/0412" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveIdentity} disabled={saving || touched.size === 0} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {touched.size === 0 ? 'Save identity' : `Save ${touched.size} change${touched.size === 1 ? '' : 's'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live proof */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[16px]">
                <Monitor className="h-4 w-4 text-primary" />
                Letterhead preview
              </CardTitle>
              <CardDescription>
                Print colours come from the light variant of the palette, whatever mode you are
                viewing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-border shadow-sm">
                <div className="relative px-3 py-4" style={{ background: bandColour(previewBrand.primaryHsl) }}>
                  <div className="flex items-start gap-2.5">
                    {logoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoSrc} alt="" className="h-9 w-9 shrink-0 object-contain" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card text-[13px] font-bold text-slate-900">
                        {monogram(previewName, previewShort)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold leading-tight text-white">
                        {previewName}
                      </p>
                      <p className="mt-1 truncate text-[8px] leading-tight text-white/80">{/* doc-scale */}
                        {previewBrand.address}
                      </p>
                      <p className="truncate text-[8px] leading-tight text-white/80">{/* doc-scale */}
                        {previewBrand.contacts}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex h-1.5">
                  <span className="w-[62%]" style={{ background: `hsl(${previewBrand.primaryHsl})` }} />
                  <span className="flex-1" style={{ background: `hsl(${previewBrand.accentHsl})` }} />
                </div>
                <div className="space-y-2 bg-white p-3">
                  <p className="text-[10px] font-bold tracking-wide text-slate-900">
                    Term II report · Form 3B
                  </p>
                  <div className="space-y-1">
                    {[88, 72, 80, 54].map((width) => (
                      <div key={width} className="h-1.5 rounded-full bg-slate-200" style={{ width: `${width}%` }} />
                    ))}
                  </div>
                  <p className="pt-1 text-[8px] italic text-slate-500">{/* doc-scale */}
                    {previewName} · {previewBrand.motto}
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={downloadProof} disabled={proving} className="w-full gap-2">
                {proving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download a real PDF proof
              </Button>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Built by the same engine as your report cards, so the logo, colours and address are
                exactly what a parent receives.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
