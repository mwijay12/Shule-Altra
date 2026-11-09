"use client"

import * as React from "react"
import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/utils"

/**
 * Landing photography can be a static file, a Cloudinary/Firebase URL, an
 * object URL resolved from the demo's IndexedDB, or an inline data URL. The
 * latter two must bypass the image optimizer, which cannot fetch them.
 */
export function LandingImage({ src, alt, fill, className, ...props }: ImageProps) {
  // Optimizer cannot fetch inline data or in-memory demo blobs.
  if (typeof src === 'string' && (src.startsWith('data:') || src.startsWith('blob:'))) {
    const { priority, sizes, ...rest } = props as any
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        className={cn(fill && 'absolute inset-0 h-full w-full object-cover', className)}
        {...rest}
      />
    )
  }
  return <Image src={src} alt={alt} fill={fill} className={className} {...props} />
}
