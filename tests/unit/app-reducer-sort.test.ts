import { describe, it, expect } from 'vitest'
import { appReducer, initialState } from '@/contexts/app/reducers/app-reducer'
import type { AppState, BodyFatEntry, Report } from '@/types'

/**
 * F11 — reducer ordering hardening (audit HIGH-8 + MEDIUM-11).
 *
 * Many widgets assume entries[0] / reports[0] is the newest. The reducer must
 * keep that invariant after EVERY mutation, and must not produce a non-deterministic
 * order when a timestamp field is missing (NaN sort).
 */

const entry = (id: string, date: string): BodyFatEntry =>
  ({ id, date, weight: 200, body_fat_percentage: 20, user_id: '1',
     created_at: date, updated_at: date } as BodyFatEntry)

describe('appReducer entry ordering', () => {
  it('UPDATE_ENTRY re-sorts so entries[0] is the newest after a date edit (HIGH-8)', () => {
    let state: AppState = appReducer(initialState, {
      type: 'SET_ENTRIES',
      payload: [entry('a', '2026-06-01'), entry('b', '2026-06-08')],
    } as never)
    expect(state.entries[0].id).toBe('b') // newest first

    // Edit entry 'a' to a date NEWER than 'b'.
    state = appReducer(state, {
      type: 'UPDATE_ENTRY',
      payload: entry('a', '2026-06-15'),
    } as never)

    // entries[0] must now be 'a' (the edited, newest) — not stale array position.
    expect(state.entries[0].id).toBe('a')
    expect(state.entries.map((e) => e.id)).toEqual(['a', 'b'])
  })
})

// Reports may carry `date` at runtime (Redis-sourced) even though the Report type
// only declares generated_at — that mismatch IS the MEDIUM-11 bug, so the helper
// takes a loose field bag.
const report = (id: string, fields: Record<string, unknown>): Report =>
  ({ id, title: id, html_content: '', ...fields } as unknown as Report)

describe('appReducer report ordering', () => {
  it('SET_REPORTS sorts deterministically when generated_at is missing (MEDIUM-11)', () => {
    // Two reports have NO generated_at (Redis-sourced), only `date`. The old
    // comparator did new Date(undefined) -> NaN -> arbitrary order.
    const state = appReducer(initialState, {
      type: 'SET_REPORTS',
      payload: [
        report('old', { date: '2026-06-01' }),
        report('new', { date: '2026-06-10' }),
        report('mid', { date: '2026-06-05' }),
      ],
    } as never)

    expect(state.reports.map((r) => r.id)).toEqual(['new', 'mid', 'old'])
  })

  it('ADD_REPORT keeps newest-first using a coalesced timestamp', () => {
    let state = appReducer(initialState, {
      type: 'SET_REPORTS',
      payload: [report('a', { date: '2026-06-02' })],
    } as never)
    state = appReducer(state, {
      type: 'ADD_REPORT',
      payload: report('b', { generated_at: new Date('2026-06-09') as never }),
    } as never)
    expect(state.reports[0].id).toBe('b')
  })
})
