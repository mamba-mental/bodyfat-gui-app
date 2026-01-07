/**
 * Program Actions - Program management logic
 *
 * Handles creating new programs and program reference snapshots
 */

import { UserData, BodyFatEntry, AppAction, ProgramReferenceSnapshot } from '@/types'
import { saveUserData } from '@/lib/storage-api'

interface ProgramActionDeps {
  dispatch: React.Dispatch<AppAction>
  currentUser: UserData | null
  entries: BodyFatEntry[]
  refreshWidgets: () => void
}

/**
 * Creates a new program with a fresh program reference snapshot.
 * This resets the dashboard delta calculations by creating a new
 * baseline from the current state.
 * @returns The new program ID, or null if no user data exists
 */
export function createNewProgram(deps: ProgramActionDeps): string | null {
  const { dispatch, currentUser, refreshWidgets } = deps

  if (!currentUser) {
    console.warn('[ProgramActions] Cannot create new program: no user data')
    return null
  }

  // Generate new program ID with timestamp
  const programId = `program-${Date.now()}`
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // ALWAYS use profile data as baseline for new program
  // This ensures the user's actual current weight/BF is used, not stale entry data
  const currentWeight = currentUser.current_weight
  const currentBF = currentUser.current_bf
  console.log('[ProgramActions] Creating new program with profile baseline:', currentWeight, 'lbs,', currentBF, '% BF')

  // Create program reference snapshot
  const programReference: ProgramReferenceSnapshot = {
    start_date: todayStr,
    initial_weight: currentWeight,
    initial_bf: currentBF,
  }

  // Dispatch to update state
  dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: programReference })

  // Update user data with new program ID
  const updatedUser = {
    ...currentUser,
    current_program_id: programId,
    program_reference: programReference,
  }
  void saveUserData(updatedUser)
  dispatch({ type: 'SET_USER_DATA', payload: updatedUser })

  // Trigger refresh
  refreshWidgets()

  console.log('[ProgramActions] New program created:', programId, programReference)
  return programId
}

interface DeleteReportDeps {
  dispatch: React.Dispatch<AppAction>
  refreshWidgets: () => void
}

export async function deleteReport(
  reportId: string,
  deleteReportFromStorage: (id: string) => Promise<void>,
  deps: DeleteReportDeps
): Promise<void> {
  const { dispatch, refreshWidgets } = deps

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
