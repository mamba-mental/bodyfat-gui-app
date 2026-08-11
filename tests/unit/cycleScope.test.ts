import { describe, it, expect } from 'vitest'
import { defaultSelectedCycle, scopeByCycle, ALL_CYCLES } from '../../src/lib/cycleScope'

// P4: the Reports cycle-selector defaults to the CURRENT (active) cycle and can
// scope each card to one cycle or aggregate across "All ReComp Cycles".

describe('defaultSelectedCycle', () => {
  it('picks the active cycle', () => {
    expect(
      defaultSelectedCycle([
        { id: 'c1', status: 'stopped', startDate: '2026-01-01' },
        { id: 'c2', status: 'active', startDate: '2026-05-01' },
      ])
    ).toBe('c2')
  })
  it('falls back to the aggregate view when none are active', () => {
    expect(
      defaultSelectedCycle([
        { id: 'c1', status: 'stopped', startDate: '2026-01-01' },
        { id: 'c2', status: 'archived', startDate: '2026-05-01' },
      ])
    ).toBe(ALL_CYCLES)
  })
  it('returns ALL_CYCLES when there are no cycles', () => {
    expect(defaultSelectedCycle([])).toBe(ALL_CYCLES)
  })
})

describe('scopeByCycle', () => {
  const items = [
    { id: 'e1', cycle_id: 'c1' },
    { id: 'e2', cycle_id: 'c2' },
    { id: 'e3', cycle_id: 'c2' },
    { id: 'e4', cycle_id: null },
  ]
  it('ALL returns everything', () => {
    expect(scopeByCycle(items, ALL_CYCLES)).toHaveLength(4)
  })
  it('filters to one cycle', () => {
    expect(scopeByCycle(items, 'c2').map((i) => i.id)).toEqual(['e2', 'e3'])
  })
  it('a specific cycle excludes null cycle_id', () => {
    expect(scopeByCycle(items, 'c1').map((i) => i.id)).toEqual(['e1'])
  })
})
