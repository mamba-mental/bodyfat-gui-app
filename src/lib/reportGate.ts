/**
 * Report-generation gate via SOURCE FINGERPRINT (Codex #3).
 *
 * Gating on `last_report >= last_entry` (the old approach) ignores edits to old
 * entries. Instead we fingerprint exactly what a report is derived from: the
 * cycle, the entry id + its date + its updated_at, and the calc/generator
 * versions. If the fingerprint is unchanged there is genuinely no new data ->
 * block. If it changed because the latest entry was edited -> allow as an UPDATE.
 */

export interface ReportSource {
  cycleId: string
  entryId: string
  entryDate: string
  entryUpdatedAt: string
  calcVersion: string
  generatorVersion: string
}

/** Stable, dependency-free fingerprint. Equal inputs -> equal string. */
export function sourceFingerprint(s: ReportSource): string {
  return [
    s.cycleId,
    s.entryId,
    s.entryDate,
    s.entryUpdatedAt,
    s.calcVersion,
    s.generatorVersion,
  ].join('|')
}

export interface GateResult {
  allowed: boolean
  isUpdate: boolean
}

/**
 * @param lastFingerprint fingerprint stored on the most recent report for this
 *   cycle, or null if none exists yet.
 * @param currentFingerprint fingerprint of the current source data.
 */
export function canGenerateReport(
  lastFingerprint: string | null,
  currentFingerprint: string
): GateResult {
  if (!lastFingerprint) return { allowed: true, isUpdate: false }
  if (lastFingerprint === currentFingerprint) return { allowed: false, isUpdate: false }
  return { allowed: true, isUpdate: true }
}
