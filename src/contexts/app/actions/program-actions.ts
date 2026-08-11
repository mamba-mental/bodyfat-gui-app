/**
 * Program Actions - Program management logic
 *
 * Handles creating new programs, program reference snapshots, and archiving
 */

import { UserData, BodyFatEntry, AppAction, ProgramReferenceSnapshot, ArchivedProgram, ProgramSummary } from '@/types'
import { config } from '@/lib/config'
import { buildStandardCycleForProgram } from '@/lib/programCycle'

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
export async function createNewProgram(
  deps: ProgramActionDeps,
  profileOverride?: UserData,
): Promise<string | null> {
  const { dispatch, currentUser, refreshWidgets } = deps
  const profile = profileOverride ?? currentUser

  if (!profile) {
    console.warn('[ProgramActions] Cannot create new program: no user data')
    return null
  }

  const stamp = Date.now()
  const programId = `program-${stamp}`
  const todayStr = new Date().toLocaleDateString('en-CA')
  const cycle = buildStandardCycleForProgram(profile, {
    id: `cyc-${stamp}`,
    startDate: todayStr,
  })

  // Create program reference snapshot
  const programReference: ProgramReferenceSnapshot = {
    start_date: todayStr,
    initial_weight: profile.current_weight,
    initial_bf: profile.current_bf,
  }

  // Update user data with new program ID AND new start/end dates
  // Also update current_weight and current_bf if override values were provided
  const updatedUser = {
    ...profile,
    current_program_id: programId,
    program_reference: programReference,
    start_date: todayStr,
    end_date: cycle.end_date,
  }

  try {
    let previousActiveCycle: Record<string, unknown> | null = null
    try {
      const existingResponse = await fetch('/api/data/cycles', { cache: 'no-store' })
      const existingCycles = existingResponse.ok ? await existingResponse.json() : []
      previousActiveCycle = Array.isArray(existingCycles)
        ? existingCycles.find((candidate) => candidate?.status === 'active') ?? null
        : null
    } catch {
      // Compensation can still stop the new cycle when no prior cycle resolves.
    }

    // The cycle is the aggregate used by reports, check-ins, and reminders.
    // Persist it as part of the same user action as the editable profile copy.
    const cycleResponse = await fetch('/api/data/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cycle),
    })
    if (!cycleResponse.ok) throw new Error(`Failed to create ReComp cycle (${cycleResponse.status})`)

    const compensateCycle = async () => {
      const rollback = previousActiveCycle
        ? { ...previousActiveCycle, status: 'active' }
        : { ...cycle, status: 'stopped' }
      await fetch('/api/data/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rollback),
      }).catch(() => undefined)
    }

    let userResponse: Response
    try {
      userResponse = await fetch('/api/data/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      })
    } catch (error) {
      await compensateCycle()
      throw error
    }
    if (!userResponse.ok) {
      // Compensate so a failed profile write cannot leave the new cycle active.
      await compensateCycle()
      throw new Error(`Failed to save the new program profile (${userResponse.status})`)
    }

    dispatch({ type: 'SET_PROGRAM_REFERENCE', payload: programReference })
    dispatch({ type: 'SET_USER_DATA', payload: updatedUser })
    refreshWidgets()
    return programId
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start new program'
    dispatch({ type: 'SET_ERROR', payload: message })
    console.error('[ProgramActions] Failed to create new program:', error)
    return null
  }
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
