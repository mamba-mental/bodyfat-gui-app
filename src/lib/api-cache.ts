/**
 * Frontend API caching and optimization utilities
 * Provides intelligent caching, request deduplication, and performance monitoring
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  cache?: boolean
  cacheTTL?: number
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>()
  private stats = {
    hits: 0,
    misses: 0,
    errors: 0,
    totalRequests: 0
  }

  constructor(private defaultTTL = 300000) {} // 5 minutes default

  private generateCacheKey(url: string, config?: RequestConfig): string {
    const method = config?.method || 'GET'
    const body = config?.body ? JSON.stringify(config.body) : ''
    return `${method}:${url}:${body}`
  }

  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt
  }

  async request<T>(url: string, config: RequestConfig = {}): Promise<T> {
    this.stats.totalRequests++
    
    const cacheKey = this.generateCacheKey(url, config)
    const useCache = config.cache !== false && (config.method === 'GET' || config.method === undefined)
    
    // Check cache first for GET requests
    if (useCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && this.isValidCacheEntry(cached)) {
        this.stats.hits++
        return cached.data
      }
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    // Make the actual request
    const requestPromise = this.performRequest<T>(url, config)
    
    // Store pending request for deduplication
    this.pendingRequests.set(cacheKey, requestPromise)

    try {
      const result = await requestPromise
      
      // Cache successful GET requests
      if (useCache && result) {
        const ttl = config.cacheTTL || this.defaultTTL
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl
        })
      }

      this.stats.misses++
      return result
    } catch (error) {
      this.stats.errors++
      throw error
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async performRequest<T>(url: string, config: RequestConfig): Promise<T> {
    const startTime = performance.now()
    
    const fetchConfig: RequestInit = {
      method: config.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    }

    if (config.body) {
      fetchConfig.body = JSON.stringify(config.body)
    }

    const response = await fetch(url, fetchConfig)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const endTime = performance.now()

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method || 'GET'} ${url} - ${(endTime - startTime).toFixed(2)}ms`)
    }

    return data
  }

  // Cache management methods
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    )
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0

    return {
      ...this.stats,
      hitRate: `${hitRate.toFixed(1)}%`,
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

// Global API cache instance
export const apiCache = new APICache()

// Cleanup expired entries every 5 minutes
setInterval(() => apiCache.cleanup(), 300000)

// Optimized API methods for the application
export class OptimizedAPI {
  private baseURL: string

  constructor(baseURL = '/api') {
    this.baseURL = baseURL
  }

  // User data methods
  async getUser(useCache = true) {
    return apiCache.request(`${this.baseURL}/data/user`, {
      cache: useCache,
      cacheTTL: 600000 // 10 minutes
    })
  }

  async saveUser(userData: any) {
    const result = await apiCache.request(`${this.baseURL}/data/user`, {
      method: 'POST',
      body: userData,
      cache: false
    })
    
    // Invalidate user cache after update
    apiCache.invalidate('/data/user')
    return result
  }

  // Entries methods
  async getEntries(useCache = true) {
    return apiCache.request(`${this.baseURL}/data/entries`, {
      cache: useCache,
      cacheTTL: 300000 // 5 minutes
    })
  }

  async saveEntry(entry: any) {
    const result = await apiCache.request(`${this.baseURL}/data/entries`, {
      method: 'POST', 
      body: entry,
      cache: false
    })
    
    // Invalidate entries cache after update
    apiCache.invalidate('/data/entries')
    return result
  }

  // Calculation methods
  async calculate(userData: any, useCache = true) {
    // FastAPI expects { user_data: UserData } when endpoint has multiple body params
    return apiCache.request('/python-api/calculate', {
      method: 'POST',
      body: { user_data: userData },
      cache: useCache,
      cacheTTL: 3600000 // 1 hour for expensive calculations
    })
  }

  async generateReport(userData: any) {
    return apiCache.request('/python-api/generate-report', {
      method: 'POST',
      body: userData,
      cache: false // Reports should always be fresh
    })
  }

  // AI methods (shorter cache due to dynamic nature)
  async getAIInsights(requestData: any) {
    return apiCache.request('/python-api/ai/insights', {
      method: 'POST',
      body: requestData,
      cache: true,
      cacheTTL: 300000 // 5 minutes
    })
  }

  // Performance monitoring
  async getPerformanceStats() {
    return apiCache.request('/python-api/performance/stats', {
      cache: false
    })
  }

  // Cache management
  clearCache() {
    apiCache.invalidate()
  }

  getCacheStats() {
    return apiCache.getStats()
  }
}

// Export singleton instance
export const api = new OptimizedAPI()

// React hook for cache stats (for debugging)
export function useAPICache() {
  return {
    stats: apiCache.getStats(),
    clearCache: () => apiCache.invalidate(),
    invalidatePattern: (pattern: string) => apiCache.invalidate(pattern)
  }
}