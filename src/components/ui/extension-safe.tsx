"use client"

import React, { useEffect, useRef } from 'react'
import { NoSSR } from './no-ssr'

interface ExtensionSafeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  as?: keyof React.JSX.IntrinsicElements
  fallback?: React.ReactNode
}

/**
 * ExtensionSafe Component - Wraps elements that might be modified by browser extensions
 * Prevents hydration mismatches by suppressing hydration warnings and using client-only rendering
 */
export function ExtensionSafe({ 
  children, 
  as: Component = 'div', 
  fallback = null,
  className,
  ...props 
}: ExtensionSafeProps) {
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Clean up any extension-injected attributes after mount
    // This helps prevent conflicts with app state
    const element = elementRef.current
    if (element) {
      // Remove common extension attributes that might cause issues
      const extensionAttributes = [
        'data-darkreader-mode',
        'data-darkreader-scheme', 
        'data-nighteye',
        'data-night-mode',
        'data-color-scheme',
        'data-theme',
      ]
      
      // Use requestAnimationFrame to ensure DOM is stable
      requestAnimationFrame(() => {
        extensionAttributes.forEach(attr => {
          if (element.hasAttribute(attr)) {
            // Don't remove, just mark as extension-managed
            element.setAttribute(`${attr}-ext-managed`, 'true')
          }
        })
      })
    }
  }, [])

  return (
    <NoSSR fallback={fallback}>
      {React.createElement(
        Component,
        {
          ref: elementRef,
          className,
          suppressHydrationWarning: true,
          ...props,
        },
        children
      )}
    </NoSSR>
  )
}