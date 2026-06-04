import { describe, it, expect } from 'vitest'
import { currentCycleWeek, nextWeighIn, missedWeighIns } from '../../src/lib/cycleWeek'

// Date-only, timezone-safe math (Codex #5): all inputs are YYYY-MM-DD strings,
// computed in UTC so an evening action in America/New_York never rolls the date.

describe('currentCycleWeek', () => {
  it('start date is week 1', () => {
    expect(currentCycleWeek('2026-05-04', '2026-05-04')).toBe(1)
  })
  it('30 days in = week 5 (matches "Week 5 of 16")', () => {
    expect(currentCycleWeek('2026-05-04', '2026-06-03')).toBe(5)
  })
  it('day 6 still week 1, day 7 is week 2', () => {
    expect(currentCycleWeek('2026-05-04', '2026-05-10')).toBe(1)
    expect(currentCycleWeek('2026-05-04', '2026-05-11')).toBe(2)
  })
  it('clamps to timelineWeeks', () => {
    expect(currentCycleWeek('2026-01-01', '2027-01-01', 16)).toBe(16)
  })
  it('before start clamps to 1', () => {
    expect(currentCycleWeek('2026-05-04', '2026-05-01')).toBe(1)
  })
})

describe('nextWeighIn', () => {
  it('Wed with Mon+Thu schedule -> next is Thu', () => {
    // 2026-06-03 is a Wednesday; weighinDays [1=Mon,4=Thu]
    expect(nextWeighIn('2026-06-03', [1, 4])).toBe('2026-06-04')
  })
  it('on a weigh-in day returns that same day', () => {
    expect(nextWeighIn('2026-06-04', [1, 4])).toBe('2026-06-04') // Thu
  })
  it('empty schedule returns null', () => {
    expect(nextWeighIn('2026-06-03', [])).toBeNull()
  })
})

describe('missedWeighIns', () => {
  it('lists expected weigh-ins with no entry within +/-1 day, before today', () => {
    // start Mon 2026-06-01, today Wed 2026-06-10, schedule Mon+Thu
    // expected before today: 6/1(Mon), 6/4(Thu), 6/8(Mon). Entry only on 6/1.
    expect(
      missedWeighIns('2026-06-01', '2026-06-10', [1, 4], ['2026-06-01'])
    ).toEqual(['2026-06-04', '2026-06-08'])
  })
  it('entry within +/-1 day counts as met', () => {
    // expected 6/4; an entry on 6/5 (+1) covers it
    expect(
      missedWeighIns('2026-06-01', '2026-06-06', [4], ['2026-06-05'])
    ).toEqual([])
  })
})

// F11 / MEDIUM-14 — toUTC must tolerate full ISO strings (a T/Z suffix). A cycle
// start_date stored as '2026-06-01T00:00:00.000Z' used to make Number('01T00...')
// = NaN, so currentCycleWeek returned NaN and missedWeighIns silently found none.
describe('ISO datetime suffix tolerance', () => {
  it('currentCycleWeek handles a start_date with a time/Z suffix', () => {
    const week = currentCycleWeek('2026-06-01T00:00:00.000Z', '2026-06-15', 16)
    expect(Number.isNaN(week)).toBe(false)
    expect(week).toBe(3) // same as the date-only '2026-06-01'
  })

  it('missedWeighIns handles ISO start + entry dates with suffixes', () => {
    expect(
      missedWeighIns('2026-06-01T12:00:00Z', '2026-06-10', [1, 4], ['2026-06-01T08:00:00Z'])
    ).toEqual(['2026-06-04', '2026-06-08'])
  })
})
