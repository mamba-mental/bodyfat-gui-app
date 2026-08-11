
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '@/components/dashboard'
import { AppContext } from '@/contexts/app-context'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock child components to avoid rendering complexity
vi.mock('@/components/charts/lazy-chart-components', () => ({
  ProgressTrendChart: () => <div data-testid="progress-trend-chart" />,
  CalorieManagementWidget: () => <div data-testid="calorie-widget" />,
  GoalProgressWidget: () => <div data-testid="goal-widget" />,
  MetabolicInsightsWidget: () => <div data-testid="metabolic-widget" />
}))

vi.mock('@/components/ai/lazy-ai-components', () => ({
  AIInsightsPanel: () => <div data-testid="ai-insights" />,
  AIChatWidget: () => <div data-testid="ai-chat" />
}))

// Mock UI components that might cause issues
vi.mock('@/components/ui/client-icon', () => ({
  default: () => <span data-testid="icon" />
}))

describe('Dashboard Reset Logic', () => {
  const mockCalculateAndUpdateProgression = vi.fn()
  const mockGenerateNewReport = vi.fn()
  const mockSetUserData = vi.fn()

  const defaultState = {
    current_user: null,
    program_reference: null,
    current_calculation: null,
    entries: [],
    reports: [],
    loading: false,
    error: null,
    report_generation_status: '',
    report_generation_entry_date: null,
  }

  const renderDashboard = (stateOverrides = {}) => {
    const state = { ...defaultState, ...stateOverrides }
    const value = {
      state,
      calculateAndUpdateProgression: mockCalculateAndUpdateProgression,
      generateNewReport: mockGenerateNewReport,
      setUserData: mockSetUserData,
      dispatch: vi.fn(),
      addEntry: vi.fn(),
      updateEntry: vi.fn(),
      deleteEntry: vi.fn(),
      deleteReport: vi.fn(),
      clearAllData: vi.fn(),
      refreshWidgets: vi.fn(),
      subscribeToDataChanges: vi.fn(() => () => { }),
      createNewProgram: vi.fn(async () => 'mock-program-id'),
      refreshKey: 0
    }

    return render(
      <AppContext.Provider value={value}>
        <Dashboard />
      </AppContext.Provider>
    )
  }

  it('uses program_reference for delta calculations when present', () => {
    const userWithProgramRef = {
      current_weight: 180, // Current weight (same as start of new program)
      current_bf: 20,
      goal_weight: 160,
      goal_bf: 15,
      start_date: '2023-01-01',
      program_reference: {
        start_date: '2023-01-01',
        initial_weight: 180,
        initial_bf: 20
      }
    }

    renderDashboard({
      current_user: userWithProgramRef,
      entries: [{ weight: 180, body_fat_percentage: 20, date: '2023-01-01' }]
    })

    // Should show 0 lbs lost/gained because current matches initial
    // We look for the text content in the weight card
    // The card shows "0.0 lbs lost" or similar.
    // Actually, the logic is: Math.abs(startWeight - currentWeight).toFixed(1)
    // If start=180, current=180, diff=0.0. Logic defaults to "gained" if not >
    expect(screen.getByText('0.0 lbs gained')).toBeInTheDocument()
  })

  it('calculates progress correctly when weight changes from program_reference', () => {
    const userWithProgramRef = {
      current_weight: 180, // Initial weight of program
      current_bf: 20,
      goal_weight: 160,
      goal_bf: 15,
      start_date: '2023-01-01',
      program_reference: {
        start_date: '2023-01-01',
        initial_weight: 185, // Started at 185
        initial_bf: 22
      }
    }

    // Latest entry is 180
    renderDashboard({
      current_user: userWithProgramRef,
      entries: [{ weight: 180, body_fat_percentage: 20, date: '2023-01-10' }]
    })

    // Should show 5.0 lbs lost (185 - 180)
    expect(screen.getByText('5.0 lbs lost')).toBeInTheDocument()
  })

  it('falls back to current_weight as start weight if program_reference is missing (legacy behavior)', () => {
    const legacyUser = {
      current_weight: 180, // This is treated as start weight in legacy model
      current_bf: 20,
      goal_weight: 160,
      goal_bf: 15,
      start_date: '2023-01-01'
      // No program_reference
    }

    renderDashboard({
      current_user: legacyUser,
      entries: [{ weight: 175, body_fat_percentage: 19, date: '2023-01-10' }]
    })

    // Logic: startWeight = current_user.current_weight = 180
    // currentWeight = latestEntry.weight = 175
    // Diff = 5.0 lbs lost
    expect(screen.getByText('5.0 lbs lost')).toBeInTheDocument()
  })
})
