import { describe, it, expect } from 'vitest'
import { weeksBetween, weeklyRate, totalChange } from '../../src/lib/weeklyStats'

// Extract + test the real-date weekly math fixed inline in reports/page.tsx this
// session: per-week rate uses ACTUAL elapsed weeks, not entry index. Convention:
// negative = loss (matches the app's "-9.3 total / -0.2 avg" display).

describe('weeksBetween', () => {
  it('computes real elapsed weeks (Jan 29 -> Mar 4 2026 ~= 4.86 wk)', () => {
    expect(weeksBetween('2026-03-04', '2026-01-29')).toBeCloseTo(4.857, 2)
  })
  it('floors at 1/7 week for same-day to avoid divide-by-zero', () => {
    expect(weeksBetween('2026-03-04', '2026-03-04')).toBeCloseTo(1 / 7, 4)
  })
})

describe('totalChange', () => {
  it('newest minus oldest (loss is negative)', () => {
    expect(totalChange(270.7, 280)).toBeCloseTo(-9.3, 2)
  })
})

describe('weeklyRate', () => {
  it('per-week loss over the real interval ("most recent rate")', () => {
    // 270.7 on 3/4 vs 276.2 on 1/29 -> lost 5.5 over ~4.857 wk -> ~ -1.13/wk
    expect(weeklyRate(270.7, 276.2, '2026-03-04', '2026-01-29')).toBeCloseTo(-1.13, 1)
  })
  it('overall avg spreads total loss over the full span', () => {
    // 270.7 on 3/4/2026 vs 280 on 6/1/2025 -> -9.3 over ~39.4 wk -> ~ -0.24/wk
    expect(weeklyRate(270.7, 280, '2026-03-04', '2025-06-01')).toBeCloseTo(-0.24, 1)
  })
})
