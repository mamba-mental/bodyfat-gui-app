import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Dashboard } from '@/components/dashboard'
import { AppContext } from '@/contexts/app-context'

/**
 * F3+F5 acceptance — the dashboard reads the ACTIVE CYCLE as its single source.
 *
 * BDD:
 *   Scenario: Current weight reflects the active cycle's latest weigh-in
 *     Given an active cycle starting at 266.8 lb with a latest weigh-in of 264.0
 *     And an unrelated 200 lb profile blob
 *     When the dashboard renders
 *     Then current weight reads 264.0 lb (the cycle weigh-in), not 200 (profile)
 *     And it shows 2.8 lbs lost from the cycle's 266.8 baseline
 *
 * This exercises the real component + useCycles()/useDashboardData wiring, with
 * the cycles fetch stubbed to return an active cycle (jsdom has no network).
 */

vi.mock('@/components/charts/lazy-chart-components', () => ({
  ProgressTrendChart: () => <div data-testid="progress-trend-chart" />,
  CalorieManagementWidget: () => <div data-testid="calorie-widget" />,
  GoalProgressWidget: () => <div data-testid="goal-widget" />,
  MetabolicInsightsWidget: () => <div data-testid="metabolic-widget" />,
}))
vi.mock('@/components/ai/lazy-ai-components', () => ({
  AIInsightsPanel: () => <div data-testid="ai-insights" />,
  AIChatWidget: () => <div data-testid="ai-chat" />,
}))
vi.mock('@/components/ui/client-icon', () => ({ default: () => <span data-testid="icon" /> }))

const ACTIVE_CYCLE = {
  id: 'cyc-0626', name: 'PRIME.TIME-06.2026', status: 'active',
  start_date: '2026-06-03', start_weight: 266.8, start_bf: 39.2,
  goal_weight: 217, goal_bf: 13, timeline_weeks: 16, weighin_days: [],
}

describe('Dashboard — active-cycle scoping (F3+F5)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/api/data/cycles')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([ACTIVE_CYCLE]) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    }) as unknown as typeof fetch)
  })
  afterEach(() => vi.unstubAllGlobals())

  const renderDashboard = (stateOverrides = {}) => {
    const state = {
      current_user: null, program_reference: null, current_calculation: null,
      entries: [], reports: [], loading: false, error: null,
      report_generation_status: '', report_generation_entry_date: null,
      ...stateOverrides,
    }
    const value = {
      state,
      calculateAndUpdateProgression: vi.fn(), generateNewReport: vi.fn(),
      setUserData: vi.fn(), dispatch: vi.fn(), addEntry: vi.fn(),
      updateEntry: vi.fn(), deleteEntry: vi.fn(), deleteReport: vi.fn(),
      clearAllData: vi.fn(), refreshWidgets: vi.fn(),
      subscribeToDataChanges: vi.fn(() => () => {}),
      createNewProgram: vi.fn(() => 'mock-program-id'), refreshKey: 0,
    }
    return render(
      <AppContext.Provider value={value as never}>
        <Dashboard />
      </AppContext.Provider>,
    )
  }

  it('current weight is the active cycle latest weigh-in, not the profile blob', async () => {
    renderDashboard({
      current_user: {
        name: 'PRIME', current_weight: 200, current_bf: 25, // profile blob — must NOT win
        goal_weight: 180, goal_bf: 12, start_date: '2026-06-03',
      },
      entries: [
        { id: 'e2', weight: 264.0, body_fat_percentage: 38.5, date: '2026-06-10', cycle_id: 'cyc-0626' },
        { id: 'e1', weight: 266.8, body_fat_percentage: 39.2, date: '2026-06-03', cycle_id: 'cyc-0626' },
        { id: 'x', weight: 300.0, body_fat_percentage: 45, date: '2026-05-01', cycle_id: 'cyc-old' },
      ],
    })

    // 264.0 lb (cycle latest) shown, and 2.8 lbs lost from the 266.8 baseline.
    await waitFor(() => expect(screen.getByText('264.0 lbs')).toBeInTheDocument())
    expect(screen.getByText('2.8 lbs lost')).toBeInTheDocument()
    // The 200 lb profile blob must NOT appear as current weight.
    expect(screen.queryByText('200.0 lbs')).not.toBeInTheDocument()
  })
})
