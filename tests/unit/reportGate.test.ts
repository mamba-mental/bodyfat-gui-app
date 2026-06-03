import { describe, it, expect } from 'vitest'
import { sourceFingerprint, canGenerateReport } from '../../src/lib/reportGate'

// Codex #3: gate report generation on a SOURCE FINGERPRINT (cycle + entry id +
// entry date + entry.updated_at + calc/generator versions), NOT last_report >= last_entry.
// Editing an old entry changes its updated_at -> new fingerprint -> update allowed.

const base = {
  cycleId: 'cyc1',
  entryId: 'e1',
  entryDate: '2026-06-03',
  entryUpdatedAt: '2026-06-03T07:00:00Z',
  calcVersion: 'v1',
  generatorVersion: 'g1',
}

describe('sourceFingerprint', () => {
  it('is deterministic for identical input', () => {
    expect(sourceFingerprint(base)).toBe(sourceFingerprint({ ...base }))
  })
  it('changes when the entry is edited (updated_at differs)', () => {
    expect(sourceFingerprint(base)).not.toBe(
      sourceFingerprint({ ...base, entryUpdatedAt: '2026-06-03T09:30:00Z' })
    )
  })
  it('changes when the calc/generator version changes', () => {
    expect(sourceFingerprint(base)).not.toBe(sourceFingerprint({ ...base, calcVersion: 'v2' }))
  })
})

describe('canGenerateReport', () => {
  it('allows when there is no prior report', () => {
    expect(canGenerateReport(null, sourceFingerprint(base))).toEqual({ allowed: true, isUpdate: false })
  })
  it('blocks when fingerprint is unchanged (no new data)', () => {
    const fp = sourceFingerprint(base)
    expect(canGenerateReport(fp, fp)).toEqual({ allowed: false, isUpdate: false })
  })
  it('allows as an UPDATE when the entry was edited', () => {
    const last = sourceFingerprint(base)
    const now = sourceFingerprint({ ...base, entryUpdatedAt: '2026-06-03T09:30:00Z' })
    expect(canGenerateReport(last, now)).toEqual({ allowed: true, isUpdate: true })
  })
})
