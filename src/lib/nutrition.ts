export type NutritionSource = 'manual' | 'myfitnesspal_csv'

export interface NutritionLog {
  id: string
  user_id: string
  date: string
  meal?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  notes?: string
  source: NutritionSource
  imported_at: string
}

export interface NutritionDaySummary {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  record_count: number
}

const HEADER_ALIASES = {
  date: ['date', 'day'],
  meal: ['meal', 'meal name', 'meal_name'],
  calories: ['calories', 'calorie', 'energy', 'energy (kcal)', 'kcal'],
  protein_g: ['protein', 'protein (g)', 'protein_g'],
  carbs_g: ['carbohydrates', 'carbs', 'carbohydrates (g)', 'carbs (g)', 'carbs_g'],
  fat_g: ['fat', 'fat (g)', 'fat_g'],
  fiber_g: ['fiber', 'fibre', 'fiber (g)', 'fibre (g)', 'fiber_g'],
} as const

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    const next = csv[index + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(cell.trim())
      cell = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header as never))
}

function numberFromCell(value: string | undefined): number {
  if (!value) return 0
  const parsed = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const usMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (usMatch) {
    const [, month, day, rawYear] = usMatch
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const timestamp = Date.parse(trimmed)
  if (Number.isNaN(timestamp)) return null
  return new Date(timestamp).toISOString().slice(0, 10)
}

export type NutritionImportRow = Omit<NutritionLog, 'id' | 'user_id' | 'imported_at'>

export function parseMyFitnessPalCsv(csv: string): NutritionImportRow[] {
  const rows = parseCsvRows(csv.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('The CSV does not contain any nutrition rows.')

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const indexes = {
    date: findHeaderIndex(headers, HEADER_ALIASES.date),
    meal: findHeaderIndex(headers, HEADER_ALIASES.meal),
    calories: findHeaderIndex(headers, HEADER_ALIASES.calories),
    protein_g: findHeaderIndex(headers, HEADER_ALIASES.protein_g),
    carbs_g: findHeaderIndex(headers, HEADER_ALIASES.carbs_g),
    fat_g: findHeaderIndex(headers, HEADER_ALIASES.fat_g),
    fiber_g: findHeaderIndex(headers, HEADER_ALIASES.fiber_g),
  }

  if (indexes.date < 0 || indexes.calories < 0) {
    throw new Error('The CSV must include Date and Calories columns.')
  }

  const parsed: NutritionImportRow[] = []
  for (const row of rows.slice(1)) {
    const date = normalizeDate(row[indexes.date] || '')
    const calories = numberFromCell(row[indexes.calories])
    if (!date || calories <= 0) continue
    parsed.push({
      date,
      meal: indexes.meal >= 0 ? row[indexes.meal] || undefined : undefined,
      calories,
      protein_g: indexes.protein_g >= 0 ? numberFromCell(row[indexes.protein_g]) : 0,
      carbs_g: indexes.carbs_g >= 0 ? numberFromCell(row[indexes.carbs_g]) : 0,
      fat_g: indexes.fat_g >= 0 ? numberFromCell(row[indexes.fat_g]) : 0,
      fiber_g: indexes.fiber_g >= 0 ? numberFromCell(row[indexes.fiber_g]) : 0,
      source: 'myfitnesspal_csv',
    })
  }

  if (!parsed.length) throw new Error('No usable dated calorie records were found in the CSV.')
  return parsed
}

export function summarizeNutritionDays(logs: NutritionLog[]): NutritionDaySummary[] {
  const days = new Map<string, NutritionDaySummary>()
  for (const log of logs) {
    const current = days.get(log.date) || {
      date: log.date,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      record_count: 0,
    }
    current.calories += log.calories
    current.protein_g += log.protein_g
    current.carbs_g += log.carbs_g
    current.fat_g += log.fat_g
    current.fiber_g += log.fiber_g || 0
    current.record_count += 1
    days.set(log.date, current)
  }

  return [...days.values()].sort((a, b) => b.date.localeCompare(a.date))
}
