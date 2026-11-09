"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { useReducedMotion } from "@/hooks/use-reduced-motion"
import { cn } from "@/lib/utils"

function useProgressValue(value: number | null | undefined) {
  const reducedMotion = useReducedMotion()
  const target = typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null
  const [visual, setVisual] = React.useState(0)

  React.useEffect(() => {
    if (reducedMotion) {
      setVisual(target ?? 0)
      return
    }
    // Paint the empty track first, then let the compositor animate the fill.
    const frame = window.requestAnimationFrame(() => setVisual(target ?? 0))
    return () => window.cancelAnimationFrame(frame)
  }, [target, reducedMotion])

  return { target, visual: reducedMotion ? target ?? 0 : visual }
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }
>(({ className, value, indicatorClassName, ...props }, ref) => {
  const { target, visual } = useProgressValue(value)
  return (
    <ProgressPrimitive.Root
      ref={ref}
      data-slot="progress"
      value={target}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 bg-primary transition-transform duration-700 ease-out motion-reduce:transition-none",
          indicatorClassName
        )}
        style={{ transform: `translateX(-${100 - visual}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

interface SegmentedProgressProps {
  segments: Array<{ value: number; className: string; label: string }>
  label: string
  className?: string
}

/** A distribution bar whose segments grow together when their tab is opened. */
export function SegmentedProgress({ segments, label, className }: SegmentedProgressProps) {
  const { visual } = useProgressValue(100)
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  const description = segments
    .map((segment) => `${segment.label} ${Math.round(segment.value)}%`)
    .join(", ")

  return (
    <div
      role="img"
      aria-label={`${label}: ${description}`}
      data-slot="segmented-progress"
      className={cn("flex h-2 gap-1 overflow-hidden rounded-full bg-muted/30", className)}
    >
      {segments.map((segment) => (
        <div
          key={segment.label}
          title={`${segment.label}: ${Math.round(segment.value)}%`}
          className={cn("h-full transition-[width] duration-700 ease-out motion-reduce:transition-none", segment.className)}
          style={{ width: `${total > 0 ? Math.max(0, segment.value) / total * visual : 0}%` }}
        />
      ))}
    </div>
  )
}

export { Progress }
