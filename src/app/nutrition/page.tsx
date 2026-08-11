"use client"

import * as React from "react"
import { Apple, CalendarDays, Download, FileUp, Plus, Target, Trash2, Utensils } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApp } from "@/contexts/app-context"
import { withBasePath } from "@/lib/api-path"
import { parseMyFitnessPalCsv, type NutritionDaySummary, type NutritionLog } from "@/lib/nutrition"

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  meal: "Daily total",
  calories: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
}

export default function NutritionPage() {
  const { state } = useApp()
  const [logs, setLogs] = React.useState<NutritionLog[]>([])
  const [days, setDays] = React.useState<NutritionDaySummary[]>([])
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const progression = state.current_calculation?.progression || []
  const startDate = state.current_user?.start_date ? new Date(`${state.current_user.start_date}T00:00:00`) : null
  const elapsedWeeks = startDate ? Math.max(0, Math.floor((Date.now() - startDate.getTime()) / (7 * 86_400_000))) : 0
  const targetWeek = progression[Math.min(elapsedWeeks, Math.max(0, progression.length - 1))]
  const calorieTarget = Math.round(targetWeek?.weekly_average_calories || targetWeek?.daily_calorie_intake || 0)
  const proteinTarget = Math.round(targetWeek?.protein_g || state.current_user?.protein_intake || 0)

  const loadLogs = React.useCallback(async () => {
    const response = await fetch(withBasePath('/api/nutrition'))
    if (!response.ok) throw new Error('Nutrition history could not be loaded.')
    const payload = await response.json()
    setLogs(payload.logs || [])
    setDays(payload.days || [])
  }, [])

  React.useEffect(() => {
    loadLogs().catch((reason) => setError(reason instanceof Error ? reason.message : 'Nutrition history could not be loaded.'))
  }, [loadLogs])

  const saveRecords = async (records: Record<string, unknown>[]) => {
    const response = await fetch(withBasePath('/api/nutrition'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Nutrition records could not be saved.')
    await loadLogs()
    return payload.saved as number
  }

  const handleManualSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(null); setMessage(null)
    try {
      await saveRecords([{
        ...form,
        calories: Number(form.calories),
        protein_g: Number(form.protein_g || 0),
        carbs_g: Number(form.carbs_g || 0),
        fat_g: Number(form.fat_g || 0),
        fiber_g: Number(form.fiber_g || 0),
        source: 'manual',
      }])
      setForm((current) => ({ ...EMPTY_FORM, date: current.date }))
      setMessage('Nutrition entry saved and included in variance tracking.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nutrition entry could not be saved.')
    } finally { setBusy(false) }
  }

  const handleCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setBusy(true); setError(null); setMessage(null)
    try {
      const records = parseMyFitnessPalCsv(await file.text())
      const saved = await saveRecords(records)
      setMessage(`${saved} MyFitnessPal row${saved === 1 ? '' : 's'} imported. Re-importing the same export will update, not duplicate, those rows.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The CSV could not be imported.')
    } finally {
      event.target.value = ''
      setBusy(false)
    }
  }

  const deleteLog = async (id: string) => {
    setBusy(true); setError(null)
    try {
      const response = await fetch(withBasePath('/api/nutrition'), {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('The record could not be deleted.')
      await loadLogs()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The record could not be deleted.')
    } finally { setBusy(false) }
  }

  const downloadSample = () => {
    const sample = 'Date,Meal,Calories,Carbohydrates (g),Fat (g),Protein (g),Fiber (g)\n2026-08-10,Breakfast,510,48,18,42,7\n'
    const url = URL.createObjectURL(new Blob([sample], { type: 'text/csv' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'nutrition-import-sample.csv'; anchor.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nutrition workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Actual intake vs. PRIME targets</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Import MyFitnessPal CSV data or record a daily total manually. Every day is compared with the active PRIME calculation.</p>
        </div>
        <Badge variant="outline" className="gap-2 px-3 py-1.5"><Apple className="h-4 w-4" /> CSV + manual logging available</Badge>
      </header>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Current nutrition targets">
        <Card><CardContent className="p-5"><Target className="h-5 w-5 text-primary" /><p className="mt-4 text-2xl font-semibold">{calorieTarget ? calorieTarget.toLocaleString() : '—'}</p><p className="text-sm text-muted-foreground">Daily calorie target</p></CardContent></Card>
        <Card><CardContent className="p-5"><Utensils className="h-5 w-5 text-primary" /><p className="mt-4 text-2xl font-semibold">{proteinTarget ? `${proteinTarget} g` : '—'}</p><p className="text-sm text-muted-foreground">Daily protein target</p></CardContent></Card>
        <Card><CardContent className="p-5"><CalendarDays className="h-5 w-5 text-primary" /><p className="mt-4 text-2xl font-semibold">{days.length}</p><p className="text-sm text-muted-foreground">Days recorded</p></CardContent></Card>
        <Card><CardContent className="p-5"><FileUp className="h-5 w-5 text-primary" /><p className="mt-4 text-2xl font-semibold">{logs.filter((log) => log.source === 'myfitnesspal_csv').length}</p><p className="text-sm text-muted-foreground">Imported rows</p></CardContent></Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <Card>
          <CardHeader><CardTitle>Log a daily total</CardTitle><CardDescription>Use this when you do not have a CSV export.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={handleManualSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nutrition-date">Date</Label><Input id="nutrition-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="nutrition-meal">Label</Label><Input id="nutrition-meal" value={form.meal} onChange={(event) => setForm({ ...form, meal: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="nutrition-calories">Calories</Label><Input id="nutrition-calories" type="number" min="1" required value={form.calories} onChange={(event) => setForm({ ...form, calories: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="nutrition-protein">Protein (g)</Label><Input id="nutrition-protein" type="number" min="0" step="0.1" value={form.protein_g} onChange={(event) => setForm({ ...form, protein_g: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="nutrition-carbs">Carbs (g)</Label><Input id="nutrition-carbs" type="number" min="0" step="0.1" value={form.carbs_g} onChange={(event) => setForm({ ...form, carbs_g: event.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="nutrition-fat">Fat (g)</Label><Input id="nutrition-fat" type="number" min="0" step="0.1" value={form.fat_g} onChange={(event) => setForm({ ...form, fat_g: event.target.value })} /></div>
              </div>
              <Button className="w-full" disabled={busy}><Plus className="mr-2 h-4 w-4" /> Save nutrition entry</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Import a MyFitnessPal CSV</CardTitle><CardDescription>Date and Calories are required. Meal, protein, carbs, fat, and fiber are imported when present.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/50 bg-primary/5 p-6 text-center focus-within:ring-2 focus-within:ring-ring">
              <FileUp className="h-8 w-8 text-primary" />
              <span className="mt-3 font-medium">Choose a CSV export</span>
              <span className="mt-1 text-xs text-muted-foreground">The file is parsed locally, then stored in the app’s private data directory.</span>
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={handleCsv} disabled={busy} />
            </label>
            <Button type="button" variant="outline" onClick={downloadSample}><Download className="mr-2 h-4 w-4" /> Download accepted-format sample</Button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader><CardTitle>Daily variance</CardTitle><CardDescription>Positive calorie variance means intake was above the current PRIME target.</CardDescription></CardHeader>
        <CardContent>
          {days.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead><tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="py-3">Date</th><th>Calories</th><th>Variance</th><th>Protein</th><th>Macros</th><th>Rows</th></tr></thead>
                <tbody>{days.slice(0, 30).map((day) => {
                  const variance = calorieTarget ? Math.round(day.calories - calorieTarget) : null
                  return <tr key={day.date} className="border-b last:border-0"><td className="py-3 font-medium">{day.date}</td><td>{Math.round(day.calories).toLocaleString()}</td><td><Badge variant={variance != null && Math.abs(variance) <= 100 ? 'secondary' : 'outline'}>{variance == null ? 'No target' : `${variance > 0 ? '+' : ''}${variance} kcal`}</Badge></td><td>{Math.round(day.protein_g)} g {proteinTarget ? <span className="text-muted-foreground">/ {proteinTarget} g</span> : null}</td><td className="text-muted-foreground">{Math.round(day.carbs_g)}C · {Math.round(day.fat_g)}F</td><td>{day.record_count}</td></tr>
                })}</tbody>
              </table>
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">No nutrition data yet. Add a manual total or import a CSV.</p>}
        </CardContent>
      </Card>

      {logs.length > 0 && <Card><CardHeader><CardTitle>Recent source records</CardTitle><CardDescription>Individual rows remain editable by deleting and re-entering or re-importing them.</CardDescription></CardHeader><CardContent className="space-y-2">{logs.slice(0, 12).map((log) => <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-medium">{log.date} · {log.meal || 'Nutrition record'}</p><p className="text-xs text-muted-foreground">{Math.round(log.calories)} kcal · {Math.round(log.protein_g)} g protein · {log.source === 'myfitnesspal_csv' ? 'MyFitnessPal CSV' : 'Manual'}</p></div><Button size="icon" variant="ghost" onClick={() => deleteLog(log.id)} disabled={busy} aria-label={`Delete ${log.date} ${log.meal || 'nutrition record'}`}><Trash2 className="h-4 w-4" /></Button></div>)}</CardContent></Card>}
    </div>
  )
}
