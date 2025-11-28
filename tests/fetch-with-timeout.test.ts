import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { fetchWithTimeout } from '@/lib/server/fetch-with-timeout'

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('aborts and rejects when timeout elapses', async () => {
    const abortableFetch = vi.fn((_: string, init: RequestInit = {}) => {
      return new Promise<never>((_, reject) => {
        const signal = init.signal as AbortSignal | undefined
        signal?.addEventListener('abort', () => {
          const abortError = new Error('Aborted')
          abortError.name = 'AbortError'
          reject(abortError)
        })
      })
    })

    global.fetch = abortableFetch as unknown as typeof global.fetch

    const promise = fetchWithTimeout('https://python.service/slow-endpoint', {}, 100)
    const expectation = expect(promise).rejects.toThrow(/timed out/i)

    await vi.advanceTimersByTimeAsync(150)

    await expectation
    expect(abortableFetch).toHaveBeenCalledTimes(1)
  })
})
