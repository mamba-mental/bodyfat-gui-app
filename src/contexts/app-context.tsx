"use client"

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { UserData, BodyFatEntry, AppAction, AppState } from '@/types'
import {
  getUserData,
  getEntries,
  getReports,
  getLastCalculationResult,
  saveUserData,
  clearAllData,
  migrateFromLocalStorage,
  deleteReport as deleteReportFromStorage,
  initializeDataSync,
  getSyncStatus
} from '@/lib/storage-api'
import { useMountedRef } from '@/hooks/use-mounted-ref'
import { useAnnouncements } from '@/hooks/use-announcements'

// Import modular reducers and actions
import { appReducer, initialState } from './app/reducers'
import { ensureEatingPattern } from './app/actions/calculation-actions'
import {
  addEntry as addEntryAction,
  updateEntry as updateEntryAction,
  deleteEntry as deleteEntryAction
} from './app/actions/entry-actions'
import {
  calculateAndUpdateProgression as calculateAction
} from './app/actions/calculation-actions'
import {
  generateReport as generateReportAction
} from './app/actions/report-actions'
import {
  createNewProgram as createProgramAction,
  deleteReport as deleteReportAction
} from './app/actions/program-actions'

interface AppContextType {
  state: ReturnType<typeof appReducer>
  dispatch: React.Dispatch<AppAction>
  setUserData: (userData: UserData) => void
  addEntry: (entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateEntry: (entry: BodyFatEntry) => Promise<void>
  deleteEntry: (entryId: string) => Promise<void>
  calculateAndUpdateProgression: (userData?: UserData) => Promise<void>
  generateNewReport: (userData?: UserData, opts?: { sourceFingerprint?: string; cycleId?: string }) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  clearAllData: () => void
  refreshWidgets: () => void
  subscribeToDataChanges: (callback: () => void) => () => void
  createNewProgram: (overrideWeight?: number, overrideBf?: number) => string | null
  refreshKey: number
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

// Cache duration for data fetches (60 seconds for better UX)
const DATA_CACHE_DURATION_MS = 60 * 1000
const SESSION_CACHE_KEY = 'appContext_lastFetch'
const SESSION_DATA_KEY = 'appContext_cachedData'

// Helper to safely access sessionStorage
const getSessionTimestamp = (): number => {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(sessionStorage.getItem(SESSION_CACHE_KEY) || '0', 10)
  } catch {
    return 0
  }
}

const setSessionTimestamp = (timestamp: number): void => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, String(timestamp))
  } catch {
    // Ignore sessionStorage errors
  }
}

const getCachedData = (): Partial<AppState> | null => {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(SESSION_DATA_KEY)
    return cached ? JSON.parse(cached) : null
  } catch {
    return null
  }
}

