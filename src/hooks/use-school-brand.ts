'use client';

/**
 * @fileOverview One resolved school brand for the whole dashboard.
 *
 * Reads the two config documents the school actually edits, folds them into a
 * SchoolBrand, and publishes it to the PDF kit. Mounted once in the shell, so by
 * the time anyone presses "Download report" the letterhead already knows the
 * school's current name, logo and colours.
 */

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { resolveBrand, setActiveBrand, type SchoolBrand } from '@/lib/brand/identity';
import { useMediaSrc } from '@/components/landing/use-media-src';

export function useSchoolBrand(schoolId = 'school-001'): { brand: SchoolBrand; logoSrc: string } {
  const db = useFirestore();
  const identityRef = useMemoFirebase(
    () => doc(db, 'schools', schoolId, 'config', 'identity'),
    [db, schoolId]
  );
  const brandingRef = useMemoFirebase(
    () => doc(db, 'schools', schoolId, 'config', 'branding'),
    [db, schoolId]
  );
  const { data: identity } = useDoc(identityRef);
  const { data: branding } = useDoc(brandingRef);

  const brand = React.useMemo(() => resolveBrand(identity as any, branding as any), [identity, branding]);

  // Publish to the document builders on commit, before any export button can be
  // pressed. Kept out of render so subscribers can safely set their own state.
  React.useEffect(() => {
    setActiveBrand(brand);
  }, [brand]);

  const logoSrc = useMediaSrc(brand.logo);
  return { brand, logoSrc };
}
