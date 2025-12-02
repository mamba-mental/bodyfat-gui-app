"use client"

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { UserData, BodyFatEntry, Report, CalculationResult, AppState, AppAction } from '@/types'
// Use API storage for server persistence
import {
  getUserData,
  getEntries,
  getReports,
  getLastCalculationResult,
  saveUserData,
  saveEntry,
  saveReport,
  saveCalculationResult,
  generateId,
  clearAllData,
  migrateFromLocalStorage,
  deleteEntry as deleteEntryFromStorage,
  deleteReport as deleteReportFromStorage,
  fetchGeneratedReport,
  fetchCalculation,
  fetchRecalculation
} from '@/lib/storage-api'
import { CalculationError } from '@/lib/calculations'
import { useMountedRef } from '@/hooks/use-mounted-ref'
import { useAnnouncements } from '@/hooks/use-announcements'
import { getEatingWindowHours } from '@/lib/eating-patterns'

const REPORT_GENERATION_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes to match backend SLA
const REPORT_GENERATION_TIMEOUT_BUFFER_MS = REPORT_GENERATION_TIMEOUT_MS + 5000 // Allow small buffer for client coordination

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Action creators
  setUserData: (userData: UserData) => void
  addEntry: (entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateEntry: (entry: BodyFatEntry) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  calculateAndUpdateProgression: (userData?: UserData) => Promise<void>
  generateNewReport: (userData?: UserData) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  clearAllData: () => void
  refreshWidgets: () => void
  subscribeToDataChanges: (callback: () => void) => () => void
  createNewProgram: () => string | null // Creates a new program and returns the program ID
  refreshKey: number // Exposed for widgets to track global refresh state
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

const ensureEatingPattern = (userData: UserData | null): UserData | null => {
  if (!userData) {
    return userData
  }
  const eatingPattern = userData.eating_pattern || 'standard'
  const eating_window_hours = userData.eating_window_hours ?? getEatingWindowHours(eatingPattern)
  return {
    ...userData,
    eating_pattern: eatingPattern,
    eating_window_hours,
  }
}

const initialState: AppState = {
  current_user: null,
  program_reference: null,
  entries: [],
  reports: [],
  current_calculation: null,
  loading: false,
  report_generation_status: '',
  report_generation_entry_date: null,
  error: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER_DATA':
      return {
        ...state,
        current_user: action.payload,
        error: null,
      }

    case 'SET_ENTRIES':
      return {
        ...state,
        entries: [...action.payload]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        error: null,
      }

    case 'ADD_ENTRY':
      return {
        ...state,
        entries: [action.payload, ...state.entries.filter(e => e.id !== action.payload.id)]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        error: null,
      }

    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map(e => e.id === action.payload.id ? action.payload : e),
        error: null,
      }

    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter(e => e.id !== action.payload),
        error: null,
      }

    case 'SET_CALCULATION_RESULT':
      return {
        ...state,
        current_calculation: action.payload,
        error: null,
      }

    case 'SET_REPORTS':
      return {
        ...state,
        reports: [...action.payload]
          .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()),
        error: null,
      }

    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports.filter(r => r.id !== action.payload.id)]
          .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()),
        error: null,
      }

    case 'SET_REPORT_GENERATION_STATUS':
      return {
        ...state,
        report_generation_status: action.payload.status,
        report_generation_entry_date: action.payload.entryDate ?? state.report_generation_entry_date,
      }

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      }

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      }

    case 'DELETE_REPORT':
      return {
        ...state,
        reports: state.reports.filter(report => report.id !== action.payload)
      }

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }

    case 'SET_PROGRAM_REFERENCE':
      return {
        ...state,
        program_reference: action.payload,
        // Also update current_user with the program reference
        current_user: state.current_user
          ? { ...state.current_user, program_reference: action.payload }
          : null,
        error: null,
      }

    default:
      return state
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refreshCallbacksRef = React.useRef<(() => void)[]>([])
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const refreshWidgets = React.useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      // Increment global refresh key for widgets that use it
      setRefreshKey(prev => prev + 1)
      refreshCallbacksRef.current.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error refreshing widget:', error)
        }
      })
      refreshTimeoutRef.current = null
    }, 50)
  }, [])

  const subscribeToDataChanges = React.useCallback((callback: () => void) => {
    refreshCallbacksRef.current = [...refreshCallbacksRef.current, callback]

    return () => {
      refreshCallbacksRef.current = refreshCallbacksRef.current.filter(cb => cb !== callback)
    }
  }, [])
  const mountedRef = useMountedRef()
  const { announceInfo, announceSuccess, announceError } = useAnnouncements()

  // Load initial data from storage
  useEffect(() => {
    let isMounted = true // Guard against updates after unmount

    const loadData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        // Try to migrate from localStorage first
        const migrated = await migrateFromLocalStorage()
        if (migrated) {
          console.log('Data migrated from localStorage to server')
        }

        const [
          userResult,
          entriesResult,
          reportsResult,
          calculationResult,
        ] = await Promise.allSettled([
          getUserData(),
          getEntries(),
          getReports(),
          getLastCalculationResult(),
        ])

        if (!isMounted) {
          return
        }

        let didUpdate = false

        if (userResult.status === 'fulfilled' && userResult.value) {
          dispatch({ type: 'SET_USER_DATA', payload: ensureEatingPattern(userResult.value)! })
          didUpdate = true
        } else if (userResult.status === 'rejected') {
          console.warn('Failed to load user profile:', userResult.reason)
        }

        if (entriesResult.status === 'fulfilled') {
          dispatch({ type: 'SET_ENTRIES', payload: entriesResult.value })
          didUpdate = true
        } else if (entriesResult.status === 'rejected') {
          console.warn('Failed to load entries:', entriesResult.reason)
        }

        if (reportsResult.status === 'fulfilled') {
          dispatch({ type: 'SET_REPORTS', payload: reportsResult.value })
          didUpdate = true
        } else if (reportsResult.status === 'rejected') {
          console.warn('Failed to load reports:', reportsResult.reason)
        }

        if (calculationResult.status === 'fulfilled' && calculationResult.value) {
          dispatch({ type: 'SET_CALCULATION_RESULT', payload: calculationResult.value })
          didUpdate = true
        } else if (calculationResult.status === 'rejected') {
          console.warn('Failed to load calculation result:', calculationResult.reason)
        }

        const allRejected =
          (userResult.status === 'rejected' || userResult.status === 'fulfilled' && !userResult.value) &&
          entriesResult.status === 'rejected' &&
          reportsResult.status === 'rejected' &&
          calculationResult.status === 'rejected'

        if (didUpdate) {
          dispatch({ type: 'CLEAR_ERROR' })
          refreshWidgets()
        } else if (allRejected) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load data from server' })
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        if (isMounted) {
          dispatch({ type: 'SET_ERROR', payload: 'Failed to load data from server' })
        }
      } finally {
        if (isMounted) {
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      }
    }

    loadData()

    // Cleanup function
    return () => {
      isMounted = false
    }
  }, [])

  // Cleanup refresh timeout on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const setUserData = (userData: UserData) => {
    const normalized = ensureEatingPattern(userData)!
    void saveUserData(normalized)
    dispatch({ type: 'SET_USER_DATA', payload: normalized })
  }

  const addEntry = async (entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!state.current_user) {
      dispatch({ type: 'SET_ERROR', payload: 'No user data available' })
      return
    }

    const now = new Date()
    const entry: BodyFatEntry = {
      ...entryData,
      id: generateId(),
      user_id: state.current_user.name, // Use name as user_id for simplicity
      program_id: state.current_user.current_program_id, // Link entry to current program
      created_at: now,
      updated_at: now,
    }

    let persistedEntry: BodyFatEntry
    try {
      persistedEntry = await saveEntry(entry)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save entry'
      dispatch({ type: 'SET_ERROR', payload: message })
      console.error('Error saving entry:', error)
      return
    }

    dispatch({ type: 'ADD_ENTRY', payload: persistedEntry })
    refreshWidgets()

    // Trigger recalculation with new entry
    try {
      if (!mountedRef.current) return
      dispatch({ type: 'SET_LOADING', payload: true })

      const entryForRecalc = {
        date: new Date(persistedEntry.date).toISOString().split('T')[0],
        weight: persistedEntry.weight,
        body_fat_percentage: persistedEntry.body_fat_percentage,
        notes: persistedEntry.notes,
      }

      const result = await fetchRecalculation(state.current_user, entryForRecalc)

      if (!mountedRef.current) return
      saveCalculationResult(result)
      dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })

      // Auto-generate report after each entry
      await generateNewReport(result.user_data)

      // Refresh all widgets after data update
      if (mountedRef.current) {
        refreshWidgets()
      }

    } catch (error) {
      if (!mountedRef.current) return
      const errorMessage = error instanceof CalculationError
        ? error.message
        : 'Failed to recalculate progression'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      if (mountedRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
  }

  const updateEntry = async (entry: BodyFatEntry) => {
    try {
      const persisted = await saveEntry(entry)
      dispatch({ type: 'UPDATE_ENTRY', payload: persisted })
      refreshWidgets()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update entry'
      dispatch({ type: 'SET_ERROR', payload: message })
      console.error('Error updating entry:', error)
    }
  }

  const deleteEntry = async (entryId: string) => {
    try {
      await deleteEntryFromStorage(entryId)
      dispatch({ type: 'DELETE_ENTRY', payload: entryId })
      refreshWidgets()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete entry'
      dispatch({ type: 'SET_ERROR', payload: message })
      console.error('Error deleting entry:', error)
    }
  }

  const calculateAndUpdateProgression = async (userData?: UserData) => {
    const userToCalculate = userData || state.current_user
    if (!userToCalculate) {
      if (mountedRef.current) {
        dispatch({ type: 'SET_ERROR', payload: 'No user data available for calculation' })
      }
      return
    }

    try {
      if (!mountedRef.current) return
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'CLEAR_ERROR' })

      const normalizedUser = ensureEatingPattern(userToCalculate)!
      const result = await fetchCalculation(normalizedUser)

      if (!mountedRef.current) return
      saveCalculationResult(result)
      dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })

    } catch (error) {
      if (!mountedRef.current) return
      const errorMessage = error instanceof CalculationError
        ? error.message
        : 'Failed to calculate progression'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      if (mountedRef.current) {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
  }

  const generateNewReport = async (userData?: UserData) => {
    console.log('[AppContext] generateNewReport invoked')

    // Note: Removed mountedRef check here as it was blocking report generation.
    // The report generation is a user-initiated action that should complete
    // regardless of component mount state. See SESSION_SUMMARY_2025-11-16.md

    const userToReport = userData || state.current_user
    if (!userToReport) {
      console.warn('[AppContext] No user data available, aborting report generation')
      dispatch({ type: 'SET_ERROR', payload: 'No user data available for report generation' })
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: {
          status: 'Report generation failed: missing user profile.',
        },
      })
      return
    }

    // Determine which entry will be used and record its date for diagnostics
    const latestEntryForReport = state.entries[0]
    const entryDateForStatus = latestEntryForReport
      ? new Date(latestEntryForReport.date).toISOString().split('T')[0]
      : undefined

    dispatch({
      type: 'SET_REPORT_GENERATION_STATUS',
      payload: {
        status: 'Starting report generation...',
        entryDate: entryDateForStatus,
      },
    })

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'CLEAR_ERROR' })
      console.log('[AppContext] Report generation started; latest entry date:', entryDateForStatus)
      announceInfo('Generating report. This may take up to 5 minutes.')

      // Add a timeout for the entire report generation process
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Report generation timed out. Please ensure the Python API is running.')),
          REPORT_GENERATION_TIMEOUT_BUFFER_MS
        ) // Mirrors backend timeout with slight buffer for client coordination
      )

      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: {
          status: 'Calculating progression for report...',
          entryDate: entryDateForStatus,
        },
      })


      // Update user data with latest entry if available
      let updatedUserData = { ...userToReport }
      console.log('[AppContext] entries available:', state.entries.length)
      if (state.entries.length > 0) {
        const latestEntry = state.entries[0] // entries are sorted by date desc
        updatedUserData.current_weight = latestEntry.weight
        if (latestEntry.body_fat_percentage) {
          updatedUserData.current_bf = latestEntry.body_fat_percentage
        }
      }
      updatedUserData = ensureEatingPattern(updatedUserData)!
      console.log('[AppContext] Using updated user data for report:', updatedUserData)

      // Always recalculate with the latest data for reports
      let calculationToUse: CalculationResult
      try {
        dispatch({
          type: 'SET_REPORT_GENERATION_STATUS',
          payload: {
            status: 'Requesting progression calculation from backend...',
            entryDate: entryDateForStatus,
          },
        })

        console.log('[AppContext] Calling fetchCalculation for report...')
        const result = await fetchCalculation(updatedUserData)

        // Note: Removed mountedRef check here - report generation is user-initiated
        // and should complete regardless of component re-renders. The check was
        // causing reports to abort silently after calculation succeeded.
        // See SESSION_SUMMARY for rationale.

        console.log('[AppContext] Calculation received for report generation')
        saveCalculationResult(result)
        dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })
        calculationToUse = result
      } catch (error) {
        const errorMessage = error instanceof CalculationError
          ? error.message
          : 'Failed to calculate progression for report'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        dispatch({
          type: 'SET_REPORT_GENERATION_STATUS',
          payload: {
            status: `Failed while calculating progression: ${errorMessage}`,
            entryDate: entryDateForStatus,
          },
        })
        return
      }

      if (!calculationToUse) {
        const message = 'Unable to generate calculation for report'
        dispatch({ type: 'SET_ERROR', payload: message })
        dispatch({
          type: 'SET_REPORT_GENERATION_STATUS',
          payload: {
            status: `Failed before report request: ${message}`,
            entryDate: entryDateForStatus,
          },
        })
        return
      }

      const now = new Date()
      const reportNumber = state.reports.length + 1
      const report: Report = {
        id: generateId(),
        user_id: updatedUserData.name,
        title: `Progress Report #${reportNumber} - ${now.toLocaleDateString()}`,
        generated_at: now,
        calculation_result: calculationToUse,
        html_content: "", // Will be populated by backend
      }

      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: {
          status: 'Requesting detailed report from Python service...',
          entryDate: entryDateForStatus,
        },
      })


      // Call backend to generate the full report with updated data
      // Ensure all required fields are present for Python API
      const completeUserData = {
        ...updatedUserData,
        // Ensure all required fields have default values if missing
        gender: updatedUserData.gender || 'm',
        height_feet: updatedUserData.height_feet || 5,
        height_inches: updatedUserData.height_inches || 10,
        height_cm: updatedUserData.height_cm || 177.8,
        dob: updatedUserData.dob || new Date(Date.now() - (updatedUserData.age * 365.25 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        start_date: updatedUserData.start_date || new Date().toISOString().split('T')[0],
        end_date: updatedUserData.end_date || new Date(Date.now() + (16 * 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        activity_level: updatedUserData.activity_level ?? 2,
        resistance_training: updatedUserData.resistance_training ?? true,
        is_athlete: updatedUserData.is_athlete ?? false,
        workout_type: updatedUserData.workout_type || 'General Fitness',
        workout_days: updatedUserData.workout_days ?? 3,
        job_activity: updatedUserData.job_activity ?? 2,
        leisure_activity: updatedUserData.leisure_activity ?? 2,
        protein_intake: updatedUserData.protein_intake ?? Math.round(updatedUserData.current_weight * 0.8),
        diet_type: updatedUserData.diet_type || 'balanced',
        ped_use: updatedUserData.ped_use ?? false,
        exercise_type: updatedUserData.exercise_type || 'resistance',
        sleep_quality: updatedUserData.sleep_quality || 'good',
        timeline_weeks: typeof updatedUserData.timeline_weeks === 'string' ? parseInt(updatedUserData.timeline_weeks) : updatedUserData.timeline_weeks || 16
      }

      console.log('[AppContext] Requesting Python-generated report...')
      const generatedReportData = await Promise.race([
        fetchGeneratedReport(completeUserData),
        timeoutPromise
      ]) as {
        html_content: string;
        markdown_path?: string;
        pdf_path?: string;
        html_path?: string;
        file_base?: string;
      }

      // Note: mountedRef check removed - user-initiated report generation should
      // complete regardless of component re-renders. The check was causing reports
      // to abort silently after fetchGeneratedReport succeeded.

      console.log('[AppContext] Report data received from Python service')


      const deriveFileBase = (data: { file_base?: string; pdf_path?: string }): string | undefined => {
        if (data.file_base) return data.file_base
        if (data.pdf_path) {
          const filename = data.pdf_path.split('/').pop()
          if (filename) {
            return filename.replace(/\.[^/.]+$/, "")
          }
        }
        return undefined
      }

      if (!generatedReportData?.html_content) {
        throw new Error('Report service did not return HTML content')
      }

      report.html_content = generatedReportData.html_content
      const fileBase = deriveFileBase(generatedReportData)
      report.file_base = fileBase
      report.file_path = generatedReportData.pdf_path
      report.pdf_path = generatedReportData.pdf_path
      report.markdown_path = generatedReportData.markdown_path
      report.html_path = generatedReportData.html_path

      const persistedReport = await saveReport(report)

      // Note: mountedRef check removed - user wants to see the report regardless of
      // React re-renders. The save already succeeded, so UI should update.

      console.log('[AppContext] Report saved successfully with id:', persistedReport.id)
      dispatch({ type: 'ADD_REPORT', payload: persistedReport })
      announceSuccess('Report generated successfully.')
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: {
          status: 'Report generated and saved successfully.',
          entryDate: entryDateForStatus,
        },
      })

    } catch (error) {
      // Note: mountedRef check removed - user should see error messages
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to generate report'
      console.error('[AppContext] Report generation failed:', errorMessage)
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      announceError(errorMessage)
      dispatch({
        type: 'SET_REPORT_GENERATION_STATUS',
        payload: {
          status: `Report generation failed: ${errorMessage}`,
          entryDate: entryDateForStatus,
        },
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const deleteReport = async (reportId: string) => {
    try {
      await deleteReportFromStorage(reportId)
      dispatch({ type: 'DELETE_REPORT', payload: reportId })
      refreshWidgets()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete report'
      dispatch({ type: 'SET_ERROR', payload: message })
      console.error('Error deleting report:', error)
    }
  }

  /**
   * Creates a new program with a fresh program reference snapshot.
   * This resets the dashboard delta calculations by creating a new
   * baseline from the current state.
   * @returns The new program ID, or null if no user data exists
   */
  const createNewProgram = React.useCallback((): string | null => {
    if (!state.current_user) {
      console.warn('[AppContext] Cannot create new program: no user data')
      return null
    }

    // Generate new program ID with timestamp
    const programId = `program-${Date.now()}`
    const now = new Date()

    // Get current weight/bf from latest entry or user data
    const latestEntry = state.entries[0]
    const currentWeight = latestEntry?.weight ?? state.current_user.current_weight
    const currentBF = latestEntry?.body_fat_percentage ?? state.current_user.current_bf

    // Create program reference snapshot
    const programReference = {
      start_date: now.toISOString().split('T')[0],
      initial_weight: currentWeight,
      initial_bf: currentBF,
    }

    // Dispatch to update state
    dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: programReference })

    // Update user data with new program ID
    const updatedUser = {
      ...state.current_user,
      current_program_id: programId,
      program_reference: programReference,
    }
    void saveUserData(updatedUser)
    dispatch({ type: 'SET_USER_DATA', payload: updatedUser })

    // Trigger refresh
    refreshWidgets()

    console.log('[AppContext] New program created:', programId, programReference)
    return programId
  }, [state.current_user, state.entries, refreshWidgets])

  const contextValue: AppContextType = {
    state,
    dispatch,
    setUserData,
    addEntry,
    updateEntry,
    deleteEntry,
    calculateAndUpdateProgression,
    generateNewReport,
    deleteReport,
    clearAllData,
    refreshWidgets,
    subscribeToDataChanges,
    createNewProgram,
    refreshKey,
  }

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Helper function to generate HTML report content
function generateReportHTML(calculation: CalculationResult): string {
  const { progression, confidence_score, ai_analysis } = calculation

  return `
    <div class="report-container">
      <h1>Body Fat Progress Report</h1>
      <h2>User: ${calculation.user_data?.name || 'User'}</h2>
      
      <section class="summary">
        <h3>Summary</h3>
        <ul>
          <li>Total Weight Loss: ${calculation.summary?.total_weight_loss?.toFixed(1) || 'N/A'} lbs</li>
          <li>Body Fat Reduction: ${calculation.summary?.body_fat_reduction?.toFixed(1) || 'N/A'}%</li>
          <li>Muscle Gain: ${calculation.summary?.muscle_gain?.toFixed(1) || 'N/A'} lbs</li>
          <li>Timeline: ${calculation.summary?.timeline_weeks || 'N/A'} weeks</li>
        </ul>
      </section>
      
      ${confidence_score ? `
        <section class="confidence">
          <h3>AI Confidence Score: ${confidence_score}/100</h3>
          ${ai_analysis ? `<p>${ai_analysis}</p>` : ''}
        </section>
      ` : ''}
      
      <section class="progression">
        <h3>Weekly Progression</h3>
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Weight (lbs)</th>
              <th>Body Fat %</th>
              <th>Daily Calories</th>
            </tr>
          </thead>
          <tbody>
            ${progression.map((week, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${week.weight.toFixed(1)}</td>
                <td>${week.body_fat_percentage.toFixed(1)}</td>
                <td>${Math.round(week.daily_calorie_intake)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `
}
