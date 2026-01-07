/**
 * Entry Actions - Entry CRUD operations
 *
 * Handles adding, updating, and deleting body fat entries
 */

import { UserData, BodyFatEntry, CalculationResult, AppAction } from '@/types'
import {
  saveEntry,
  saveCalculationResult,
  generateId,
  deleteEntry as deleteEntryFromStorage,
  fetchRecalculation
} from '@/lib/storage-api'
import { CalculationError } from '@/lib/calculations'

interface EntryActionDeps {
  dispatch: React.Dispatch<AppAction>
  currentUser: UserData | null
  mountedRef: React.RefObject<boolean>
  refreshWidgets: () => void
  generateNewReport: (userData: UserData) => Promise<void>
}

export async function addEntry(
  entryData: Omit<BodyFatEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
  deps: EntryActionDeps
): Promise<void> {
  const { dispatch, currentUser, mountedRef, refreshWidgets, generateNewReport } = deps

  if (!currentUser) {
    dispatch({ type: 'SET_ERROR', payload: 'No user data available' })
    return
  }

  const now = new Date()
  const entry: BodyFatEntry = {
    ...entryData,
    id: generateId(),
    user_id: currentUser.name,
    program_id: currentUser.current_program_id,
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

    const result = await fetchRecalculation(currentUser, entryForRecalc)

    if (!mountedRef.current) return
    saveCalculationResult(result)
    dispatch({ type: 'SET_CALCULATION_RESULT', payload: result })

    // Auto-generate report after each entry
    await generateNewReport(result.user_data)

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

interface UpdateEntryDeps {
  dispatch: React.Dispatch<AppAction>
  refreshWidgets: () => void
}

export async function updateEntry(
  entry: BodyFatEntry,
  deps: UpdateEntryDeps
): Promise<void> {
  const { dispatch, refreshWidgets } = deps

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

interface DeleteEntryDeps {
  dispatch: React.Dispatch<AppAction>
  refreshWidgets: () => void
}

export async function deleteEntry(
  entryId: string,
  deps: DeleteEntryDeps
): Promise<void> {
  const { dispatch, refreshWidgets } = deps

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
