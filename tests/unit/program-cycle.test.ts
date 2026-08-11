import { describe, expect, it } from 'vitest'

import { buildStandardCycleForProgram } from '@/lib/programCycle'

describe('buildStandardCycleForProgram', () => {
  it('creates a matching active ReComp cycle for a new standard program', () => {
    const cycle = buildStandardCycleForProgram({
      name: 'MJ PRIME',
      current_weight: 270.5,
      current_bf: 38.5,
      goal_weight: 217,
      goal_bf: 13,
      timeline_weeks: 16,
    }, { id: 'cyc-new', startDate: '2026-08-11' })

    expect(cycle).toMatchObject({
      id: 'cyc-new',
      name: 'MJ PRIME — 16-Week Cut',
      status: 'active',
      plan_mode: 'standard',
      start_date: '2026-08-11',
      end_date: '2026-12-01',
      timeline_weeks: 16,
      start_weight: 270.5,
      start_bf: 38.5,
      goal_weight: 217,
      goal_bf: 13,
      weighin_days: [],
    })
  })
})
