import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor, cleanup } from '@testing-library/react'
import { useEffect } from 'react'

import { AppProvider, useApp } from '@/contexts/app-context'

// Reuse the same mocking pattern as other AppContext tests so behavior stays consistent
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
  fetchRecalculation: storageApiMocks.fetchRecalculationMock,
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
    announceProgress: vi.fn(),
  }),
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

describe('AppContext initial load error reporting', () => {
  beforeEach(() => {
    // Reset all mocks before each test
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

    // Simulate a complete backend/data failure for the initial load
    migrateFromLocalStorageMock.mockResolvedValue(false)
    getUserDataMock.mockRejectedValue(new Error('user profile load failed'))
    getEntriesMock.mockRejectedValue(new Error('entries load failed'))
    getReportsMock.mockRejectedValue(new Error('reports load failed'))
    getLastCalculationResultMock.mockRejectedValue(new Error('calculation load failed'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('surfaces a clear server error when all initial loads fail', async () => {
    const contextCapture = vi.fn()

    render(
      <AppProvider>
        <TestConsumer onReady={contextCapture} />
      </AppProvider>
    )

    // Wait until the effect-driven load has had a chance to run
    await waitFor(() => {
      expect(contextCapture).toHaveBeenCalled()
    })

    await waitFor(() => {
      const appContext = contextCapture.mock.calls.at(-1)?.[0]
      expect(appContext).toBeTruthy()
      expect(appContext.state.error).toBe('Failed to load data from server')
    })
  })
})
