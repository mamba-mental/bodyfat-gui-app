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

import type { ProfileCycleDriftItem } from '@/types'

export interface ScopedEntry {
  id: string
  date: string | Date
  weight: number
  body_fat_percentage?: number | null
  cycle_id?: string | null
}

export interface ActiveCycleLike {
  id: string
  start_date?: string | null
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

// ---------------------------------------------------------------------------
// Canonical-source drift detector
// ---------------------------------------------------------------------------

/**
 * Compare a user profile snapshot against an active cycle and return every
 * field where they meaningfully disagree.
 *
 * Pure function — no side effects, no API calls, safe to call on every render.
 *
 * Field mapping:
 *   profile.current_weight  ↔  cycle.start_weight
 *   profile.current_bf      ↔  cycle.start_bf
 *   profile.goal_weight     ↔  cycle.goal_weight
 *   profile.goal_bf         ↔  cycle.goal_bf
 *   profile.timeline_weeks  ↔  cycle.timeline_weeks   (optional — both must be present)
 *
 * A field is considered drifted when BOTH sides have a finite non-zero value
 * AND they differ by more than a floating-point epsilon (0.001).
 *
 * @returns  Empty array when no drift, or an array of per-field diff items.
 */
export function detectProfileCycleDrift(
  profile: {
    current_weight?: number | null
    current_bf?: number | null
    goal_weight?: number | null
    goal_bf?: number | null
    timeline_weeks?: number | null
  },
  activeCycle: {
    start_weight?: number | null
    start_bf?: number | null
    goal_weight?: number | null
    goal_bf?: number | null
    timeline_weeks?: number | null
  },
): ProfileCycleDriftItem[] {
  const EPSILON = 0.001

  /** Returns true when both values are finite, non-zero, and differ. */
  function hasDrift(a: number | null | undefined, b: number | null | undefined): boolean {
    if (a == null || b == null) return false
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false
    if (a === 0 || b === 0) return false
    return Math.abs(a - b) > EPSILON
  }

  const items: ProfileCycleDriftItem[] = []

  if (hasDrift(profile.goal_weight, activeCycle.goal_weight)) {
    items.push({
      field: 'goal_weight',
      label: 'Goal Weight (lbs)',
      profileValue: profile.goal_weight as number,
      cycleValue: activeCycle.goal_weight as number,
    })
  }

  if (hasDrift(profile.goal_bf, activeCycle.goal_bf)) {
    items.push({
      field: 'goal_bf',
      label: 'Goal Body Fat %',
      profileValue: profile.goal_bf as number,
      cycleValue: activeCycle.goal_bf as number,
    })
  }

  if (hasDrift(profile.current_weight, activeCycle.start_weight)) {
    items.push({
      field: 'current_weight',
      label: 'Starting Weight (lbs)',
      profileValue: profile.current_weight as number,
      cycleValue: activeCycle.start_weight as number,
    })
  }

  if (hasDrift(profile.current_bf, activeCycle.start_bf)) {
    items.push({
      field: 'current_bf',
      label: 'Starting Body Fat %',
      profileValue: profile.current_bf as number,
      cycleValue: activeCycle.start_bf as number,
    })
  }

  // timeline_weeks: only compare when BOTH have a value (it's optional on the profile).
  if (
    profile.timeline_weeks != null &&
    activeCycle.timeline_weeks != null &&
    hasDrift(profile.timeline_weeks, activeCycle.timeline_weeks)
  ) {
    items.push({
      field: 'timeline_weeks',
      label: 'Timeline (weeks)',
      profileValue: profile.timeline_weeks as number,
      cycleValue: activeCycle.timeline_weeks as number,
    })
  }

  return items
}

/**
 * Build the userData fed to fetchCalculation, scoped to the active cycle (F4+F7).
 *
 * Both the dashboard's /calculate path and the report generator call this, so
 * they always send the SAME current weight / baseline / goals / start date to
 * the backend. Before this, the report injected the latest-entry weight and
 * clobbered start_date=today while /calculate used the raw profile blob — so the
 * report and dashboard showed different numbers for the same cycle.
 *
 * Returns a NEW object (never mutates the input). Identity when no active cycle.
 */
export function cycleScopedCalcUser<
  U extends ProfileFallback & { start_date?: string | null },
>(userData: U, entries: ScopedEntry[], cycle: ActiveCycleLike | null): U {
  if (!cycle) return userData
  const m = activeCycleMetrics(entries, cycle, userData)
  return {
    ...userData,
    current_weight: m.currentWeight,
    current_bf: m.currentBF,
    goal_weight: m.goalWeight,
    goal_bf: m.goalBF,
    ...(cycle.start_date ? { start_date: String(cycle.start_date).slice(0, 10) } : {}),
  }
}
