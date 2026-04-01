/**
 * Program Actions - Program management logic
 *
 * Handles creating new programs, program reference snapshots, and archiving
 */

import { UserData, BodyFatEntry, AppAction, ProgramReferenceSnapshot, ArchivedProgram, ProgramSummary } from '@/types'
import { saveUserData } from '@/lib/storage-api'
import { config } from '@/lib/config'

interface ProgramActionDeps {
  dispatch: React.Dispatch<AppAction>
  currentUser: UserData | null
  entries: BodyFatEntry[]
  refreshWidgets: () => void
  /** Override weight for new program (use when state hasn't updated yet) */
  overrideWeight?: number
  /** Override body fat for new program (use when state hasn't updated yet) */
  overrideBf?: number
}

/**
 * Creates a new program with a fresh program reference snapshot.
 * This resets the dashboard delta calculations by creating a new
 * baseline from the current state.
 * @returns The new program ID, or null if no user data exists
 */
export function createNewProgram(deps: ProgramActionDeps): string | null {
  const { dispatch, currentUser, refreshWidgets, overrideWeight, overrideBf } = deps

  if (!currentUser) {
    console.warn('[ProgramActions] Cannot create new program: no user data')
    return null
  }

  // Generate new program ID with timestamp
  const programId = `program-${Date.now()}`
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Use override values if provided (for when state hasn't updated yet)
  // Otherwise fall back to current user profile data
  const currentWeight = overrideWeight ?? currentUser.current_weight
  const currentBF = overrideBf ?? currentUser.current_bf
  console.log('[ProgramActions] Creating new program with baseline:', currentWeight, 'lbs,', currentBF, '% BF', overrideWeight ? '(from override)' : '(from profile)')

  // Create program reference snapshot
  const programReference: ProgramReferenceSnapshot = {
    start_date: todayStr,
    initial_weight: currentWeight,
    initial_bf: currentBF,
  }

  // Dispatch to update state
  dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: programReference })

  // Calculate default end date (16 weeks from today)
  const defaultWeeks = currentUser.timeline_weeks || 16
  const endDate = new Date(now.getTime() + (defaultWeeks * 7 * 24 * 60 * 60 * 1000))
  const endDateStr = endDate.toISOString().split('T')[0]

  // Update user data with new program ID AND new start/end dates
  // Also update current_weight and current_bf if override values were provided
  const updatedUser = {
    ...currentUser,
    current_program_id: programId,
    program_reference: programReference,
    start_date: todayStr, // Update start_date for new program
    end_date: endDateStr, // Update end_date for new program
    // Use override values to ensure dashboard shows correct current stats
    current_weight: currentWeight,
    current_bf: currentBF,
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

interface ArchiveProgramDeps extends ProgramActionDeps {
  programReference: ProgramReferenceSnapshot | null
}

/**
 * Archives the current program and creates a new one.
 * - Calculates summary statistics
 * - Saves archived program to storage
 * - Creates a new active program
 * @returns The archived program, or null if archiving failed
 */
export async function archiveProgram(
  name: string,
  notes: string,
  deps: ArchiveProgramDeps
): Promise<ArchivedProgram | null> {
  const { dispatch, currentUser, entries, programReference, refreshWidgets } = deps

  if (!currentUser || !programReference) {
    console.warn('[ProgramActions] Cannot archive program: missing user data or program reference')
    return null
  }

  // Get current program entries (filter by current_program_id if set)
  const currentProgramId = currentUser.current_program_id
  const programEntries = currentProgramId
    ? entries.filter(e => e.program_id === currentProgramId || !e.program_id)
    : entries

  if (programEntries.length === 0) {
    console.warn('[ProgramActions] Cannot archive program: no entries')
    return null
  }

  // Calculate final metrics from latest entry
  const latestEntry = programEntries[0] // Entries are sorted newest first
  const finalWeight = latestEntry?.weight || currentUser.current_weight
  const finalBf = latestEntry?.body_fat_percentage || currentUser.current_bf

  // Calculate duration
  const startDate = new Date(programReference.start_date)
  const endDate = new Date()
  const durationDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const durationWeeks = durationDays / 7

  // Calculate changes
  const totalWeightChange = finalWeight - programReference.initial_weight
  const totalBfChange = finalBf - programReference.initial_bf
  const averageWeeklyLoss = durationWeeks > 0 ? Math.abs(totalWeightChange) / durationWeeks : 0

  // Find best entry (lowest weight or lowest BF)
  const bestEntry = programEntries.reduce((best, entry) => {
    const entryWeight = entry.weight
    const entryBf = entry.body_fat_percentage || Infinity
    const bestWeight = best?.weight || Infinity
    const bestBf = best?.body_fat_percentage || Infinity

    // Prefer lower weight, then lower BF
    if (entryWeight < bestWeight || (entryWeight === bestWeight && entryBf < bestBf)) {
      return entry
    }
    return best
  }, programEntries[0])

  // Create program summary
  const summary: ProgramSummary = {
    total_weight_change: totalWeightChange,
    total_bf_change: totalBfChange,
    duration_days: durationDays,
    average_weekly_loss: averageWeeklyLoss,
    entries_count: programEntries.length,
    best_entry: bestEntry ? {
      date: typeof bestEntry.date === 'string' ? bestEntry.date : bestEntry.date.toISOString(),
      weight: bestEntry.weight,
      bf: bestEntry.body_fat_percentage || 0,
    } : undefined,
    notes: notes || undefined,
  }

  // Create archived program
  const archivedProgram: ArchivedProgram = {
    id: currentProgramId || `program-${Date.now()}`,
    name: name || `Program ${startDate.toLocaleDateString()}`,
    status: 'archived',
    created_at: programReference.start_date,
    archived_at: endDate.toISOString(),
    start_date: programReference.start_date,
    end_date: endDate.toISOString().split('T')[0],
    initial_weight: programReference.initial_weight,
    initial_bf: programReference.initial_bf,
    final_weight: finalWeight,
    final_bf: finalBf,
    entry_count: programEntries.length,
    summary,
  }

  try {
    // Save to Python API
    const response = await fetch(`${config.pythonApi.url}/api/programs/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notes }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || 'Failed to archive program')
    }

    // Use the server response as the source of truth
    const data = await response.json()

    // Dispatch archive action with the server-confirmed archived program
    dispatch({ type: 'ARCHIVE_PROGRAM', payload: data.archived_program ?? archivedProgram })

    // Update user data from server response (has new program_id, dates, etc.)
    if (data.updated_user) {
      dispatch({ type: 'SET_USER_DATA', payload: data.updated_user })
      dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: data.updated_user.program_reference ?? null })
    } else {
      // Fallback if server doesn't return updated_user (backwards compat)
      dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: null })
    }

    refreshWidgets()
    console.log('[ProgramActions] Program archived successfully, ready for new baseline:', archivedProgram.id)
    return archivedProgram
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to archive program'
    dispatch({ type: 'SET_ERROR', payload: message })
    console.error('[ProgramActions] Error archiving program:', error)
    return null
  }
}

/**
 * Fetches archived programs from the Python API
 */
export async function fetchArchivedPrograms(
  dispatch: React.Dispatch<AppAction>
): Promise<ArchivedProgram[]> {
  try {
    const response = await fetch(`${config.pythonApi.url}/api/programs`)
    if (!response.ok) {
      throw new Error('Failed to fetch programs')
    }

    const data = await response.json()
    const archivedPrograms = data.archived || []

    dispatch({ type: 'SET_ARCHIVED_PROGRAMS', payload: archivedPrograms })
    return archivedPrograms
  } catch (error) {
    console.error('[ProgramActions] Error fetching archived programs:', error)
    return []
  }
}
