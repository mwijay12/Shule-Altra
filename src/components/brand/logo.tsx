"use client"

/**
 * @fileOverview The Shule Altra mark.
 *
 * One shape only: a shield (the institution) with a check struck through it
 * (the record verified), cut from a plate tinted by the active palette. It replaces
 * three different hand-rolled marks that had drifted apart (CSS clip-path on
 * the landing, a lucide shield in the sidebar, a float-animated square on the
 * login screen), so the brand is identical at 28px and at 80px.
 */

import * as React from "react"
import { cn } from "@/lib/utils"

export function BrandMark({
  className,
  size = 40,
  radius = 12,
  subtle = false,
}: {
  className?: string
  size?: number
  radius?: number
  /** flat ink plate instead of the gradient, for busy surfaces */
  subtle?: boolean
}) {
  const id = React.useId().replace(/[:]/g, "")
  const plate = subtle ? "hsl(var(--foreground))" : `url(#altra-${id})`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="Shule Altra"
      className={cn("shrink-0", className)}
    >
      {!subtle ? (
        <defs>
          <linearGradient id={`altra-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="hsl(var(--primary))" />
            <stop offset="1" stopColor="hsl(var(--accent))" />
          </linearGradient>
        </defs>
      ) : null}

      <rect width="40" height="40" rx={radius} fill={plate} />

      <path
        d="M20 8.2 31 11.9v9.7c0 5.3-4.6 8.6-11 10.7-6.4-2.1-11-5.4-11-10.7v-9.7z"
        fill={subtle ? "hsl(var(--background))" : "#ffffff"}
        opacity={subtle ? 0.96 : 0.97}
      />

      <path
        d="m14.9 20.4 3.5 3.6 6.9-7.6"
        fill="none"
        stroke={subtle ? "hsl(var(--foreground))" : `url(#altra-${id})`}
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Wordmark: "Shule Altra" in ink with the second word carrying the gradient. */
export function Wordmark({
  className,
  size = 16,
  pro = false,
  onDark = false,
}: {
  className?: string
  size?: number
  pro?: boolean
  /** light gradient + light chip, for the navy boot screen and dark surfaces */
  onDark?: boolean
}) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-[0.3em] font-black tracking-tight", className)}
      style={{ fontSize: size }}
    >
      <span>Shule</span>
      <span
        className={cn(
          "bg-gradient-to-r bg-clip-text text-transparent",
          onDark ? "from-[#a8cdff] to-[#d2c6ff]" : "from-primary to-accent"
        )}
      >
        Altra
      </span>
      {pro ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-[0.1em] text-[0.62em] font-black uppercase tracking-[0.14em]",
            onDark ? "bg-white/12 text-white/75" : "bg-foreground/8 text-foreground/70"
          )}
        >
          Pro
        </span>
      ) : null}
    </span>
  )
}
