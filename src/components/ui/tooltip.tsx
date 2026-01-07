"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

interface TooltipContentProps extends React.ComponentProps<typeof TooltipPrimitive.Content> {
  /** Whether to announce tooltip content to screen readers when shown */
  announceOnShow?: boolean
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  announceOnShow = false,
  ...props
}: TooltipContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = React.useState(false)

  // Handle visibility changes for screen reader announcements
  React.useEffect(() => {
    if (announceOnShow && isVisible && contentRef.current) {
      const textContent = contentRef.current.textContent || ''
      if (textContent.trim()) {
        const announcer = document.createElement('div')
        announcer.setAttribute('aria-live', 'polite')
        announcer.setAttribute('aria-atomic', 'true')
        announcer.className = 'sr-announcer'
        announcer.textContent = `Tooltip: ${textContent}`
        document.body.appendChild(announcer)
        
        setTimeout(() => {
          if (document.body.contains(announcer)) {
            document.body.removeChild(announcer)
          }
        }, 2000)
      }
    }
  }, [isVisible, announceOnShow])

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={contentRef}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-2 text-xs text-balance shadow-lg border border-primary/20",
          className
        )}
        role="tooltip"
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

// Enhanced Tooltip component with accessibility improvements
interface AccessibleTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  /** Whether to announce content to screen readers */
  announce?: boolean
  /** Delay before showing tooltip in milliseconds */
  delayDuration?: number
  /** Alternative text for screen readers when tooltip isn't shown */
  ariaLabel?: string
}

function AccessibleTooltip({
  content,
  children,
  announce = false,
  delayDuration = 300,
  ariaLabel,
  ...props
}: AccessibleTooltipProps) {
  const tooltipId = React.useId()
  
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props}>
        <TooltipTrigger asChild>
          <div
            aria-describedby={tooltipId}
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={(e) => {
              // Allow Enter/Space to trigger tooltip for keyboard users
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
              }
            }}
          >
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent 
          id={tooltipId}
          announceOnShow={announce}
          side="top"
          align="center"
        >
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipProvider>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, AccessibleTooltip }
