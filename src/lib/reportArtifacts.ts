import type { Report } from '@/types'

function pathStem(value?: string | null): string | null {
  if (!value) return null
  const filename = value.replace(/\\/g, '/').split('/').pop()
  return filename ? filename.replace(/\.[^/.]+$/, '') : null
}

export function reportArtifactKey(report: Partial<Report>): string {
  return String(report.file_base || pathStem(report.html_path) || report.id || '')
}

function reportSpecificity(report: Partial<Report>): number {
  return Number(Boolean(report.report_type)) * 4
    + Number(Boolean(report.source_fingerprint)) * 3
    + Number(Boolean(report.cycle_id)) * 2
    + Number(Boolean(report.calculation_result))
}

/**
 * One generated artifact can have both its canonical DB row and an older
 * startup-ingestion row whose id is the HTML filename. Keep the richer row so
 * Report History shows one item without deleting historical data.
 */
export function dedupeReportsByArtifact<T extends Partial<Report>>(reports: T[]): T[] {
  const byArtifact = new Map<string, T>()
  const order: string[] = []

  for (const report of reports) {
    const key = reportArtifactKey(report) || String(report.id)
    const existing = byArtifact.get(key)
    if (!existing) {
      byArtifact.set(key, report)
      order.push(key)
    } else if (reportSpecificity(report) > reportSpecificity(existing)) {
      byArtifact.set(key, report)
    }
  }

  return order.map((key) => byArtifact.get(key)!).filter(Boolean)
}
