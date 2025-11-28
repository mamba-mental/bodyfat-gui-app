import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

const mockUserData = {
  name: 'Test User',
  age: 35,
  gender: 'm' as const,
  height_feet: 5,
  height_inches: 10,
  height_cm: 177.8,
  dob: '1990-01-01',
  current_weight: 200,
  current_bf: 22,
  goal_weight: 180,
  goal_bf: 15,
  start_date: '2025-01-01',
  end_date: '2025-06-01',
  activity_level: 2,
  resistance_training: true,
  is_athlete: false,
  workout_type: 'General Fitness',
  workout_days: 4,
  job_activity: 2,
  leisure_activity: 2,
  experience_level: 'intermediate',
  volume_score: 5,
  intensity_score: 5,
  frequency_score: 5,
  is_bodybuilder: false,
  protein_intake: 160,
  diet_type: 'balanced',
  ped_use: false,
  exercise_type: 'resistance',
  sleep_quality: 'good',
  timeline_weeks: 16
}

const mockContextValue = {
  state: {
    current_user: mockUserData,
    entries: [],
    reports: [],
    current_calculation: null,
    loading: true,
    error: null
  },
  setUserData: vi.fn(),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  calculateAndUpdateProgression: vi.fn(),
  generateNewReport: vi.fn(),
  deleteReport: vi.fn(),
  clearAllData: vi.fn(),
  refreshWidgets: vi.fn(),
  subscribeToDataChanges: vi.fn(() => () => {})
}

vi.mock('@/contexts/app-context', () => ({
  useApp: () => mockContextValue
}))

vi.mock('@/lib/pdf-generator', () => ({
  generatePDFFromHTML: vi.fn(),
  generateStyledPDF: vi.fn()
}))

import ReportsPage from '@/app/reports/page'

describe('ReportsPage timeout messaging', () => {
  it('informs the user about the five-minute PRIME window', () => {
    render(<ReportsPage />)
    expect(screen.getByText(/This may take up to 5 minutes/i)).toBeInTheDocument()
  })
})
