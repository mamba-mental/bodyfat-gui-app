import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fireWeighInWebhook } from '@/lib/weighinWebhook'

describe('fireWeighInWebhook', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-11T12:00:00-04:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does not POST when no active cycle exists', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'old', status: 'stopped', start_date: '2026-06-03' }]),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fireWeighInWebhook({ urlOverride: 'https://example.test/webhook' })

    expect(result).toMatchObject({ attempted: false, ok: false, error: 'Start an active ReComp cycle first.' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not POST when the active cycle has no weigh-in days', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ id: 'current', status: 'active', weighin_days: [] }]),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fireWeighInWebhook({ urlOverride: 'https://example.test/webhook' })

    expect(result).toMatchObject({ attempted: false, ok: false, error: 'Choose at least one weigh-in day first.' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('POSTs a schedulable, idempotent event for the active cycle', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{
          id: 'current',
          name: 'August Cut',
          status: 'active',
          weighin_days: [2, 5],
        }]),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fireWeighInWebhook({
      urlOverride: 'https://example.test/webhook',
      reportTitle: 'Week 1 report',
    })

    expect(result).toMatchObject({
      attempted: true,
      ok: true,
      status: 200,
      payload: {
        event: 'next_weighin',
        idempotency_key: 'current:2026-08-11',
        next_weighin_date: '2026-08-11',
        cycle_id: 'current',
        cycle_name: 'August Cut',
        weighin_days: [2, 5],
        report_title: 'Week 1 report',
        source: 'apexfit',
      },
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe('https://example.test/webhook')
  })
})
