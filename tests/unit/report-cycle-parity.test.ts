import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * F4+F7 acceptance — the report is scoped to the active cycle and feeds
 * fetchCalculation the SAME inputs the dashboard /calculate uses.
 *
 * BDD:
 *   Scenario: A report uses the active cycle's weigh-in, not the profile blob
 *     Given an active cycle starting at 266.8 lb with a latest weigh-in of 264.0
 *     And a 200 lb profile blob and a 300 lb weigh-in in another cycle
 *     When a report is generated
 *     Then fetchCalculation is called with current_weight 264.0 (cycle latest)
 *     And start_date is the cycle's 2026-06-03 (not clobbered to today)
 *
 * Was RED: report overrode current_weight from program-scoped entries and set
 * start_date=today, so its numbers diverged from the dashboard.
 */

const fetchCalculation = vi.fn()
const fetchGeneratedReport = vi.fn()
const saveReport = vi.fn()

vi.mock('@/lib/storage-api', () => ({
  saveCalculationResult: vi.fn(),
  saveReport: (r: unknown) => { saveReport(r); return Promise.resolve(r) },
  generateId: () => 'rep-1',
  fetchGeneratedReport: (...a: unknown[]) => fetchGeneratedReport(...a),
  fetchCalculation: (...a: unknown[]) => fetchCalculation(...a),
}))
vi.mock('@/lib/weighinWebhook', () => ({ fireWeighInWebhook: () => Promise.resolve({ attempted: false }) }))

import { generateReport } from '@/contexts/app/actions/report-actions'

const ACTIVE_CYCLE = {
  id: 'cyc-0626', name: 'PRIME.TIME-06.2026', status: 'active',
  start_date: '2026-06-03', start_weight: 266.8, start_bf: 39.2,
  goal_weight: 217, goal_bf: 13, timeline_weeks: 16,
}

describe('report ↔ /calculate parity (F4+F7)', () => {
  beforeEach(() => {
    fetchCalculation.mockReset().mockResolvedValue({ user_data: {}, progression: [], summary: {} })
    fetchGeneratedReport.mockReset().mockResolvedValue({ html_content: '<div>ok</div>', pdf_path: '/x.pdf' })
    saveReport.mockReset()
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      typeof url === 'string' && url.includes('/api/data/cycles')
        ? Promise.resolve({ ok: true, json: () => Promise.resolve([ACTIVE_CYCLE]) })
        : Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    ) as unknown as typeof fetch)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('feeds fetchCalculation the cycle latest weigh-in + cycle start_date', async () => {
    const userData = {
      name: 'PRIME', current_weight: 200, current_bf: 25, // profile blob — must NOT win
      goal_weight: 180, goal_bf: 12, start_date: '2025-01-01', age: 30,
    } as never

    const entries = [
      { id: 'e2', weight: 264.0, body_fat_percentage: 38.5, date: '2026-06-10', cycle_id: 'cyc-0626' },
      { id: 'e1', weight: 266.8, body_fat_percentage: 39.2, date: '2026-06-03', cycle_id: 'cyc-0626' },
      { id: 'x', weight: 300.0, body_fat_percentage: 45, date: '2026-05-01', cycle_id: 'cyc-old' },
    ] as never

    await generateReport(userData, {
      dispatch: vi.fn(),
      entries,
      reports: [],
      announceInfo: vi.fn(), announceSuccess: vi.fn(), announceError: vi.fn(),
      cycleId: 'cyc-0626',
    } as never)

    expect(fetchCalculation).toHaveBeenCalledTimes(1)
    const calcInput = fetchCalculation.mock.calls[0][0]
    expect(calcInput.current_weight).toBe(264.0)      // cycle latest, not 200
    expect(calcInput.current_bf).toBe(38.5)
    expect(calcInput.start_date).toBe('2026-06-03')   // cycle start, not today
    expect(calcInput.goal_weight).toBe(217)           // cycle goal

    // The saved report is tagged to the active cycle.
    const saved = saveReport.mock.calls[0][0]
    expect(saved.cycle_id).toBe('cyc-0626')
  })
})
