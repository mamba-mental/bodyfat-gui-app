import { describe, it, expect } from 'vitest'
import { validateSchedule, normalizeDays } from '../../src/lib/weighinSchedule'

// P8: weigh-in commitment = N per week + which weekday(s). Validate that the
// chosen days match the per-week count and are in range, with no duplicates.

describe('normalizeDays', () => {
  it('dedupes, sorts, drops out-of-range', () => {
    expect(normalizeDays([4, 1, 1])).toEqual([1, 4])
    expect(normalizeDays([8, -1, 3])).toEqual([3])
    expect(normalizeDays([])).toEqual([])
  })
})

describe('validateSchedule', () => {
  it('valid when day count matches perWeek and days are in range', () => {
    expect(validateSchedule(2, [1, 4])).toEqual({ valid: true })
  })
  it('invalid when count does not match perWeek', () => {
    expect(validateSchedule(2, [1])).toEqual({ valid: false, error: 'pick 2 day(s), got 1' })
    expect(validateSchedule(2, [1, 4, 5])).toEqual({ valid: false, error: 'pick 2 day(s), got 3' })
  })
  it('invalid when a day is out of the 0..6 range', () => {
    expect(validateSchedule(1, [7])).toEqual({ valid: false, error: 'day 7 out of range (0-6)' })
  })
  it('invalid on duplicate days', () => {
    expect(validateSchedule(2, [1, 1])).toEqual({ valid: false, error: 'duplicate weigh-in days' })
  })
})
