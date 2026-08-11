import { describe, expect, it } from 'vitest'

import { dedupeReportsByArtifact, reportArtifactKey } from '@/lib/reportArtifacts'

describe('report artifact deduplication', () => {
  it('matches canonical and startup-ingested rows by their HTML artifact', () => {
    const canonical = {
      id: 'random-client-id', report_type: 'living',
      html_path: 'C:/app/storage/reports/living_report_MJ_20260811_030000.html',
    }
    const ingested = {
      id: 'living_report_MJ_20260811_030000',
      file_base: 'living_report_MJ_20260811_030000',
      html_path: 'storage/reports/living_report_MJ_20260811_030000.html',
    }

    expect(reportArtifactKey(canonical)).toBe(reportArtifactKey(ingested))
    expect(dedupeReportsByArtifact([ingested, canonical])).toEqual([canonical])
  })

  it('does not combine reports backed by different files', () => {
    const reports = [
      { id: 'one', file_base: 'PRIME_Report_MJ_20260811_1' },
      { id: 'two', file_base: 'PRIME_Report_MJ_20260811_2' },
    ]
    expect(dedupeReportsByArtifact(reports)).toHaveLength(2)
  })
})
