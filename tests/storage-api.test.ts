import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { saveEntry, deleteEntry } from '@/lib/storage-api'
import type { BodyFatEntry } from '@/types'

describe('storage-api data entry endpoints', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('saves entries through /api/data/entries', async () => {
    const testEntry: BodyFatEntry = {
      id: 'test-entry-1',
      date: '2025-01-01T00:00:00.000Z',
      weight: 185,
      body_fat_percentage: 18.5,
      notes: 'integration-test',
      user_id: '1',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    }

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => testEntry,
    })

    global.fetch = fetchMock as unknown as typeof global.fetch

    const result = await saveEntry(testEntry)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/data/entries')
    expect(options?.method).toBe('POST')
    expect(options?.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(JSON.parse(String(options?.body))).toEqual(testEntry)
    expect(result).toEqual(testEntry)
  })

  it('deletes entries through /api/data/entries', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    global.fetch = fetchMock as unknown as typeof global.fetch

    await deleteEntry('entry-to-delete')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/data/entries')
    expect(options?.method).toBe('DELETE')
    expect(JSON.parse(String(options?.body))).toEqual({ id: 'entry-to-delete' })
  })
})
