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
  saveReports,
  saveCalculationResult,
  generateId,
  clearAllData,
  migrateFromLocalStorage,
  deleteReport as deleteReportFromStorage,
  fetchGeneratedReport,
  fetchCalculation,
  fetchRecalculation
} from '@/lib/storage-api'
import { CalculationError } from '@/lib/calculations'

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Action creators
  setUserData: (userData: UserData) => void
  addEntry: (entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateEntry: (entry: BodyFatEntry) => void
  deleteEntry: (entryId: string) => void
  calculateAndUpdateProgression: (userData?: UserData) => Promise<void>
  generateNewReport: (userData?: UserData) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  clearAllData: () => void
  refreshWidgets: () => void
  subscribeToDataChanges: (callback: () => void) => () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const initialState: AppState = {
  current_user: null,
  entries: [],
  reports: [],
  current_calculation: null,
  loading: false,
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
    
    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports.filter(r => r.id !== action.payload.id)]
          .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()),
        error: null,
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
    
    default:
      return state
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const refreshCallbacksRef = React.useRef<(() => void)[]>([])

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
        
        // Load data from server
        const userData = await getUserData()
        const entries = await getEntries()
        const reports = await getReports()
        const lastCalculation = await getLastCalculationResult()

        // Only update state if component is still mounted
        if (isMounted) {
          if (userData) {
            dispatch({ type: 'SET_USER_DATA', payload: userData })
          }

          entries.forEach(entry => {
            dispatch({ type: 'ADD_ENTRY', payload: entry })
          })

          reports.forEach(report => {
            dispatch({ type: 'ADD_REPORT', payload: report })
          })

          if (lastCalculation) {
            dispatch({ type: 'SET_CALCULATION_RESULT', payload: lastCalculation })
          }
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
    saveUserData(userData)
    dispatch({ type: 'SET_USER_DATA', payload: userData })
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
      created_at: now,
      updated_at: now,
    }

    // Save entry
    saveEntry(entry)
    dispatch({ type: 'ADD_ENTRY', payload: entry })

    // Trigger recalculation with new entry
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const entryForRecalc = {
        date: entry.date.toISOString().split('T')[0],
        weight: entry.weight,
        body_fat_percentage: entry.body_fat_percentage,
        notes: entry.notes,
      }

      const result = await fetchRecalculation(state.current_user, entryForRecalc)
      
      saveCalculationResult(result)
      dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })
      
      // Auto-generate report after each entry
      await generateNewReport(result.user_data)
      
      // Refresh all widgets after data update
      refreshWidgets()
      
    } catch (error) {
      const errorMessage = error instanceof CalculationError 
        ? error.message 
        : 'Failed to recalculate progression'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const updateEntry = (entry: BodyFatEntry) => {
    saveEntry(entry)
    dispatch({ type: 'UPDATE_ENTRY', payload: entry })
  }

  const deleteEntry = (entryId: string) => {
    dispatch({ type: 'DELETE_ENTRY', payload: entryId })
  }

  const calculateAndUpdateProgression = async (userData?: UserData) => {
    const userToCalculate = userData || state.current_user
    if (!userToCalculate) {
      dispatch({ type: 'SET_ERROR', payload: 'No user data available for calculation' })
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'CLEAR_ERROR' })
      
      const result = await fetchCalculation(userToCalculate)
      
      saveCalculationResult(result)
      dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })
      
    } catch (error) {
      const errorMessage = error instanceof CalculationError 
        ? error.message 
        : 'Failed to calculate progression'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const generateNewReport = async (userData?: UserData) => {
    const userToReport = userData || state.current_user
    if (!userToReport) {
      dispatch({ type: 'SET_ERROR', payload: 'No user data available for report generation' })
      return
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'CLEAR_ERROR' })
      
      // Add a timeout for the entire report generation process
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Report generation timed out. Please ensure the Python API is running.')), 35000) // 35 seconds total (5s buffer over API timeout)
      )

      // Update user data with latest entry if available
      let updatedUserData = { ...userToReport }
      if (state.entries.length > 0) {
        const latestEntry = state.entries[0] // entries are sorted by date desc
        updatedUserData.current_weight = latestEntry.weight
        if (latestEntry.body_fat_percentage) {
          updatedUserData.current_bf = latestEntry.body_fat_percentage
        }
      }

      // Always recalculate with the latest data for reports
      let calculationToUse: CalculationResult
      try {
        const result = await fetchCalculation(updatedUserData)
        saveCalculationResult(result)
        dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })
        calculationToUse = result
      } catch (error) {
        const errorMessage = error instanceof CalculationError 
          ? error.message 
          : 'Failed to calculate progression for report'
        dispatch({ type: 'SET_ERROR', payload: errorMessage })
        return
      }

      if (!calculationToUse) {
        dispatch({ type: 'SET_ERROR', payload: 'Unable to generate calculation for report' })
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
        experience_level: updatedUserData.experience_level || 'intermediate',
        volume_score: updatedUserData.volume_score ?? 5,
        intensity_score: updatedUserData.intensity_score ?? 5,
        frequency_score: updatedUserData.frequency_score ?? 5,
        is_bodybuilder: updatedUserData.is_bodybuilder ?? false,
        protein_intake: updatedUserData.protein_intake ?? Math.round(updatedUserData.current_weight * 0.8),
        diet_type: updatedUserData.diet_type || 'balanced',
        ped_use: updatedUserData.ped_use ?? false,
        exercise_type: updatedUserData.exercise_type || 'resistance',
        sleep_quality: updatedUserData.sleep_quality || 'good',
        timeline_weeks: typeof updatedUserData.timeline_weeks === 'string' ? parseInt(updatedUserData.timeline_weeks) : updatedUserData.timeline_weeks || 16
      }
      
      // Race between report generation and timeout
      const generatedReportData = await Promise.race([
        fetchGeneratedReport(completeUserData),
        timeoutPromise
      ]) as { html_content: string; markdown_path: string; pdf_path: string }
      
      report.html_content = generatedReportData.html_content

      saveReport(report)
      dispatch({ type: 'ADD_REPORT', payload: report })
      
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to generate report'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const deleteReport = async (reportId: string) => {
    // Remove from server storage
    await deleteReportFromStorage(reportId)
    
    // Update state
    dispatch({ type: 'DELETE_REPORT', payload: reportId })
  }

  // Widget refresh system with guard against rapid calls
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const refreshWidgets = React.useCallback(() => {
    // Cancel any pending refresh
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    // Debounce refresh calls to prevent rapid updates
    refreshTimeoutRef.current = setTimeout(() => {
      refreshCallbacksRef.current.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Error refreshing widget:', error)
        }
      })
      refreshTimeoutRef.current = null
    }, 50) // 50ms debounce
  }, [])

  const subscribeToDataChanges = (callback: () => void) => {
    refreshCallbacksRef.current = [...refreshCallbacksRef.current, callback]
    
    // Return unsubscribe function
    return () => {
      refreshCallbacksRef.current = refreshCallbacksRef.current.filter(cb => cb !== callback)
    }
  }

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