"use client"

import { useCallback, useRef } from 'react'

export type AnnouncementPriority = 'polite' | 'assertive'

interface AnnouncementOptions {
  priority?: AnnouncementPriority
  delay?: number
  clearPrevious?: boolean
}

export function useAnnouncements() {
  const announcerRef = useRef<HTMLDivElement | null>(null)

  const announce = useCallback((
    message: string, 
    options: AnnouncementOptions = {}
  ) => {
    const {
      priority = 'polite',
      delay = 100,
      clearPrevious = true
    } = options

    // Clear previous announcer if requested
    if (clearPrevious && announcerRef.current) {
      document.body.removeChild(announcerRef.current)
      announcerRef.current = null
    }

    // Create announcer element
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.setAttribute('role', 'status')
    announcer.className = 'sr-announcer'
    
    // Add to DOM
    document.body.appendChild(announcer)
    announcerRef.current = announcer

    // Announce after delay to ensure screen readers pick it up
    setTimeout(() => {
      if (announcer && document.body.contains(announcer)) {
        announcer.textContent = message
        
        // Clean up after announcement
        setTimeout(() => {
          if (document.body.contains(announcer)) {
            document.body.removeChild(announcer)
            if (announcerRef.current === announcer) {
              announcerRef.current = null
            }
          }
        }, 3000) // Keep announcement for 3 seconds
      }
    }, delay)
  }, [])

  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`, { priority: 'polite' })
  }, [announce])

  const announceError = useCallback((message: string) => {
    announce(`Error: ${message}`, { priority: 'assertive' })
  }, [announce])

  const announceInfo = useCallback((message: string) => {
    announce(`Information: ${message}`, { priority: 'polite' })
  }, [announce])

  const announceWarning = useCallback((message: string) => {
    announce(`Warning: ${message}`, { priority: 'assertive' })
  }, [announce])

  const announceProgress = useCallback((message: string) => {
    announce(message, { priority: 'polite', delay: 200 })
  }, [announce])

  return {
    announce,
    announceSuccess,
    announceError,
    announceInfo,
    announceWarning,
    announceProgress
  }
}