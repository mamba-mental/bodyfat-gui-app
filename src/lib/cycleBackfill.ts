/**
 * Cycle backfill assignment (P3 / Codex #6) — the core of the data backfill.
 *
 * Rule: assign each entry/report to a cycle by program_id FIRST (the existing
 * legacy boundary), then by date-range when program_id is null. NEVER guess —
 * a row with no covering cycle, or one matching multiple overlapping cycles, is
 * QUARANTINED for PRIME to resolve, so nothing double-counts across cycles.
 *
 * Pure + dependency-free. Date strings are YYYY-MM-DD (lexicographic compare ==
 * chronological compare for that format). endDate null = an open/active cycle.
 */

export interface CycleBoundary {
  id: string
  legacyProgramId: string | null
  startDate: string
  endDate: string | null
}

export type Assignment = { cycleId: string } | { quarantine: true; reason: string }

function covers(c: CycleBoundary, date: string): boolean {
  if (date < c.startDate) return false
  if (c.endDate !== null && date > c.endDate) return false
  return true
}

export function assignEntryCycle(
  entry: { programId: string | null; date: string },
  cycles: CycleBoundary[]
): Assignment {
  // 1) program_id is the authoritative legacy boundary.
  if (entry.programId != null) {
    const match = cycles.find((c) => c.legacyProgramId === entry.programId)
    if (match) return { cycleId: match.id }
    return { quarantine: true, reason: `program_id ${entry.programId} has no matching cycle` }
  }
  // 2) Fall back to date-range, but only if it is UNAMBIGUOUS.
  const covering = cycles.filter((c) => covers(c, entry.date))
  if (covering.length === 1) return { cycleId: covering[0].id }
  if (covering.length === 0) return { quarantine: true, reason: `no cycle covers ${entry.date}` }
  return { quarantine: true, reason: `ambiguous: ${entry.date} matches ${covering.length} cycles` }
}
