"use client"

/**
 * @fileOverview Resolve demo media references into renderable URLs.
 *
 * In the offline demo an uploaded photograph lives in IndexedDB and the content
 * document holds `demo-media:<key>`. Neither next/image nor <img> can render
 * that, so the reference is swapped for an object URL at render time. When the
 * blob is gone (purged dataset, different browser profile) we fall back to the
 * shipped placeholder rather than showing a broken image.
 */

import * as React from "react"
import { demoMediaKey, getDemoMedia, isDemoMediaRef } from "@/lib/demo/media-store"

type ImageLike = { src: string; alt: string }

/** Resolve one src. Non-demo sources (static paths, https, data URLs) pass through. */
export function useMediaSrc(src: string, fallback = ""): string {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isDemoMediaRef(src)) {
      setUrl(null)
      return
    }
    let cancelled = false
    let objectUrl: string | null = null
    void getDemoMedia(demoMediaKey(src)).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (!isDemoMediaRef(src)) return src
  return url ?? fallback
}

/**
 * Resolve every demo-media reference in an image map. `fallbacks` supplies the
 * shipped placeholder for slots whose blob is missing or still loading.
 */
export function useResolvedImageMap<T extends Record<string, ImageLike>>(images: T, fallbacks: T): T {
  const [resolved, setResolved] = React.useState<Record<string, string>>({})

  // Only the references matter; content objects are re-created on every merge.
  const refsKey = JSON.stringify(
    Object.keys(images)
      .filter((slot) => isDemoMediaRef(images[slot].src))
      .map((slot) => [slot, images[slot].src])
  )

  React.useEffect(() => {
    const entries = Object.keys(images).filter((slot) => isDemoMediaRef(images[slot].src))
    setResolved((previous) => (Object.keys(previous).length ? {} : previous))
    if (!entries.length) return

    let cancelled = false
    const created: string[] = []
    void (async () => {
      const next: Record<string, string> = {}
      for (const slot of entries) {
        const blob = await getDemoMedia(demoMediaKey(images[slot].src))
        if (cancelled) break
        if (blob) {
          const objectUrl = URL.createObjectURL(blob)
          created.push(objectUrl)
          next[slot] = objectUrl
        }
      }
      if (!cancelled) setResolved(next)
    })()

    return () => {
      cancelled = true
      created.forEach((objectUrl) => URL.revokeObjectURL(objectUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refsKey])

  return React.useMemo(() => {
    let changed = false
    const out: Record<string, ImageLike> = { ...images }
    for (const slot of Object.keys(images)) {
      if (!isDemoMediaRef(images[slot].src)) continue
      const url = resolved[slot] ?? fallbacks[slot]?.src
      if (!url) continue
      out[slot] = { ...images[slot], src: url }
      changed = true
    }
    return changed ? (out as T) : images
  }, [images, resolved, fallbacks])
}
