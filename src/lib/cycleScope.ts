/**
 * Cycle scoping for the Reports page (P4).
 *
 * The cycle-selector defaults to the CURRENT (active) cycle and can scope each
 * card to a single cycle or aggregate across every cycle ("All ReComp Cycles").
 * Pure + dependency-free.
 */

export const ALL_CYCLES = 'all'

export function defaultSelectedCycle(
  cycles: { id: string; status: string; startDate: string }[]
): string {
  if (!cycles.length) return ALL_CYCLES
  const active = cycles.find((c) => c.status === 'active')
  if (active) return active.id
  // No active cycle -> most recent by startDate.
  const recent = [...cycles].sort((a, b) =>
    a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0
  )[0]
  return recent.id
}

export function scopeByCycle<T extends { cycle_id?: string | null }>(
  items: T[],
  selected: string
): T[] {
  if (selected === ALL_CYCLES) return items
  return items.filter((i) => i.cycle_id === selected)
}
