import { describe, expect, it } from 'vitest'

import { parseMyFitnessPalCsv, summarizeNutritionDays, type NutritionLog } from '@/lib/nutrition'

describe('MyFitnessPal CSV import', () => {
  it('parses quoted meal rows and accepted header variants', () => {
    const records = parseMyFitnessPalCsv(
      'Date,Meal,Calories,Carbohydrates (g),Fat (g),Protein (g),Fiber (g)\n' +
      '08/10/2026,"Breakfast, early",510,48,18,42,7\n' +
      '2026-08-10,Dinner,730,61,24,58,11\n',
    )

    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      date: '2026-08-10',
      meal: 'Breakfast, early',
      calories: 510,
      protein_g: 42,
      source: 'myfitnesspal_csv',
    })
  })

  it('rejects files without required Date and Calories columns', () => {
    expect(() => parseMyFitnessPalCsv('Meal,Protein\nBreakfast,40')).toThrow(/Date and Calories/)
  })
})

describe('nutrition day summaries', () => {
  it('aggregates multiple meals into one daily actual', () => {
    const base = { user_id: 'default', source: 'manual' as const, imported_at: '2026-08-10T00:00:00Z' }
    const logs: NutritionLog[] = [
      { ...base, id: 'a', date: '2026-08-10', calories: 500, protein_g: 40, carbs_g: 50, fat_g: 15 },
      { ...base, id: 'b', date: '2026-08-10', calories: 700, protein_g: 55, carbs_g: 65, fat_g: 25 },
    ]
    expect(summarizeNutritionDays(logs)[0]).toMatchObject({
      date: '2026-08-10', calories: 1200, protein_g: 95, carbs_g: 115, fat_g: 40, record_count: 2,
    })
  })
})
