import { describe, it, expect } from 'vitest'
import { calculateProgressPercentage } from '@/lib/calculations'

/**
 * F11 — edge-case hardening for the dashboard progress metric.
 * Guards div-by-zero (initial === goal) and NaN inputs (a missing weigh-in /
 * empty cycle), so the Weight/BF Progress cards never render "NaN%".
 */
describe('calculateProgressPercentage edge cases', () => {
  it('returns 100 when initial equals goal (no div-by-zero)', () => {
    expect(calculateProgressPercentage(180, 180, 180)).toBe(100)
  })

  it('clamps to [0,100]', () => {
    expect(calculateProgressPercentage(200, 220, 180)).toBe(0) // moved wrong way
    expect(calculateProgressPercentage(200, 160, 180)).toBe(100) // overshot goal
    expect(calculateProgressPercentage(200, 190, 180)).toBe(50) // halfway
  })

  it('never returns NaN when an input is missing (NaN-safe)', () => {
    expect(calculateProgressPercentage(NaN, 190, 180)).toBe(0)
    expect(calculateProgressPercentage(200, NaN, 180)).toBe(0)
    expect(calculateProgressPercentage(200, 190, NaN)).toBe(0)
  })
})
