/**
 * Resilient Fetch - Production-ready HTTP client with retry logic and circuit breaker
 *
 * Features:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern to prevent cascade failures
 * - Configurable timeout per request
 * - Request deduplication for identical concurrent requests
 */

import { pythonApiConfig } from '../config'

// Circuit breaker states
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerConfig {
  failureThreshold: number      // Number of failures before opening circuit
  resetTimeoutMs: number        // Time to wait before trying again (half-open)
  halfOpenSuccessThreshold: number  // Successes needed to close circuit
}

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

interface ResilientFetchOptions extends RequestInit {
  timeout?: number
  retryConfig?: Partial<RetryConfig>
  circuitBreakerKey?: string  // Key to identify which circuit breaker to use
  skipRetry?: boolean         // Skip retry logic for this request
}

// Default configurations
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: pythonApiConfig.maxRetries,
  baseDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
}

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,  // 30 seconds
  halfOpenSuccessThreshold: 2,
}

// Circuit breaker state storage (per-endpoint)
const circuitBreakers = new Map<string, {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime: number
  config: CircuitBreakerConfig
}>()

// In-flight request deduplication
const pendingRequests = new Map<string, Promise<Response>>()

/**
 * Get or create a circuit breaker for a given key
 */
function getCircuitBreaker(key: string, config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      config,
    })
  }
  return circuitBreakers.get(key)!
}

/**
 * Check if circuit breaker allows request
 */
function canMakeRequest(breakerKey: string): { allowed: boolean; reason?: string } {
  const breaker = getCircuitBreaker(breakerKey)

  switch (breaker.state) {
    case 'CLOSED':
      return { allowed: true }

    case 'OPEN':
      const timeSinceLastFailure = Date.now() - breaker.lastFailureTime
      if (timeSinceLastFailure >= breaker.config.resetTimeoutMs) {
        // Transition to half-open
        breaker.state = 'HALF_OPEN'
        breaker.successes = 0
        return { allowed: true }
      }
      return {
        allowed: false,
        reason: `Circuit breaker OPEN. Retry in ${Math.ceil((breaker.config.resetTimeoutMs - timeSinceLastFailure) / 1000)}s`
      }

    case 'HALF_OPEN':
      return { allowed: true }

    default:
      return { allowed: true }
  }
}

/**
 * Record a successful request
 */
function recordSuccess(breakerKey: string) {
  const breaker = getCircuitBreaker(breakerKey)

  if (breaker.state === 'HALF_OPEN') {
    breaker.successes++
    if (breaker.successes >= breaker.config.halfOpenSuccessThreshold) {
      // Close the circuit
      breaker.state = 'CLOSED'
      breaker.failures = 0
      breaker.successes = 0
      console.log(`[ResilientFetch] Circuit breaker ${breakerKey} CLOSED after recovery`)
    }
  } else if (breaker.state === 'CLOSED') {
    // Reset failure count on success
    breaker.failures = 0
  }
}

/**
 * Record a failed request
 */
function recordFailure(breakerKey: string) {
  const breaker = getCircuitBreaker(breakerKey)

  breaker.failures++
  breaker.lastFailureTime = Date.now()

  if (breaker.state === 'HALF_OPEN') {
    // Immediately open circuit on failure in half-open state
    breaker.state = 'OPEN'
    console.log(`[ResilientFetch] Circuit breaker ${breakerKey} OPEN (failed in half-open)`)
  } else if (breaker.failures >= breaker.config.failureThreshold) {
    breaker.state = 'OPEN'
    console.log(`[ResilientFetch] Circuit breaker ${breakerKey} OPEN after ${breaker.failures} failures`)
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter (0-25% of delay) to prevent thundering herd
  const jitter = cappedDelay * Math.random() * 0.25
  return cappedDelay + jitter
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true
    }
    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true
    }
  }
  return false
}

/**
 * Check if a response status is retryable
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors and rate limiting
  return status >= 500 || status === 429 || status === 408
}

/**
 * Generate a cache key for request deduplication
 */
