"use client"

/**
 * @fileOverview The Shule Altra mark.
 *
 * One shape only: a shield (the institution) with a check struck through it
 * (the record verified), cut from a blue → violet gradient plate. It replaces
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
  /** flat ink plate instead of the gradient — for busy surfaces */
  subtle?: boolean
}) {
  const id = React.useId().replace(/[:]/g, "")
  const plate = subtle ? "#141428" : `url(#altra-${id})`

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
            <stop offset="0" stopColor="#1f5ba6" />
            <stop offset="1" stopColor="#7c5ae0" />
          </linearGradient>
        </defs>
      ) : null}

      <rect width="40" height="40" rx={radius} fill={plate} />

      <path
        d="M20 8.2 31 11.9v9.7c0 5.3-4.6 8.6-11 10.7-6.4-2.1-11-5.4-11-10.7v-9.7z"
        fill={subtle ? "#f8f7ff" : "#ffffff"}
        opacity={subtle ? 0.96 : 0.97}
      />

      <path
        d="m14.9 20.4 3.5 3.6 6.9-7.6"
        fill="none"
        stroke={subtle ? "#141428" : `url(#altra-${id})`}
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
}: {
  className?: string
  size?: number
  pro?: boolean
}) {
  return (
    <span
      className={cn("inline-flex items-baseline gap-[0.3em] font-black tracking-tight", className)}
      style={{ fontSize: size }}
    >
      <span>Shule</span>
      <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
        Altra
      </span>
      {pro ? (
        <span className="rounded-full bg-foreground/8 px-1.5 py-[0.1em] text-[0.62em] font-black uppercase tracking-[0.14em] text-foreground/70">
          Pro
        </span>
      ) : null}
    </span>
  )
}
