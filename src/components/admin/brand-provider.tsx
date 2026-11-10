'use client';

/**
 * @fileOverview One resolved school brand for the whole dashboard.
 *
 * Combines the school's identity with the active workstation theme and publishes
 * it to the document kit. A local preview affects exports here; publishing the
 * theme applies it to other workstations.
 *
 * Mounted once in the shell, so by the time anyone presses "Download report" the
 * letterhead already knows the school's current name, logo and colours.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { DEFAULT_BRAND, resolveBrand, setActiveBrand, type SchoolBrand } from '@/lib/brand/identity';
import { useTheme } from '@/components/admin/theme-provider';
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
  const { data: identity, isLoading: identityLoading } = useDoc(identityRef);
  // Exports from this workstation follow the same live preview as its dashboard.
  const { paletteId, fontId } = useTheme();

  // useDoc reports isLoading=false on its very first render, before its effect
  // runs. Without this flag the chrome would show the fallback sample identity
  // for a frame, a different school's name and an invented motto.
  const [booted, setBooted] = React.useState(false);
  React.useEffect(() => setBooted(true), []);
  const ready = booted && !identityLoading;

  const brand = React.useMemo(() => resolveBrand(identity as any, { paletteId, fontId }), [identity, paletteId, fontId]);

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
