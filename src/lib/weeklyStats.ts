/**
 * Real-date weekly stats (P4 Summary).
 *
 * Extracted + tested version of the fix applied inline in reports/page.tsx this
 * session: per-week rates use ACTUAL elapsed weeks between entry dates, never the
 * entry index. Convention: negative = loss (matches the app's display).
 * Date-only UTC math so timezone never shifts a boundary.
 */

const DAY = 86_400_000

function toUTC(d: string): number {
  const [y, m, dd] = d.split('-').map(Number)
  return Date.UTC(y, m - 1, dd)
}

/** Real elapsed weeks between two YYYY-MM-DD dates; floored at 1/7 (one day). */
export function weeksBetween(laterISO: string, earlierISO: string): number {
  const ms = toUTC(laterISO) - toUTC(earlierISO)
  return Math.max(1 / 7, ms / (7 * DAY))
}

/** Newest minus oldest (loss is negative). */
export function totalChange(newerValue: number, olderValue: number): number {
  return newerValue - olderValue
}

/** Per-week rate of change over the real interval (loss is negative). */
export function weeklyRate(
  newerValue: number,
  olderValue: number,
  newerDate: string,
  olderDate: string
): number {
  return (newerValue - olderValue) / weeksBetween(newerDate, olderDate)
}
