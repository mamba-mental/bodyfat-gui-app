/**
 * App Reducer - State management for the application
 *
 * Handles all state updates via actions dispatched from AppProvider
 */

import { AppState, AppAction } from '@/types'

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
        current_user: state.current_user
          ? { ...state.current_user, program_reference: action.payload }
          : null,
        error: null,
      }

    default:
      return state
  }
}