function getRequestKey(url: string, options: RequestInit): string {
  const method = options.method || 'GET'
  const body = options.body ? JSON.stringify(options.body) : ''
  return `${method}:${url}:${body}`
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly breakerKey: string) {
    super(message)
    this.name = 'CircuitBreakerError'
  }
}

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly lastError: Error | null,
    public readonly attempts: number
  ) {
    super(message)
    this.name = 'RetryExhaustedError'
  }
}

/**
 * Resilient fetch with exponential backoff and circuit breaker
 */
export async function resilientFetch(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    timeout = pythonApiConfig.calculationTimeout,
    retryConfig: userRetryConfig,
    circuitBreakerKey = new URL(url, 'http://localhost').hostname,
    skipRetry = false,
    ...fetchOptions
  } = options

  const retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...userRetryConfig }

  // Check circuit breaker
  const circuitCheck = canMakeRequest(circuitBreakerKey)
  if (!circuitCheck.allowed) {
    throw new CircuitBreakerError(circuitCheck.reason || 'Circuit breaker open', circuitBreakerKey)
  }

  // Request deduplication for GET requests
  const requestKey = getRequestKey(url, fetchOptions)
  if (fetchOptions.method === 'GET' || !fetchOptions.method) {
    const pending = pendingRequests.get(requestKey)
    if (pending) {
      return pending.then(r => r.clone())
    }
  }

  const executeRequest = async (): Promise<Response> => {
    let lastError: Error | null = null
    const maxAttempts = skipRetry ? 1 : retryConfig.maxRetries + 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        try {
          const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          // Check if we should retry based on status
          if (!response.ok && isRetryableStatus(response.status)) {
            if (attempt < maxAttempts - 1) {
              const delay = calculateBackoffDelay(attempt, retryConfig)
              console.log(`[ResilientFetch] Retrying ${url} after ${response.status}, attempt ${attempt + 1}/${maxAttempts}, delay ${Math.round(delay)}ms`)
              await sleep(delay)
              continue
            }
          }

          // Success - record it
          recordSuccess(circuitBreakerKey)
          return response

        } catch (fetchError) {
          clearTimeout(timeoutId)
          throw fetchError
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Check if error is retryable
        if (isRetryableError(error) && attempt < maxAttempts - 1) {
          const delay = calculateBackoffDelay(attempt, retryConfig)
          console.log(`[ResilientFetch] Retrying ${url} after error: ${lastError.message}, attempt ${attempt + 1}/${maxAttempts}, delay ${Math.round(delay)}ms`)
          await sleep(delay)
          continue
        }

        // Record failure for circuit breaker
        recordFailure(circuitBreakerKey)
        throw lastError
      }
    }

    // All retries exhausted
    recordFailure(circuitBreakerKey)
    throw new RetryExhaustedError(
      `All ${maxAttempts} attempts failed for ${url}`,
      lastError,
      maxAttempts
    )
  }

  // Execute with deduplication tracking
  const promise = executeRequest()

  if (fetchOptions.method === 'GET' || !fetchOptions.method) {
    pendingRequests.set(requestKey, promise)
    promise.finally(() => pendingRequests.delete(requestKey))
  }

  return promise
}

/**
 * Reset circuit breaker state (useful for testing or manual recovery)
 */
export function resetCircuitBreaker(key?: string) {
  if (key) {
    circuitBreakers.delete(key)
  } else {
    circuitBreakers.clear()
  }
}

/**
 * Get circuit breaker status (useful for health checks)
 */
export function getCircuitBreakerStatus(key: string): {
  state: CircuitState
  failures: number
  lastFailureTime: number
} | null {
  const breaker = circuitBreakers.get(key)
  if (!breaker) return null

  return {
    state: breaker.state,
    failures: breaker.failures,
    lastFailureTime: breaker.lastFailureTime,
  }
}

/**
 * Convenience function for Python API calls
 */
export async function fetchPythonApi(
  endpoint: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const url = `${pythonApiConfig.url}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  return resilientFetch(url, {
    ...options,
    circuitBreakerKey: 'python-api',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
