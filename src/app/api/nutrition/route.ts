import { createHash, randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

import { DATA_DIR } from '@/lib/constants'
import { summarizeNutritionDays, type NutritionLog, type NutritionSource } from '@/lib/nutrition'

const NUTRITION_FILE = path.join(DATA_DIR, 'nutrition-logs.json')
const MAX_IMPORT_RECORDS = 5_000

type NutritionStore = Record<string, NutritionLog[]>

async function readStore(): Promise<NutritionStore> {
  try {
    return JSON.parse(await fs.readFile(NUTRITION_FILE, 'utf8')) as NutritionStore
  } catch {
    return {}
  }
}

async function writeStore(store: NutritionStore): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const temporary = `${NUTRITION_FILE}.${randomUUID()}.tmp`
  await fs.writeFile(temporary, JSON.stringify(store, null, 2), 'utf8')
  await fs.rename(temporary, NUTRITION_FILE)
}

function nonNegativeNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function normalizeRecord(raw: Record<string, unknown>, userId: string): NutritionLog {
  const date = String(raw.date || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Every record requires a YYYY-MM-DD date.')
  const calories = nonNegativeNumber(raw.calories)
  if (calories <= 0) throw new Error('Every record requires calories greater than zero.')

  const source: NutritionSource = raw.source === 'myfitnesspal_csv' ? 'myfitnesspal_csv' : 'manual'
  const fingerprint = [date, raw.meal || '', calories, raw.protein_g || 0, raw.carbs_g || 0, raw.fat_g || 0].join('|')
  const id = source === 'myfitnesspal_csv'
    ? `mfp_${createHash('sha256').update(fingerprint).digest('hex').slice(0, 24)}`
    : String(raw.id || randomUUID())

  return {
    id,
    user_id: userId,
    date,
    meal: raw.meal ? String(raw.meal).slice(0, 120) : undefined,
    calories,
    protein_g: nonNegativeNumber(raw.protein_g),
    carbs_g: nonNegativeNumber(raw.carbs_g),
    fat_g: nonNegativeNumber(raw.fat_g),
    fiber_g: nonNegativeNumber(raw.fiber_g),
    notes: raw.notes ? String(raw.notes).slice(0, 500) : undefined,
    source,
    imported_at: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('user_id') || 'default'
    const logs = (await readStore())[userId] || []
    return NextResponse.json({ logs, days: summarizeNutritionDays(logs) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to read nutrition logs.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { user_id?: string; records?: Record<string, unknown>[]; record?: Record<string, unknown> }
    const userId = body.user_id || 'default'
    const rawRecords = body.records || (body.record ? [body.record] : [])
    if (!rawRecords.length) return NextResponse.json({ error: 'Provide at least one nutrition record.' }, { status: 400 })
    if (rawRecords.length > MAX_IMPORT_RECORDS) return NextResponse.json({ error: `Imports are limited to ${MAX_IMPORT_RECORDS} records.` }, { status: 400 })

    const normalized = rawRecords.map((record) => normalizeRecord(record, userId))
    const store = await readStore()
    const existing = new Map((store[userId] || []).map((record) => [record.id, record]))
    for (const record of normalized) existing.set(record.id, record)
    store[userId] = [...existing.values()].sort((a, b) => b.date.localeCompare(a.date) || b.imported_at.localeCompare(a.imported_at))
    await writeStore(store)

    return NextResponse.json({ saved: normalized.length, total: store[userId].length, days: summarizeNutritionDays(store[userId]) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save nutrition logs.' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json() as { user_id?: string; id?: string; all?: boolean }
    const userId = body.user_id || 'default'
    const store = await readStore()
    const current = store[userId] || []
    if (body.all) {
      delete store[userId]
    } else {
      store[userId] = current.filter((record) => record.id !== body.id)
      if (store[userId].length === 0) delete store[userId]
    }
    await writeStore(store)
    return NextResponse.json({ deleted: current.length - (store[userId]?.length || 0) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete nutrition logs.' }, { status: 500 })
  }
}
