"use client"

import { DependencyList, useCallback, useEffect, useRef } from "react"

/**
 * Hook to safely handle animation completion and other async callbacks
 * Prevents state updates on unmounted components and during render cycles
 *
 * @param callback - The callback function to execute safely
 * @param dependencies - Dependencies array for the callback
 * @returns A safe callback that checks mounting and animation state
 */
export function useSafeAnimationCallback<T extends any[]>(
  callback: (...args: T) => void,
  dependencies: DependencyList = []
) {
  const isMounted = useRef(true)
  const isProcessing = useRef(false)
  const pendingQueue = useRef<T[]>([])
  const frameId = useRef<number | null>(null)
  const latestCallbackRef = useRef(callback)

  // Keep the latest callback and dependencies in sync without changing the returned handler identity
  useEffect(() => {
    latestCallbackRef.current = callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...dependencies])

  // Track component mount state
  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
      // Clean up any pending animation frame
      if (frameId.current !== null) {
        cancelAnimationFrame(frameId.current)
        frameId.current = null
      }
      isProcessing.current = false
      pendingQueue.current = []
    }
  }, [])

  // Create the safe callback
  const safeCallback = useCallback((...args: T) => {
    if (!isMounted.current) {
      return
    }

    // Queue the incoming arguments for ordered processing
    pendingQueue.current.push(args)

    // If we're already scheduled or processing, the current queue will be handled
    if (frameId.current !== null || isProcessing.current) {
      return
    }

    const processQueue = () => {
      frameId.current = null

      if (!isMounted.current) {
        pendingQueue.current = []
        isProcessing.current = false
        return
      }

      const nextArgs = pendingQueue.current.shift()

      if (!nextArgs) {
        isProcessing.current = false
        return
      }

      try {
        latestCallbackRef.current(...nextArgs)
      } catch (error) {
        console.error("Error in safe animation callback:", error)
      }

      if (!isMounted.current) {
        pendingQueue.current = []
        return
      }

      if (pendingQueue.current.length > 0) {
        if (frameId.current === null) {
          frameId.current = requestAnimationFrame(processQueue)
        }
      } else {
        isProcessing.current = false
      }
    }

    isProcessing.current = true
    frameId.current = requestAnimationFrame(processQueue)
  }, [])

  return safeCallback
}

/**
 * Hook to debounce rapid updates with mount safety
 * Useful for preventing excessive re-renders from rapid data changes
 *
 * @param callback - The callback to debounce
 * @param delay - Debounce delay in milliseconds
 * @param dependencies - Dependencies array for the callback
 * @returns A debounced safe callback
 */
export function useDebouncedCallback<T extends any[]>(
  callback: (...args: T) => void,
  delay: number,
  dependencies: DependencyList = []
) {
  const isMounted = useRef(true)
  const timeoutId = useRef<NodeJS.Timeout | null>(null)
  const pendingArgs = useRef<T | null>(null)
  const latestCallbackRef = useRef(callback)
  const delayRef = useRef(delay)

  useEffect(() => {
    latestCallbackRef.current = callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...dependencies])

  useEffect(() => {
    delayRef.current = delay
  }, [delay])

  // Track component mount state
  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
      // Clear any pending timeout
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
        timeoutId.current = null
      }
    }
  }, [])

  const debouncedCallback = useCallback((...args: T) => {
    // Store the latest arguments
    pendingArgs.current = args

    // Clear existing timeout
    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }

    // Set new timeout
    timeoutId.current = setTimeout(() => {
      if (isMounted.current && pendingArgs.current) {
        // Use requestAnimationFrame for the actual update
        requestAnimationFrame(() => {
          if (isMounted.current && pendingArgs.current) {
            try {
              latestCallbackRef.current(...pendingArgs.current)
            } catch (error) {
              console.error("Error in debounced callback:", error)
            } finally {
              pendingArgs.current = null
              timeoutId.current = null
            }
          }
        })
      }
    }, delayRef.current)
  }, [])

  return debouncedCallback
}
