import { currentCycleWeek } from './cycleWeek'

export interface LivingReportSourceEntry {
  id?: string
  date: string | Date
  weight: number
  body_fat_percentage?: number | null
  bf?: number | null
  photo?: string | null
}

export interface LivingReportActualEntry {
  week: number
  weight: number
  bf: number
  date: string
  photo?: string
}

function dateOnly(value: string | Date): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

/**
 * Convert the entries already scoped by the Reports page into the backend's
 * Living Report contract. Week math is shared with the rest of the cycle UI,
 * so days 1-7 are Week 1, days 8-14 are Week 2, and so on.
 */
export function buildLivingReportActualEntries(
  entries: LivingReportSourceEntry[],
  startDate?: string | null,
): LivingReportActualEntry[] {
  const normalizedStart = startDate ? dateOnly(startDate) : null

  return (Array.isArray(entries) ? entries : []).flatMap((entry) => {
    const date = dateOnly(entry.date)
    if (!date || !Number.isFinite(entry.weight)) return []

    const bf = entry.body_fat_percentage ?? entry.bf ?? 0
    return [{
      week: normalizedStart ? currentCycleWeek(normalizedStart, date) : 1,
      weight: entry.weight,
      bf: Number.isFinite(bf) ? Number(bf) : 0,
      date,
      ...(entry.photo ? { photo: entry.photo } : {}),
    }]
  })
}
