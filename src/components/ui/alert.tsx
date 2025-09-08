import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/30 [&>svg]:text-destructive *:data-[slot=alert-description]:text-destructive/90",
        success:
          "bg-success/10 text-success border-success/30 [&>svg]:text-success *:data-[slot=alert-description]:text-success/90",
        warning:
          "bg-warning/10 text-warning border-warning/30 [&>svg]:text-warning *:data-[slot=alert-description]:text-warning/90",
        info:
          "bg-info/10 text-info border-info/30 [&>svg]:text-info *:data-[slot=alert-description]:text-info/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  /** Whether to announce this alert to screen readers immediately */
  announce?: boolean
  /** Custom aria-label for the alert */
  ariaLabel?: string
}

function Alert({
  className,
  variant,
  announce = true,
  ariaLabel,
  children,
  ...props
}: AlertProps) {
  const alertRef = React.useRef<HTMLDivElement>(null)
  
  // Announce alert content to screen readers if requested
  React.useEffect(() => {
    if (announce && alertRef.current) {
      const textContent = alertRef.current.textContent || ''
      if (textContent.trim()) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          const announcer = document.createElement('div')
          announcer.setAttribute('aria-live', variant === 'destructive' ? 'assertive' : 'polite')
          announcer.setAttribute('aria-atomic', 'true')
          announcer.className = 'sr-announcer'
          announcer.textContent = textContent
          document.body.appendChild(announcer)
          
          // Clean up
          setTimeout(() => {
            if (document.body.contains(announcer)) {
              document.body.removeChild(announcer)
            }
          }, 1000)
        }, 100)
      }
    }
  }, [announce, variant, children])

  return (
    <div
      ref={alertRef}
      data-slot="alert"
      role="alert"
      aria-label={ariaLabel}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
