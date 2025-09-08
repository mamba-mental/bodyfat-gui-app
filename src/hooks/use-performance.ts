/**
 * Performance monitoring hook for React components
 * Tracks Core Web Vitals, component render times, and API performance
 */

import { useEffect, useRef, useState, useCallback } from 'react'

interface PerformanceMetrics {
  renderTime: number
  mountTime: number
  updateCount: number
  lastUpdate: number
}

interface WebVitals {
  CLS: number | null
  FID: number | null
  FCP: number | null
  LCP: number | null
  TTFB: number | null
}

export function usePerformanceMonitor(componentName?: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    updateCount: 0,
    lastUpdate: 0
  })

  const renderStartTime = useRef<number>(0)
  const mountTime = useRef<number>(0)
  const updateCount = useRef<number>(0)

  // Track component mount time
  useEffect(() => {
    mountTime.current = performance.now()
    
    return () => {
      const unmountTime = performance.now()
      if (componentName && process.env.NODE_ENV === 'development') {
        console.log(`Component ${componentName} lifecycle: ${(unmountTime - mountTime.current).toFixed(2)}ms`)
      }
    }
  }, [componentName])

  // Track render performance
  useEffect(() => {
    const renderEndTime = performance.now()
    const renderTime = renderEndTime - renderStartTime.current
    
    updateCount.current += 1
    
    setMetrics(prev => ({
      renderTime,
      mountTime: mountTime.current,
      updateCount: updateCount.current,
      lastUpdate: renderEndTime
    }))

    if (componentName && process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`)
    }
  })

  // Mark render start
  renderStartTime.current = performance.now()

  return metrics
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitals>({
    CLS: null,
    FID: null,
    FCP: null,
    LCP: null,
    TTFB: null
  })

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Import web-vitals dynamically to avoid SSR issues
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        setVitals(prev => ({ ...prev, CLS: metric.value }))
      })

      getFID((metric) => {
        setVitals(prev => ({ ...prev, FID: metric.value }))
      })

      getFCP((metric) => {
        setVitals(prev => ({ ...prev, FCP: metric.value }))
      })

      getLCP((metric) => {
        setVitals(prev => ({ ...prev, LCP: metric.value }))
      })

      getTTFB((metric) => {
        setVitals(prev => ({ ...prev, TTFB: metric.value }))
      })
    }).catch(() => {
      // web-vitals not available, ignore
    })
  }, [])

  return vitals
}

export function useAPIPerformance() {
  const [apiMetrics, setApiMetrics] = useState({
    activeRequests: 0,
    averageResponseTime: 0,
    requestCount: 0,
    errorCount: 0
  })

  const requestTimes = useRef<number[]>([])
  const activeRequests = useRef<Set<string>>(new Set())

  const trackRequest = useCallback((url: string) => {
    const requestId = `${Date.now()}-${Math.random()}`
    const startTime = performance.now()
    
    activeRequests.current.add(requestId)
    setApiMetrics(prev => ({ ...prev, activeRequests: prev.activeRequests + 1 }))

    return {
      finish: (success: boolean = true) => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        activeRequests.current.delete(requestId)
        requestTimes.current.push(duration)
        
        // Keep only last 50 request times
        if (requestTimes.current.length > 50) {
          requestTimes.current = requestTimes.current.slice(-50)
        }

        const avgTime = requestTimes.current.reduce((a, b) => a + b, 0) / requestTimes.current.length

        setApiMetrics(prev => ({
          activeRequests: prev.activeRequests - 1,
          averageResponseTime: avgTime,
          requestCount: prev.requestCount + 1,
          errorCount: success ? prev.errorCount : prev.errorCount + 1
        }))

        if (process.env.NODE_ENV === 'development') {
          if (duration > 1000) {
            console.warn(`Slow API request to ${url}: ${duration.toFixed(2)}ms`)
          }
        }
      }
    }
  }, [])

  return { apiMetrics, trackRequest }
}

// Hook for lazy loading intersection observer
export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || hasLoaded) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '50px' }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [threshold, hasLoaded])

  return { ref, isVisible, hasLoaded }
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null>(null)

  useEffect(() => {
    // Check if performance.memory is available
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return
    }

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory
      setMemoryInfo({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      })
    }

    updateMemoryInfo()
    
    // Update every 30 seconds
    const interval = setInterval(updateMemoryInfo, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const memoryUsagePercent = memoryInfo 
    ? (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100
    : 0

  return {
    memoryInfo,
    memoryUsagePercent,
    isHighMemoryUsage: memoryUsagePercent > 75
  }
}

// Bundle for all performance hooks
export function usePerformanceBundle(componentName?: string) {
  const renderMetrics = usePerformanceMonitor(componentName)
  const webVitals = useWebVitals()
  const { apiMetrics, trackRequest } = useAPIPerformance()
  const { memoryInfo, memoryUsagePercent, isHighMemoryUsage } = useMemoryMonitor()

  return {
    renderMetrics,
    webVitals,
    apiMetrics,
    trackRequest,
    memoryInfo,
    memoryUsagePercent,
    isHighMemoryUsage
  }
}