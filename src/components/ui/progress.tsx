"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  max?: number
  /** Descriptive label for what this progress represents */
  label?: string
  /** Whether to announce progress changes to screen readers */
  announceChanges?: boolean
  /** Custom format function for progress announcement */
  formatProgress?: (value: number, max: number) => string
}

function Progress({
  className,
  value,
  max = 100,
  label,
  announceChanges = false,
  formatProgress,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value || 0) / max * 100, 0), 100)
  const [prevValue, setPrevValue] = React.useState(value)
  
  // Default progress formatter
  const defaultFormatter = React.useCallback((val: number, maxVal: number) => {
    const percent = Math.min(Math.max((val || 0) / maxVal * 100, 0), 100)
    return `${label || 'Progress'}: ${percent.toFixed(1)}% complete`
  }, [label])
  
  const formatter = formatProgress || defaultFormatter
  
  // Announce progress changes to screen readers
  React.useEffect(() => {
    if (announceChanges && value !== prevValue && value !== undefined) {
      const announcement = formatter(value || 0, max)
      // Create a temporary element for announcement
      const announcer = document.createElement('div')
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-announcer'
      announcer.textContent = announcement
      document.body.appendChild(announcer)
      
      // Clean up after announcement
      setTimeout(() => {
        if (document.body.contains(announcer)) {
          document.body.removeChild(announcer)
        }
      }, 1000)
      
      setPrevValue(value)
    }
  }, [value, prevValue, announceChanges, formatter, max])
  
  const progressLabel = label || 'Progress'
  const ariaLabel = `${progressLabel}: ${percentage.toFixed(1)}% complete`
  
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-3 w-full overflow-hidden rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      value={value}
      max={max}
      aria-label={ariaLabel}
      aria-valuetext={formatter(value || 0, max)}
      role="progressbar"
      tabIndex={0}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all duration-300 ease-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
        aria-hidden="true"
      />
      {/* Visual percentage for high contrast mode */}
      <div 
        className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-75"
        aria-hidden="true"
      >
        {percentage > 15 && `${percentage.toFixed(0)}%`}
      </div>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