const setCachedData = (data: Partial<AppState>): void => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_DATA_KEY, JSON.stringify(data))
  } catch {
    // Ignore sessionStorage errors
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const refreshCallbacksRef = React.useRef<(() => void)[]>([])
  const refreshTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  // Initialize from sessionStorage for hot reload persistence
  const lastFetchTimestampRef = React.useRef<number>(getSessionTimestamp())
  const forceRefreshRef = React.useRef<boolean>(false)
  const initialDataLoadedRef = React.useRef<boolean>(false)

  const refreshWidgets = React.useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Mark that we need a forced refresh (bypass cache)
    forceRefreshRef.current = true

    refreshTimeoutRef.current = setTimeout(() => {
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
    let isMounted = true

    const loadData = async () => {
      // Step 1: Immediately restore from sessionStorage for instant display
      if (!initialDataLoadedRef.current) {
        const cached = getCachedData()
        if (cached) {
          console.log('[AppContext] Restoring from sessionStorage for instant display')
          if (cached.current_user) {
            dispatch({ type: 'SET_USER_DATA', payload: cached.current_user })
          }
          if (cached.entries && cached.entries.length > 0) {
            dispatch({ type: 'SET_ENTRIES', payload: cached.entries })
          }
          if (cached.reports && cached.reports.length > 0) {
            dispatch({ type: 'SET_REPORTS', payload: cached.reports })
          }
          if (cached.current_calculation) {
            dispatch({ type: 'SET_CALCULATION_RESULT', payload: cached.current_calculation })
          }
        }
        initialDataLoadedRef.current = true
      }

      // Step 2: Check if we can skip fetching (use cached data)
      const now = Date.now()
      const timeSinceLastFetch = now - lastFetchTimestampRef.current
      const hasExistingData = state.current_user !== null || state.entries.length > 0

      // Skip fetch if data was loaded recently and no forced refresh
      if (hasExistingData && timeSinceLastFetch < DATA_CACHE_DURATION_MS && !forceRefreshRef.current) {
        console.log('[AppContext] Using cached data, skipping fetch (age: ' + Math.round(timeSinceLastFetch / 1000) + 's)')
        return
      }

      // Reset force refresh flag
      forceRefreshRef.current = false

      dispatch({ type: 'SET_LOADING', payload: true })

      try {
        // Initialize data sync (warm Redis cache from SQLite if needed)
        try {
          await initializeDataSync()
          console.log('[AppContext] Data sync initialized successfully')
        } catch (syncError) {
          console.warn('[AppContext] Data sync initialization failed, continuing with fallback:', syncError)
        }

        const migrated = await migrateFromLocalStorage()
        if (migrated) {
          console.log('Data migrated from localStorage to server')
        }

        const [userResult, entriesResult, reportsResult, calculationResult] = await Promise.allSettled([
          getUserData(),
          getEntries(),
          getReports(),
          getLastCalculationResult(),
        ])

        if (!isMounted) return

        let didUpdate = false

        if (userResult.status === 'fulfilled' && userResult.value) {
          dispatch({ type: 'SET_USER_DATA', payload: ensureEatingPattern(userResult.value)! })
          didUpdate = true
        } else {
          // DataSync returned null or rejected — try direct API fallback
          console.warn('DataSync user load failed, trying direct API fallback')
          try {
            const fallbackRes = await fetch('/api/data/user')
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              if (fallbackData && fallbackData.name) {
                dispatch({ type: 'SET_USER_DATA', payload: ensureEatingPattern(fallbackData)! })
                didUpdate = true
                console.log('[AppContext] Loaded user from direct API fallback:', fallbackData.name)
              }
            }
          } catch (e) {
            console.warn('Direct API fallback also failed:', e)
          }
        }

        if (entriesResult.status === 'fulfilled' && entriesResult.value && entriesResult.value.length > 0) {
          dispatch({ type: 'SET_ENTRIES', payload: entriesResult.value })
          didUpdate = true
        } else {
          // Entries fallback
          try {
            const fallbackRes = await fetch('/api/data/entries')
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              if (Array.isArray(fallbackData) && fallbackData.length > 0) {
                dispatch({ type: 'SET_ENTRIES', payload: fallbackData })
                didUpdate = true
                console.log('[AppContext] Loaded entries from direct API fallback:', fallbackData.length)
              }
            }
          } catch (e) {
            console.warn('Direct entries API fallback failed:', e)
          }
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
          // Update cache timestamp after successful fetch
          const fetchTimestamp = Date.now()
          lastFetchTimestampRef.current = fetchTimestamp
          setSessionTimestamp(fetchTimestamp)
          // Save data to sessionStorage for instant restore on hot reload
          setCachedData({
            current_user: userResult.status === 'fulfilled' ? ensureEatingPattern(userResult.value) : null,
            entries: entriesResult.status === 'fulfilled' ? entriesResult.value : [],
            reports: reportsResult.status === 'fulfilled' ? reportsResult.value : [],
            current_calculation: calculationResult.status === 'fulfilled' ? calculationResult.value : null,
          })
          // Note: Don't call refreshWidgets here as it would trigger another fetch
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
    return () => { isMounted = false }
  }, [refreshWidgets])

  // Cleanup refresh timeout on unmount
  React.useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  // Action wrappers that inject dependencies
  const setUserData = React.useCallback((userData: UserData) => {
    const normalized = ensureEatingPattern(userData)!
    void saveUserData(normalized)
    dispatch({ type: 'SET_USER_DATA', payload: normalized })
  }, [])

  const generateNewReport = React.useCallback(async (
    userData?: UserData,
    opts?: { sourceFingerprint?: string; cycleId?: string }
  ) => {
    const userToReport = userData || state.current_user
    await generateReportAction(userToReport, {
      dispatch,
      entries: state.entries,
      reports: state.reports,
      announceInfo,
      announceSuccess,
      announceError,
      sourceFingerprint: opts?.sourceFingerprint,
      cycleId: opts?.cycleId,
    })
  }, [state.current_user, state.entries, state.reports, announceInfo, announceSuccess, announceError])

  const addEntry = React.useCallback(async (
    entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    await addEntryAction(entryData, {
      dispatch,
      currentUser: state.current_user,
      mountedRef,
      refreshWidgets,
      generateNewReport,
    })
  }, [state.current_user, mountedRef, refreshWidgets, generateNewReport])

  const updateEntry = React.useCallback(async (entry: BodyFatEntry) => {
    await updateEntryAction(entry, { dispatch, refreshWidgets })
  }, [refreshWidgets])

  const deleteEntry = React.useCallback(async (entryId: string) => {
    await deleteEntryAction(entryId, { dispatch, refreshWidgets })
  }, [refreshWidgets])

  const calculateAndUpdateProgression = React.useCallback(async (userData?: UserData) => {
    await calculateAction(userData, {
      dispatch,
      currentUser: state.current_user,
      mountedRef,
    })
  }, [state.current_user, mountedRef])

  const deleteReport = React.useCallback(async (reportId: string) => {
    await deleteReportAction(reportId, deleteReportFromStorage, { dispatch, refreshWidgets })
  }, [refreshWidgets])

  const createNewProgram = React.useCallback((overrideWeight?: number, overrideBf?: number): string | null => {
    return createProgramAction({
      dispatch,
      currentUser: state.current_user,
      entries: state.entries,
      refreshWidgets,
      overrideWeight,
      overrideBf,
    })
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
