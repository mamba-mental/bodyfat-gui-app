/**
 * App Reducer - State management for the application
 *
 * Handles all state updates via actions dispatched from AppProvider
 */

import { AppState, AppAction } from '@/types'

// F11: a finite millisecond timestamp, or 0 when the value is missing/unparseable.
// new Date(undefined|'').getTime() is NaN, and Array.sort with NaN comparisons is
// implementation-defined (rows land in arbitrary positions). Coalescing to 0 makes
// missing-timestamp rows sort last deterministically.
const safeTime = (value: unknown): number => {
  if (value == null) return 0
  const t = new Date(value as string).getTime()
  return Number.isNaN(t) ? 0 : t
}

// Newest-first by entry date.
const byEntryDateDesc = <T extends { date?: unknown }>(a: T, b: T) =>
  safeTime(b.date) - safeTime(a.date)

// Newest-first by report timestamp, coalescing the fields a report may carry.
const byReportDateDesc = <T extends { generated_at?: unknown; date?: unknown; created_at?: unknown }>(
  a: T,
  b: T,
) =>
  safeTime(b.generated_at ?? b.date ?? b.created_at) -
  safeTime(a.generated_at ?? a.date ?? a.created_at)

export const initialState: AppState = {
  current_user: null,
  program_reference: null,
  entries: [],
  reports: [],
  current_calculation: null,
  loading: false,
  report_generation_status: '',
  report_generation_entry_date: null,
  error: null,
  cycle_sync: null,
}

export function appReducer(state: AppState, action: AppAction): AppState {
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
        entries: [...action.payload].sort(byEntryDateDesc),
        error: null,
      }

    case 'ADD_ENTRY':
      return {
        ...state,
        entries: [action.payload, ...state.entries.filter(e => e.id !== action.payload.id)]
          .sort(byEntryDateDesc),
        error: null,
      }

    case 'UPDATE_ENTRY':
      // HIGH-8: re-sort after an in-place edit. A date change can move the entry,
      // and many widgets read entries[0] as "latest" — without this re-sort an
      // edited date silently corrupts current-weight + every progress metric.
      return {
        ...state,
        entries: state.entries
          .map(e => e.id === action.payload.id ? action.payload : e)
          .sort(byEntryDateDesc),
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
        reports: [...action.payload].sort(byReportDateDesc),
        error: null,
      }

    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports.filter(r => r.id !== action.payload.id)]
          .sort(byReportDateDesc),
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
        current_user: state.current_user
          ? { ...state.current_user, program_reference: action.payload }
          : null,
        error: null,
      }

    case 'ARCHIVE_PROGRAM':
      return {
        ...state,
        current_user: state.current_user
          ? {
              ...state.current_user,
              archived_programs: [
                action.payload,
                ...(state.current_user.archived_programs || [])
              ]
            }
          : null,
        error: null,
      }

    case 'SET_ARCHIVED_PROGRAMS':
      return {
        ...state,
        current_user: state.current_user
          ? { ...state.current_user, archived_programs: action.payload }
          : null,
        error: null,
      }

    // Canonical-source reconciliation — open the reconciler UI
    case 'SET_CYCLE_SYNC_PROMPT':
      return {
        ...state,
        cycle_sync: action.payload,
      }

    // Canonical-source reconciliation — user dismissed the prompt
    case 'DISMISS_CYCLE_SYNC_PROMPT':
      return {
        ...state,
        cycle_sync: state.cycle_sync != null
          ? { ...state.cycle_sync, dismissed: true }
          : null,
      }

    default:
      return state
  }
}
