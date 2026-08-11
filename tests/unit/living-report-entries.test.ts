import { describe, expect, it } from 'vitest'

import { buildLivingReportActualEntries } from '@/lib/livingReportEntries'

describe('buildLivingReportActualEntries', () => {
  it('uses floor-based, one-indexed cycle weeks at seven-day boundaries', () => {
    const result = buildLivingReportActualEntries([
      { id: 'd1', date: '2026-08-01', weight: 270, body_fat_percentage: 38 },
      { id: 'd7', date: '2026-08-07', weight: 269, body_fat_percentage: 37.8 },
      { id: 'd8', date: '2026-08-08', weight: 268.5, body_fat_percentage: 37.5 },
      { id: 'd14', date: '2026-08-14', weight: 267.5, body_fat_percentage: 37.1 },
      { id: 'd15', date: '2026-08-15', weight: 267, bf: 36.9, photo: '/photo.jpg' },
    ], '2026-08-01')

    expect(result.map((entry) => entry.week)).toEqual([1, 1, 2, 2, 3])
    expect(result[4]).toMatchObject({
      date: '2026-08-15',
      weight: 267,
      bf: 36.9,
      photo: '/photo.jpg',
    })
  })

  it('normalizes Date values and omits entries with invalid dates or weights', () => {
    const result = buildLivingReportActualEntries([
      { id: 'ok', date: new Date('2026-08-11T18:30:00Z'), weight: 270.5, body_fat_percentage: null },
      { id: 'bad-date', date: 'not-a-date', weight: 270 },
      { id: 'bad-weight', date: '2026-08-12', weight: Number.NaN },
    ], '2026-08-11')

    expect(result).toEqual([{ week: 1, weight: 270.5, bf: 0, date: '2026-08-11' }])
  })
})
