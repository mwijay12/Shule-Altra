'use client';

/**
 * @fileOverview The mark shown in the chrome: the school's uploaded logo when it
 * has one, otherwise the Shule Altra shield tinted with the active palette.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/brand/logo';
import { useMediaSrc } from '@/components/landing/use-media-src';

export function SchoolLogo({
  src,
  name,
  size = 40,
  radius = 12,
  className,
}: {
  /** Raw logo reference (may be a demo-media ref). */
  src?: string;
  name?: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const resolved = useMediaSrc(src ?? '');
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => setFailed(false), [resolved]);

  if (!resolved || failed) {
    return <BrandMark size={size} radius={radius} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={name ? `${name} logo` : 'School logo'}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn('shrink-0 object-contain', className)}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}
