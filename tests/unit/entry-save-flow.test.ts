import { beforeEach, describe, expect, it, vi } from 'vitest'

const saveEntry = vi.fn()
const fetchRecalculation = vi.fn()
const saveCalculationResult = vi.fn()

vi.mock('@/lib/storage-api', () => ({
  saveEntry: (...args: unknown[]) => saveEntry(...args),
  fetchRecalculation: (...args: unknown[]) => fetchRecalculation(...args),
  saveCalculationResult: (...args: unknown[]) => saveCalculationResult(...args),
  generateId: () => 'entry-new',
  deleteEntry: vi.fn(),
}))

import { addEntry } from '@/contexts/app/actions/entry-actions'

describe('new entry save flow', () => {
  const currentUser = { name: 'MJ PRIME', current_program_id: 'program-today' }

  beforeEach(() => {
    saveEntry.mockReset()
    fetchRecalculation.mockReset()
    saveCalculationResult.mockReset()
  })

  it('returns after persistence and recalculation without generating a report', async () => {
    saveEntry.mockResolvedValue({
      id: 'entry-new', user_id: 'MJ PRIME', program_id: 'program-today',
      date: '2026-08-11', weight: 268, body_fat_percentage: 37,
    })
    fetchRecalculation.mockResolvedValue({ user_data: currentUser, progression: [] })
    const dispatch = vi.fn()
    const refreshWidgets = vi.fn()

    const saved = await addEntry({
      date: new Date('2026-08-11T12:00:00-04:00'),
      weight: 268,
      body_fat_percentage: 37,
    } as never, {
      dispatch,
      currentUser: currentUser as never,
      mountedRef: { current: true },
      refreshWidgets,
    })

    expect(saved).toBe(true)
    expect(saveEntry).toHaveBeenCalledOnce()
    expect(fetchRecalculation).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_ENTRY' }))
    expect(refreshWidgets).toHaveBeenCalled()
  })

  it('returns false when persistence fails so the form does not navigate away', async () => {
    saveEntry.mockRejectedValue(new Error('database unavailable'))
    const dispatch = vi.fn()

    const saved = await addEntry({
      date: new Date('2026-08-11T12:00:00-04:00'),
      weight: 268,
    } as never, {
      dispatch,
      currentUser: currentUser as never,
      mountedRef: { current: true },
      refreshWidgets: vi.fn(),
    })

    expect(saved).toBe(false)
    expect(fetchRecalculation).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ERROR', payload: 'database unavailable' })
  })
})
