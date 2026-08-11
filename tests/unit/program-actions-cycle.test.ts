import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNewProgram } from '@/contexts/app/actions/program-actions'

describe('createNewProgram', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-11T12:00:00-04:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('persists the edited profile and a matching active ReComp cycle', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const dispatch = vi.fn()
    const refreshWidgets = vi.fn()
    const prior = {
      name: 'MJ PRIME', current_weight: 270.5, current_bf: 38.5,
      goal_weight: 217, goal_bf: 13, timeline_weeks: 16,
    }
    const edited = {
      ...prior,
      current_weight: 268,
      goal_weight: 225,
      goal_bf: 15,
      timeline_weeks: 12,
    }

    const id = await createNewProgram({
      dispatch,
      currentUser: prior as never,
      entries: [],
      refreshWidgets,
    }, edited as never)

    expect(id).toMatch(/^program-/)
    const cycleRequest = fetchMock.mock.calls[1]
    expect(cycleRequest[0]).toBe('/api/data/cycles')
    expect(JSON.parse(cycleRequest[1].body)).toMatchObject({
      status: 'active',
      plan_mode: 'standard',
      start_date: '2026-08-11',
      end_date: '2026-11-03',
      start_weight: 268,
      goal_weight: 225,
      goal_bf: 15,
      timeline_weeks: 12,
    })
    const userRequest = fetchMock.mock.calls[2]
    expect(userRequest[0]).toBe('/api/data/user')
    expect(JSON.parse(userRequest[1].body)).toEqual(expect.objectContaining({
      name: 'MJ PRIME',
      current_weight: 268,
      goal_weight: 225,
      start_date: '2026-08-11',
      end_date: '2026-11-03',
      current_program_id: id,
    }))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_USER_DATA' }))
    expect(refreshWidgets).toHaveBeenCalled()
  })

  it('reactivates the prior cycle when the profile write fails', async () => {
    const priorCycle = { id: 'cycle-old', status: 'active', name: 'Prior cycle' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [priorCycle] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    const dispatch = vi.fn()

    const result = await createNewProgram({
      dispatch,
      currentUser: {
        name: 'MJ PRIME', current_weight: 270.5, current_bf: 38.5,
        goal_weight: 220, goal_bf: 13, timeline_weeks: 16,
      } as never,
      entries: [],
      refreshWidgets: vi.fn(),
    })

    expect(result).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({
      id: 'cycle-old', status: 'active',
    })
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_ERROR' }))
  })
})
