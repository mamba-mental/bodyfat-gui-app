/**
 * Timezone-safe cycle date math (Codex #5).
 *
 * All inputs/outputs are date-only `YYYY-MM-DD` strings, computed in UTC so an
 * evening action in America/New_York never rolls the calendar date or shifts a
 * week boundary. Weekdays use 0..6 = Sun..Sat (matches JS getUTCDay()).
 */

const DAY = 86_400_000

function toUTC(date: string): number {
  // F11/MEDIUM-14: tolerate a full ISO string. '2026-06-01T00:00:00Z'.split('-')
  // would put 'T00:00:00Z' in the day segment -> Number(...) = NaN -> NaN week.
  // Take the date-only prefix so the math is the canonical YYYY-MM-DD form.
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUTC(ms: number): string {
  const dt = new Date(ms)
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${m}-${d}`
}

function normDays(days: number[]): Set<number> {
  return new Set(days.map((n) => ((n % 7) + 7) % 7))
}

/** 1-based week within the cycle; clamped to [1, timelineWeeks] when given. */
export function currentCycleWeek(startDate: string, today: string, timelineWeeks?: number): number {
  const days = Math.floor((toUTC(today) - toUTC(startDate)) / DAY)
  let week = Math.floor(Math.max(0, days) / 7) + 1
  if (timelineWeeks && timelineWeeks > 0) week = Math.min(week, timelineWeeks)
  return Math.max(1, week)
}

/** Next scheduled weigh-in date on/after `today`; null if no schedule. */
export function nextWeighIn(today: string, weighinDays: number[]): string | null {
  if (!weighinDays?.length) return null
  const set = normDays(weighinDays)
  let ms = toUTC(today)
  for (let i = 0; i < 7; i++) {
    if (set.has(new Date(ms).getUTCDay())) return fromUTC(ms)
    ms += DAY
  }
  return null
}

/**
 * Expected weigh-in dates strictly before `today` that have no entry within
 * +/-2 days. The +2 day forward window lets a weigh-in logged up to 2 days
 * after the scheduled date satisfy it (e.g. scheduled Fri, logged Sun = OK).
 * Past misses outside the window remain on record.
 * Used to flag missed check-ins on the New Entry page.
 */
export function missedWeighIns(
  startDate: string,
  today: string,
  weighinDays: number[],
  entryDates: string[]
): string[] {
  if (!weighinDays?.length) return []
  const set = normDays(weighinDays)
  const entries = new Set(entryDates.map(toUTC))
  const todayMs = toUTC(today)
  const missed: string[] = []
  for (let ms = toUTC(startDate); ms < todayMs; ms += DAY) {
    if (!set.has(new Date(ms).getUTCDay())) continue
    const met =
      entries.has(ms) ||
      entries.has(ms - DAY) ||
      entries.has(ms + DAY) ||
      entries.has(ms + 2 * DAY)
    if (!met) missed.push(fromUTC(ms))
  }
  return missed
}
