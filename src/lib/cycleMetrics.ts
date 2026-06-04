/**
 * Active-cycle metrics — the SINGLE source of truth for the dashboard (F3+F5).
 *
 * DDD: "current weight" and "start baseline" are derived values that each used
 * to be recomputed from divergent sources (program_id-scoped entries, the
 * profile blob, program_reference). That divergence was the "3 current-weights"
 * / wrong-numbers bug. This module is the ONE place that derives them, scoped to
 * the active cycle aggregate. Pure + dependency-free so it is fully unit-tested.
 *
 *   current weight  = the active cycle's latest weigh-in
 *                     (fallback: the cycle's own start baseline, never the
 *                      unrelated profile blob — only fall back to profile when
 *                      there is no active cycle at all)
 *   start baseline  = the active cycle's start_weight / start_bf
 */

export interface ScopedEntry {
  id: string
  date: string | Date
  weight: number
  body_fat_percentage?: number | null
  cycle_id?: string | null
}

export interface ActiveCycleLike {
  id: string
  start_weight?: number | null
  start_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
}

export interface ProfileFallback {
  current_weight?: number | null
  current_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
}

export interface ActiveCycleMetrics<E extends ScopedEntry = ScopedEntry> {
  cycleEntries: E[]
  currentWeight: number
  currentBF: number
  startWeight: number
  startBF: number
  goalWeight: number
  goalBF: number
}

function ms(value: string | Date): number {
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** First finite number in the list, else 0. */
function firstFinite(...vals: Array<number | null | undefined>): number {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return 0
}

/**
 * Derive the active-cycle-scoped dashboard metrics.
 *
 * @param entries   all weigh-ins (any cycle, any order)
 * @param active    the active cycle, or null when none is active
 * @param profile   profile blob, used ONLY when there is no active cycle
 */
export function activeCycleMetrics<E extends ScopedEntry>(
  entries: E[],
  active: ActiveCycleLike | null,
  profile: ProfileFallback,
): ActiveCycleMetrics<E> {
  // No active cycle: the dashboard can only show the profile blob.
  if (!active) {
    const w = firstFinite(profile.current_weight)
    const bf = firstFinite(profile.current_bf)
    return {
      cycleEntries: [],
      currentWeight: w,
      currentBF: bf,
      startWeight: w,
      startBF: bf,
      goalWeight: firstFinite(profile.goal_weight),
      goalBF: firstFinite(profile.goal_bf),
    }
  }

  // Scope to the active cycle and sort newest-first (do NOT trust input order —
  // the reducer re-sort bug, F11, means callers can pass any order).
  const cycleEntries = (Array.isArray(entries) ? entries : [])
    .filter((e) => e?.cycle_id === active.id)
    .sort((a, b) => ms(b.date) - ms(a.date))

  const latest = cycleEntries[0]

  // Start baseline = the active cycle's own starting measurement.
  const startWeight = firstFinite(active.start_weight, profile.current_weight)
  const startBF = firstFinite(active.start_bf, profile.current_bf)

  // Current weight = latest weigh-in IN this cycle; before the first weigh-in it
  // is the cycle's start baseline (NOT the profile blob).
  const currentWeight = firstFinite(latest?.weight, startWeight)
  const currentBF = firstFinite(latest?.body_fat_percentage, startBF)

  return {
    cycleEntries,
    currentWeight,
    currentBF,
    startWeight,
    startBF,
    goalWeight: firstFinite(active.goal_weight, profile.goal_weight),
    goalBF: firstFinite(active.goal_bf, profile.goal_bf),
  }
}
