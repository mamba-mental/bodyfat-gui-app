/**
 * Weigh-in schedule validation (P8).
 *
 * The commitment is N weigh-ins per week + the specific weekday(s) (0..6 = Sun..Sat).
 * Pure helpers to normalize the chosen days and validate they match the count.
 */

export function normalizeDays(days: number[]): number[] {
  const valid = days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  return [...new Set(valid)].sort((a, b) => a - b)
}

export interface ScheduleValidation {
  valid: boolean
  error?: string
}

export function validateSchedule(perWeek: number, days: number[]): ScheduleValidation {
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) {
      return { valid: false, error: `day ${d} out of range (0-6)` }
    }
  }
  if (new Set(days).size !== days.length) {
    return { valid: false, error: 'duplicate weigh-in days' }
  }
  if (days.length !== perWeek) {
    return { valid: false, error: `pick ${perWeek} day(s), got ${days.length}` }
  }
  return { valid: true }
}
