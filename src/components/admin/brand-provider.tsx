'use client';

/**
 * @fileOverview One resolved school brand for the whole dashboard.
 *
 * Reads the two config documents the school actually edits, folds them into a
 * SchoolBrand, and publishes it to the PDF kit. This is a provider rather than a
 * hook because three components used to call the hook independently — six
 * Firestore listeners and three competing writes to the document kit's active
 * brand for a single page.
 *
 * Mounted once in the shell, so by the time anyone presses "Download report" the
 * letterhead already knows the school's current name, logo and colours.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { DEFAULT_BRAND, resolveBrand, setActiveBrand, type SchoolBrand } from '@/lib/brand/identity';
import { useMediaSrc } from '@/components/landing/use-media-src';

type BrandValue = { brand: SchoolBrand; logoSrc: string; ready: boolean };

const BrandContext = React.createContext<BrandValue | null>(null);

export function SchoolBrandProvider({
  children,
  schoolId = 'school-001',
}: {
  children: React.ReactNode;
  schoolId?: string;
}) {
  const db = useFirestore();
  const identityRef = useMemoFirebase(
    () => doc(db, 'schools', schoolId, 'config', 'identity'),
    [db, schoolId]
  );
  const brandingRef = useMemoFirebase(
    () => doc(db, 'schools', schoolId, 'config', 'branding'),
    [db, schoolId]
  );
  const { data: identity, isLoading: identityLoading } = useDoc(identityRef);
  const { data: branding } = useDoc(brandingRef);

  // useDoc reports isLoading=false on its very first render, before its effect
  // runs. Without this flag the chrome would show the fallback sample identity
  // for a frame — a different school's name and an invented motto.
  const [booted, setBooted] = React.useState(false);
  React.useEffect(() => setBooted(true), []);
  const ready = booted && !identityLoading;

  const brand = React.useMemo(() => resolveBrand(identity as any, branding as any), [identity, branding]);

  // Publish on commit, before any export button can be pressed. Kept out of
  // render so subscribers can safely set their own state.
  React.useEffect(() => {
    setActiveBrand(brand);
  }, [brand]);

  const logoSrc = useMediaSrc(brand.logo);
  const value = React.useMemo(() => ({ brand, logoSrc, ready }), [brand, logoSrc, ready]);

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useSchoolBrand(): BrandValue {
  const context = React.useContext(BrandContext);
  // Public pages and tests render outside the shell; they get the neutral brand
  // rather than throwing.
  return context ?? { brand: DEFAULT_BRAND, logoSrc: '', ready: false };
}
