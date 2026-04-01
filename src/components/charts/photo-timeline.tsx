"use client"

import * as React from "react"
import { Camera, ChevronLeft, ChevronRight, ImageOff } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"
import { useMountedRef } from "@/hooks/use-mounted-ref"
import { BodyFatEntry } from "@/types"

const MAX_PHOTOS_DISPLAYED = 10

interface PhotoEntry {
  entry: BodyFatEntry
  dateLabel: string
  fullDateLabel: string
}

export function PhotoTimeline() {
  const { state, subscribeToDataChanges } = useApp()
  const { entries } = state
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [selectedPhoto, setSelectedPhoto] = React.useState<PhotoEntry | null>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const mountedRef = useMountedRef()

  const handleDataChange = useSafeAnimationCallback(() => {
    if (mountedRef.current) {
      setRefreshKey(prev => prev + 1)
    }
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])

  const photoEntries = React.useMemo((): PhotoEntry[] => {
    const withPhotos = entries
      .filter((entry) => entry.photo && entry.photo.length > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, MAX_PHOTOS_DISPLAYED)

    return withPhotos.map((entry) => {
      const date = new Date(entry.date)
      return {
        entry,
        dateLabel: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDateLabel: date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      }
    })
  }, [entries, refreshKey])

  const scrollBy = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return
    const scrollAmount = 200
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  // Placeholder state when no photos exist
  const hasPhotos = photoEntries.length > 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Photo Progress Timeline</CardTitle>
              <CardDescription>
                {hasPhotos
                  ? `${photoEntries.length} progress photo${photoEntries.length !== 1 ? "s" : ""} - click to expand`
                  : "Upload progress photos with your entries to track visual changes"}
              </CardDescription>
            </div>
            {hasPhotos && (
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => scrollBy("left")}
                  aria-label="Scroll photos left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => scrollBy("right")}
                  aria-label="Scroll photos right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {hasPhotos ? (
            <div
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto pb-2 scroll-smooth"
              style={{ scrollbarWidth: "thin" }}
            >
              {photoEntries.map((photoEntry) => (
                <button
                  key={photoEntry.entry.id}
                  className="flex-shrink-0 group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedPhoto(photoEntry)}
                  aria-label={`View progress photo from ${photoEntry.fullDateLabel}`}
                >
                  <div className="w-[120px] h-[160px] relative">
                    <img
                      src={photoEntry.entry.photo}
                      alt={`Progress photo from ${photoEntry.dateLabel}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Date overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <span className="text-white text-xs font-medium">
                        {photoEntry.dateLabel}
                      </span>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <ImageOff className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No progress photos yet</p>
              <p className="text-sm text-center max-w-md">
                Add a photo when creating a new entry to build your visual timeline.
                Photos help you see changes that the scale cannot capture.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expanded photo dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Progress Photo - {selectedPhoto?.fullDateLabel}
            </DialogTitle>
            <DialogDescription>
              Entry details and measurements for this date
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              {/* Photo */}
              <div className="relative w-full max-h-[60vh] overflow-hidden rounded-lg">
                <img
                  src={selectedPhoto.entry.photo}
                  alt={`Full progress photo from ${selectedPhoto.fullDateLabel}`}
                  className="w-full h-auto object-contain max-h-[60vh]"
                />
              </div>

              {/* Stats overlay */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="text-sm">
                  Weight: {selectedPhoto.entry.weight.toFixed(1)} lbs
                </Badge>
                {selectedPhoto.entry.body_fat_percentage != null && (
                  <Badge variant="secondary" className="text-sm">
                    Body Fat: {selectedPhoto.entry.body_fat_percentage.toFixed(1)}%
                  </Badge>
                )}
                {selectedPhoto.entry.notes && (
                  <Badge variant="outline" className="text-sm">
                    {selectedPhoto.entry.notes}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
