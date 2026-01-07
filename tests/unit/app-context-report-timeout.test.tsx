import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, act, cleanup } from '@testing-library/react'
import { useEffect } from 'react'

import { AppProvider, useApp } from '@/contexts/app-context'

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
  timeline_weeks: 16,
  waist: 34,
  hip: 40,
  neck: 16
}

const mockProgressionEntry = {
  date: '010125',
  weight: 199.5,
  body_fat_percentage: 21.5,
  daily_calorie_intake: 2200,
  tdee: 2600,
  weekly_caloric_output: 2450,
  total_weight_lost: 0.5,
  lean_mass: 157.0,
  fat_mass: 42.5,
  muscle_gain: 0.1,
  rmr: 1800,
  tef: 300,
  neat: 500
}

const mockCalculationResult = {
  user_data: mockUserData,
  progression: [mockProgressionEntry],
  summary: {
    total_weight_loss: 0.5,
    body_fat_reduction: 0.5,
    muscle_gain: 0.1,
    timeline_weeks: 16
  },
  confidence_score: 85,
  ai_analysis: 'Sample analysis'
}

const storageApiMocks = vi.hoisted(() => ({
  getUserDataMock: vi.fn(),
  getEntriesMock: vi.fn(),
  getReportsMock: vi.fn(),
  getLastCalculationResultMock: vi.fn(),
  saveUserDataMock: vi.fn(),
  saveEntryMock: vi.fn(),
  saveReportMock: vi.fn(),
  saveReportsMock: vi.fn(),
  saveCalculationResultMock: vi.fn(),
  generateIdMock: vi.fn(),
  clearAllDataMock: vi.fn(),
  migrateFromLocalStorageMock: vi.fn(),
  deleteReportMock: vi.fn(),
  fetchGeneratedReportMock: vi.fn(),
  fetchCalculationMock: vi.fn(),
  fetchRecalculationMock: vi.fn(),
}))

vi.mock('@/lib/storage-api', () => ({
  getUserData: storageApiMocks.getUserDataMock,
  getEntries: storageApiMocks.getEntriesMock,
  getReports: storageApiMocks.getReportsMock,
  getLastCalculationResult: storageApiMocks.getLastCalculationResultMock,
  saveUserData: storageApiMocks.saveUserDataMock,
  saveEntry: storageApiMocks.saveEntryMock,
  saveReport: storageApiMocks.saveReportMock,
  saveReports: storageApiMocks.saveReportsMock,
  saveCalculationResult: storageApiMocks.saveCalculationResultMock,
  generateId: storageApiMocks.generateIdMock,
  clearAllData: storageApiMocks.clearAllDataMock,
  migrateFromLocalStorage: storageApiMocks.migrateFromLocalStorageMock,
  deleteReport: storageApiMocks.deleteReportMock,
  fetchGeneratedReport: storageApiMocks.fetchGeneratedReportMock,
  fetchCalculation: storageApiMocks.fetchCalculationMock,
  fetchRecalculation: storageApiMocks.fetchRecalculationMock
}))

const announcementsMocks = vi.hoisted(() => ({
  announceInfoMock: vi.fn(),
  announceSuccessMock: vi.fn(),
  announceErrorMock: vi.fn(),
}))

vi.mock('@/hooks/use-announcements', () => ({
  useAnnouncements: () => ({
    announce: vi.fn(),
    announceInfo: announcementsMocks.announceInfoMock,
    announceSuccess: announcementsMocks.announceSuccessMock,
    announceError: announcementsMocks.announceErrorMock,
    announceWarning: vi.fn(),
    announceProgress: vi.fn()
  })
}))

const {
  getUserDataMock,
  getEntriesMock,
  getReportsMock,
  getLastCalculationResultMock,
  saveUserDataMock,
  saveEntryMock,
  saveReportMock,
  saveReportsMock,
  saveCalculationResultMock,
  generateIdMock,
  clearAllDataMock,
  migrateFromLocalStorageMock,
  deleteReportMock,
  fetchGeneratedReportMock,
  fetchCalculationMock,
  fetchRecalculationMock,
} = storageApiMocks

const {
  announceInfoMock,
  announceSuccessMock,
  announceErrorMock,
} = announcementsMocks

const TestConsumer = ({ onReady }: { onReady: (value: ReturnType<typeof useApp>) => void }) => {
  const app = useApp()

  useEffect(() => {
    onReady(app)
  }, [app, onReady])

  return null
}

describe('AppContext report generation timeout', () => {
  beforeEach(() => {
    getUserDataMock.mockReset()
    getEntriesMock.mockReset()
    getReportsMock.mockReset()
    getLastCalculationResultMock.mockReset()
    saveUserDataMock.mockReset()
    saveEntryMock.mockReset()
    saveReportMock.mockReset()
    saveReportsMock.mockReset()
    saveCalculationResultMock.mockReset()
    generateIdMock.mockReset()
    clearAllDataMock.mockReset()
    migrateFromLocalStorageMock.mockReset()
    deleteReportMock.mockReset()
    fetchGeneratedReportMock.mockReset()
    fetchCalculationMock.mockReset()
    fetchRecalculationMock.mockReset()
    announceInfoMock.mockReset()
    announceSuccessMock.mockReset()
    announceErrorMock.mockReset()

    getUserDataMock.mockResolvedValue(mockUserData)
    getEntriesMock.mockResolvedValue([])
    getReportsMock.mockResolvedValue([])
    getLastCalculationResultMock.mockResolvedValue(null)
    saveUserDataMock.mockResolvedValue(undefined)
    saveEntryMock.mockResolvedValue(undefined)
    saveReportMock.mockImplementation(async (report) => report)
    saveReportsMock.mockResolvedValue(undefined)
    saveCalculationResultMock.mockResolvedValue(undefined)
    generateIdMock.mockReturnValue('report-123')
    migrateFromLocalStorageMock.mockResolvedValue(false)
    deleteReportMock.mockResolvedValue(undefined)
    fetchGeneratedReportMock.mockResolvedValue({
      html_content: '<html>report</html>'
    })
    fetchCalculationMock.mockResolvedValue(mockCalculationResult)
    fetchRecalculationMock.mockResolvedValue(mockCalculationResult)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('announces five-minute window and installs matching timeout', async () => {
    const contextCapture = vi.fn()
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    render(
      <AppProvider>
        <TestConsumer onReady={contextCapture} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(getUserDataMock).toHaveBeenCalled()
    })

    const appContext = contextCapture.mock.calls.at(-1)?.[0]
    expect(appContext).toBeTruthy()

    setTimeoutSpy.mockClear()
    announceInfoMock.mockClear()

    await act(async () => {
      await appContext!.generateNewReport()
    })

    await waitFor(() => {
      expect(announceInfoMock).toHaveBeenCalled()
    })
    expect(announceInfoMock).toHaveBeenCalledWith(expect.stringContaining('5 minutes'))

    const expectedTimeout = 5 * 60 * 1000 + 5000
    const timeoutCalls = setTimeoutSpy.mock.calls.map(([, delay]) => delay)
    expect(timeoutCalls).toContain(expectedTimeout)

    setTimeoutSpy.mock.results
      .filter(result => result.type === 'return' && result.value)
      .forEach(result => clearTimeout(result.value as ReturnType<typeof setTimeout>))
  })
})
