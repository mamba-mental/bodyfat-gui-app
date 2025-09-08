import { cn } from "@/lib/utils"

interface SkeletonProps extends React.ComponentProps<"div"> {
  /** Screen reader description of what's loading */
  loadingText?: string
  /** Whether to announce loading state to screen readers */
  announceLoading?: boolean
}

function Skeleton({ 
  className, 
  loadingText = "Loading content", 
  announceLoading = false,
  ...props 
}: SkeletonProps) {
  return (
    <>
      {announceLoading && (
        <div className="sr-announcer" aria-live="polite" role="status">
          {loadingText}
        </div>
      )}
      <div
        data-slot="skeleton"
        className={cn(
          "bg-accent animate-pulse rounded-md relative",
          "before:absolute before:inset-0 before:bg-gradient-to-r",
          "before:from-transparent before:via-white/20 before:to-transparent",
          "before:animate-shimmer before:transform-gpu",
          className
        )}
        aria-label={loadingText}
        aria-hidden={!announceLoading}
        role={announceLoading ? "status" : undefined}
        {...props}
      />
    </>
  )
}

export { Skeleton }
