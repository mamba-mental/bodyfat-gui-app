"use client"

import { useEffect, useState, useRef } from 'react'

/**
 * Hook for handling browser extension conflicts safely
 * Provides utilities for components that might be affected by extensions like DarkReader
 */
export function useExtensionSafe() {
  const [isClient, setIsClient] = useState(false)
  const [hasExtensions, setHasExtensions] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Detect common extensions by checking for their attributes
    const checkForExtensions = () => {
      const html = document.documentElement
      const extensionSignatures = [
        'data-darkreader-mode',
        'data-darkreader-scheme', 
        'data-nighteye',
        'data-night-mode',
        'data-color-scheme',
      ]
      
      const detected = extensionSignatures.some(attr => html.hasAttribute(attr))
      setHasExtensions(detected)
      
      // Log for debugging (only in development)
      if (process.env.NODE_ENV === 'development' && detected) {
        console.info('[ExtensionSafe] Browser extension detected, hydration safety measures active')
      }
    }

    // Check immediately and periodically (extensions may inject attributes after page load)
    checkForExtensions()
    const interval = setInterval(checkForExtensions, 1000)
    
    // Clear interval after 10 seconds (extensions usually inject quickly)
    setTimeout(() => clearInterval(interval), 10000)
    
    return () => clearInterval(interval)
  }, [])

  // Function to safely modify DOM without conflicts
  const safeModify = (callback: () => void) => {
    if (!isClient) return
    
    // Use requestAnimationFrame to ensure DOM stability
    requestAnimationFrame(() => {
      try {
        callback()
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[ExtensionSafe] DOM modification failed, likely extension conflict:', error)
        }
      }
    })
  }

  // Function to clean up extension attributes that might cause conflicts
  const cleanupExtensionAttributes = (element?: HTMLElement) => {
    const target = element || elementRef.current
    if (!target || !isClient) return

    safeModify(() => {
      const extensionAttributes = [
        'data-darkreader-mode',
        'data-darkreader-scheme', 
        'data-nighteye',
        'data-night-mode',
      ]
      
      extensionAttributes.forEach(attr => {
        if (target.hasAttribute(attr)) {
          // Don't remove the attribute, just mark it as extension-managed
          target.setAttribute(`${attr}-managed`, 'true')
        }
      })
    })
  }

  return {
    isClient,
    hasExtensions,
    elementRef,
    safeModify,
    cleanupExtensionAttributes,
  }
}