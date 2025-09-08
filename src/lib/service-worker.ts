/**
 * Service Worker registration and management
 */

interface ServiceWorkerAPI {
  register: () => Promise<ServiceWorkerRegistration | null>
  unregister: () => Promise<boolean>
  getCacheStats: () => Promise<any>
  clearCache: () => Promise<boolean>
  checkForUpdates: () => Promise<boolean>
}

class ServiceWorkerManager implements ServiceWorkerAPI {
  private registration: ServiceWorkerRegistration | null = null
  private isRegistered = false

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service workers not supported')
      return null
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      this.isRegistered = true

      console.log('Service Worker registered:', this.registration)

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration?.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyUpdate()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event)
      })

      return this.registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      const result = await this.registration.unregister()
      if (result) {
        this.registration = null
        this.isRegistered = false
        console.log('Service Worker unregistered')
      }
      return result
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
      return false
    }
  }

  async getCacheStats(): Promise<any> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      return null
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data)
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      )
    })
  }

  async clearCache(): Promise<boolean> {
    if (!this.isRegistered || !navigator.serviceWorker.controller) {
      return false
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false)
      }

      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    })
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      return false
    }

    try {
      await this.registration.update()
      return true
    } catch (error) {
      console.error('Failed to check for updates:', error)
      return false
    }
  }

  private notifyUpdate() {
    // Dispatch custom event for update notification
    const event = new CustomEvent('sw-update-available', {
      detail: { registration: this.registration }
    })
    window.dispatchEvent(event)
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { data } = event
    
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('Cache updated for:', data.url)
        break
      case 'OFFLINE_READY':
        console.log('App ready for offline use')
        break
      default:
        console.log('Service Worker message:', data)
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration
  }
}

// Global service worker manager
export const serviceWorkerManager = new ServiceWorkerManager()

// React hook for service worker integration
export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [cacheStats, setCacheStats] = useState<any>(null)

  useEffect(() => {
    // Register service worker on mount
    serviceWorkerManager.register().then((registration) => {
      setIsRegistered(!!registration)
    })

    // Listen for update notifications
    const handleUpdate = () => {
      setUpdateAvailable(true)
    }

    window.addEventListener('sw-update-available', handleUpdate)

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate)
    }
  }, [])

  const refreshApp = useCallback(() => {
    window.location.reload()
  }, [])

  const getCacheStats = useCallback(async () => {
    const stats = await serviceWorkerManager.getCacheStats()
    setCacheStats(stats)
    return stats
  }, [])

  const clearCache = useCallback(async () => {
    const success = await serviceWorkerManager.clearCache()
    if (success) {
      setCacheStats(null)
    }
    return success
  }, [])

  return {
    isSupported: serviceWorkerManager.isSupported(),
    isRegistered,
    updateAvailable,
    cacheStats,
    refreshApp,
    getCacheStats,
    clearCache,
    checkForUpdates: serviceWorkerManager.checkForUpdates.bind(serviceWorkerManager)
  }
}

// Auto-register service worker in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  serviceWorkerManager.register()
}

import { useState, useEffect, useCallback } from 'react'