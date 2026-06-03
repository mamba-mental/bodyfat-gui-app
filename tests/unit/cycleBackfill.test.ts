import { describe, it, expect } from 'vitest'
import { assignEntryCycle, type CycleBoundary } from '../../src/lib/cycleBackfill'

// Codex #6: backfill cycle_id by program_id FIRST, then date-range; QUARANTINE
// null/ambiguous rather than guessing (no double-counting across cycles).

const cycles: CycleBoundary[] = [
  { id: 'c1', legacyProgramId: 'p1', startDate: '2026-05-01', endDate: '2026-05-31' },
  { id: 'c2', legacyProgramId: null, startDate: '2026-06-01', endDate: null }, // open
]

describe('assignEntryCycle — by program_id first', () => {
  it('matches a cycle via legacyProgramId', () => {
    expect(assignEntryCycle({ programId: 'p1', date: '2026-05-10' }, cycles)).toEqual({ cycleId: 'c1' })
  })
  it('quarantines a program_id with no matching cycle', () => {
    expect(assignEntryCycle({ programId: 'pX', date: '2026-05-10' }, cycles)).toEqual({
      quarantine: true,
      reason: 'program_id pX has no matching cycle',
    })
  })
})

describe('assignEntryCycle — by date when program_id is null', () => {
  it('assigns to the open cycle covering the date', () => {
    expect(assignEntryCycle({ programId: null, date: '2026-06-15' }, cycles)).toEqual({ cycleId: 'c2' })
  })
  it('assigns within a closed cycle range (inclusive bounds)', () => {
    expect(assignEntryCycle({ programId: null, date: '2026-05-31' }, cycles)).toEqual({ cycleId: 'c1' })
  })
  it('quarantines when no cycle covers the date', () => {
    expect(assignEntryCycle({ programId: null, date: '2026-04-01' }, cycles)).toEqual({
      quarantine: true,
      reason: 'no cycle covers 2026-04-01',
    })
  })
  it('quarantines ambiguous overlap', () => {
    const overlap: CycleBoundary[] = [
      { id: 'a', legacyProgramId: null, startDate: '2026-01-01', endDate: '2026-06-30' },
      { id: 'b', legacyProgramId: null, startDate: '2026-06-01', endDate: null },
    ]
    expect(assignEntryCycle({ programId: null, date: '2026-06-15' }, overlap)).toEqual({
      quarantine: true,
      reason: 'ambiguous: 2026-06-15 matches 2 cycles',
    })
  })
})
