"use client"

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { UserData, BodyFatEntry, AppAction } from '@/types'
import {
  getUserData,
  getEntries,
  getReports,
  getLastCalculationResult,
  saveUserData,
  clearAllData,
  migrateFromLocalStorage,
  deleteReport as deleteReportFromStorage
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
  generateNewReport: (userData?: UserData) => Promise<void>
  deleteReport: (reportId: string) => Promise<void>
  clearAllData: () => void
  refreshWidgets: () => void
  subscribeToDataChanges: (callback: () => void) => () => void
  createNewProgram: () => string | null
  refreshKey: number
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

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
      dispatch({ type: 'SET_LOADING', payload: true })

      try {
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

  const generateNewReport = React.useCallback(async (userData?: UserData) => {
    const userToReport = userData || state.current_user
    await generateReportAction(userToReport, {
      dispatch,
      entries: state.entries,
      reports: state.reports,
      announceInfo,
      announceSuccess,
      announceError,
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

  const createNewProgram = React.useCallback((): string | null => {
    return createProgramAction({
      dispatch,
      currentUser: state.current_user,
      entries: state.entries,
      refreshWidgets,
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
