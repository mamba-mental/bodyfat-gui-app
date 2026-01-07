/**
 * Calculation Actions - Progression calculation logic
 *
 * Handles calculating and updating body fat progression
 */

import { UserData, AppAction } from '@/types'
import { saveCalculationResult, fetchCalculation } from '@/lib/storage-api'
import { CalculationError } from '@/lib/calculations'
import { getEatingWindowHours } from '@/lib/eating-patterns'

export const ensureEatingPattern = (userData: UserData | null): UserData | null => {
  if (!userData) return userData
  const eatingPattern = userData.eating_pattern || 'standard'
  const eating_window_hours = userData.eating_window_hours ?? getEatingWindowHours(eatingPattern)
  return {
    ...userData,
    eating_pattern: eatingPattern,
    eating_window_hours,
  }
}

interface CalculationDeps {
  dispatch: React.Dispatch<AppAction>
  currentUser: UserData | null
  mountedRef: React.RefObject<boolean>
}

export async function calculateAndUpdateProgression(
  userData: UserData | undefined,
  deps: CalculationDeps
): Promise<void> {
  const { dispatch, currentUser, mountedRef } = deps

  const userToCalculate = userData || currentUser
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
