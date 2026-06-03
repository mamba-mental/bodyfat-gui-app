/**
 * Pure, immutable cycle status reducers (P3).
 *
 * Enforces the one-active-cycle invariant at the state layer — the complement to
 * the DB partial unique index `uq_cycles_one_active`. Never mutates inputs.
 */

export type CycleStatus = 'active' | 'stopped' | 'archived'

export interface CycleState {
  id: string
  status: CycleStatus
}

export function activeCycle<T extends CycleState>(cycles: T[]): T | undefined {
  return cycles.find((c) => c.status === 'active')
}

/** Demote any current active cycle to stopped, then append the new active cycle. */
export function startCycle<T extends CycleState>(cycles: T[], newCycle: T): T[] {
  const demoted = cycles.map((c) =>
    c.status === 'active' ? { ...c, status: 'stopped' as const } : c
  )
  return [...demoted, { ...newCycle, status: 'active' as const }]
}

export function stopCycle<T extends CycleState>(cycles: T[], id: string): T[] {
  return cycles.map((c) => (c.id === id ? { ...c, status: 'stopped' as const } : c))
}

export function archiveCycle<T extends CycleState>(cycles: T[], id: string): T[] {
  return cycles.map((c) => (c.id === id ? { ...c, status: 'archived' as const } : c))
}
