import { describe, it, expect } from 'vitest'
import {
  startCycle,
  stopCycle,
  archiveCycle,
  activeCycle,
  type CycleState,
} from '../../src/lib/cycleTransitions'

// P3: pure, immutable reducers for cycle status. Enforces the one-active
// invariant at the state layer (complements the DB partial unique index).

describe('startCycle', () => {
  it('stops the prior active and makes the new one active', () => {
    const before: CycleState[] = [{ id: 'c1', status: 'active' }]
    const after = startCycle(before, { id: 'c2', status: 'active' })
    expect(after).toEqual([
      { id: 'c1', status: 'stopped' },
      { id: 'c2', status: 'active' },
    ])
    expect(activeCycle(after)?.id).toBe('c2')
  })
  it('does not mutate the input array', () => {
    const before: CycleState[] = [{ id: 'c1', status: 'active' }]
    startCycle(before, { id: 'c2', status: 'active' })
    expect(before).toEqual([{ id: 'c1', status: 'active' }])
  })
  it('first cycle just becomes active', () => {
    expect(startCycle([], { id: 'c1', status: 'active' })).toEqual([{ id: 'c1', status: 'active' }])
  })
  it('guarantees exactly one active even if input had two', () => {
    const messy: CycleState[] = [
      { id: 'c1', status: 'active' },
      { id: 'c2', status: 'active' },
    ]
    const after = startCycle(messy, { id: 'c3', status: 'active' })
    expect(after.filter((c) => c.status === 'active')).toHaveLength(1)
    expect(activeCycle(after)?.id).toBe('c3')
  })
})

describe('stopCycle / archiveCycle', () => {
  it('stopCycle sets that cycle to stopped', () => {
    expect(stopCycle([{ id: 'c1', status: 'active' }], 'c1')).toEqual([{ id: 'c1', status: 'stopped' }])
  })
  it('archiveCycle sets that cycle to archived', () => {
    expect(archiveCycle([{ id: 'c1', status: 'stopped' }], 'c1')).toEqual([
      { id: 'c1', status: 'archived' },
    ])
  })
})
