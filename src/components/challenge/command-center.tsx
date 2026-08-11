"use client"

import * as React from "react"
import Link from "next/link"
import { AlertTriangle, CalendarDays, Check, ChevronRight, ClipboardCheck, FileText, LockKeyhole, PencilLine, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { challengeApi } from "@/lib/challenge-api"
import { useApp } from "@/contexts/app-context"
import type { ChallengeCycle, ChallengeDailyLog, ChallengePlanDay } from "@/types/challenge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function currentDay(startDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const today = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00").getTime()
  return Math.min(14, Math.max(1, Math.floor((today - start) / 86_400_000) + 1))
}

function emptyLog(day: ChallengePlanDay, revision: number): ChallengeDailyLog {
  return {
    day_number: day.day_number,
    date: day.date,
    plan_revision: revision,
    calories: null,
    protein_g: null,
    steps: null,
    training_completed: false,
    cardio_completed: false,
    sleep_hours: null,
    resting_hr: null,
    notes: "",
  }
}

export function CommandCenter() {
  const { dispatch, refreshWidgets } = useApp()
  const [cycle, setCycle] = React.useState<ChallengeCycle | null>(null)
  const [logs, setLogs] = React.useState<ChallengeDailyLog[]>([])
  const [selectedDay, setSelectedDay] = React.useState(1)
  const [log, setLog] = React.useState<ChallengeDailyLog | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [amending, setAmending] = React.useState(false)
  const [amendment, setAmendment] = React.useState({ reason: "", calories: "", protein: "", training: "", cardio: "", acknowledged: false })

  const load = React.useCallback(async () => {
    const cycles = await challengeApi.cycles()
    const challenges = cycles.filter((item) => item.plan_mode === "two_week_cut" && item.plan_snapshot_json)
    const selected = challenges.find((item) => item.status === "active") || challenges[0] || null
    setCycle(selected)
    if (selected) {
      const dailyLogs = await challengeApi.dailyLogs(selected.id)
      setLogs(dailyLogs)
      setSelectedDay(currentDay(selected.start_date))
    }
  }, [])

  React.useEffect(() => {
    load().catch((error) => toast.error(error.message)).finally(() => setLoading(false))
  }, [load])

  const planDay = cycle?.plan_snapshot_json.days.find((day) => day.day_number === selectedDay) || null
  const todayStart = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00").getTime()
  const selectedDayStart = planDay ? new Date(`${planDay.date}T00:00:00`).getTime() : 0
  const canAmendSelectedDay = Boolean(planDay && selectedDayStart > todayStart && !logs.some((item) => item.day_number === selectedDay))
  const amendmentDiff = React.useMemo(() => {
    if (!planDay) return []
    const candidates = [
      { label: "Calories", before: String(planDay.nutrition_target.calories || "—"), after: amendment.calories.trim() || "—" },
      { label: "Protein", before: String(planDay.nutrition_target.protein_g || "—"), after: amendment.protein.trim() || "—" },
      { label: "Training", before: planDay.training || "Recovery", after: amendment.training.trim() || "Recovery" },
      { label: "Cardio", before: planDay.cardio || "—", after: amendment.cardio.trim() || "—" },
    ]
    return candidates.filter((item) => item.before !== item.after)
  }, [amendment.calories, amendment.cardio, amendment.protein, amendment.training, planDay])
  React.useEffect(() => {
    if (!cycle || !planDay) return
    setLog(logs.find((item) => item.day_number === selectedDay) || emptyLog(planDay, cycle.current_plan_revision))
    setAmendment({
      reason: "",
      calories: String(planDay.nutrition_target.calories || ""),
      protein: String(planDay.nutrition_target.protein_g || ""),
      training: planDay.training || "",
      cardio: planDay.cardio || "",
      acknowledged: false,
    })
  }, [cycle, planDay, logs, selectedDay])

  const setLogValue = (field: keyof ChallengeDailyLog, value: string | boolean) => {
    setLog((current) => {
      if (!current) return current
      const numericFields = new Set(["calories", "protein_g", "steps", "sleep_hours", "resting_hr", "bp_systolic", "bp_diastolic", "waist"])
      return { ...current, [field]: numericFields.has(field) ? (value === "" ? null : Number(value)) : value }
    })
  }

  const saveLog = async () => {
    if (!cycle || !log) return
    setBusy(true)
    try {
      const { day_number, ...values } = log
      await challengeApi.saveDailyLog(cycle.id, day_number, values)
      await load()
      toast.success(`Day ${day_number} log saved`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Daily log save failed")
    } finally {
      setBusy(false)
    }
  }

  const generateReport = async () => {
    if (!cycle) return
    setBusy(true)
    try {
      const generated = await challengeApi.report(cycle.id)
      dispatch({ type: 'ADD_REPORT', payload: generated as any })
      refreshWidgets()
      toast.success("Revision-bound 14-day report generated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report generation failed")
    } finally {
      setBusy(false)
    }
  }

  const saveAmendment = async () => {
    if (!cycle || !planDay || !amendment.reason.trim()) return toast.error("Explain why the plan is changing")
    if (!canAmendSelectedDay) return toast.error("Only future, unlogged days can be amended")
    setBusy(true)
    try {
      await challengeApi.amend(cycle.id, {
        effective_day: selectedDay,
        reason: amendment.reason.trim(),
        nutrition_calories: amendment.calories ? Number(amendment.calories) : undefined,
        protein_g: amendment.protein ? Number(amendment.protein) : undefined,
        training: amendment.training,
        cardio: amendment.cardio,
        safety_acknowledged: amendment.acknowledged,
      })
      await load()
      setAmending(false)
      toast.success(`Day ${selectedDay} amended in a new plan revision`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Amendment failed")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading 14-Day Command Center…</div>
  if (!cycle) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-[#f8f6f0] p-6">
        <div className="max-w-xl rounded-3xl border border-[#d7ddd4] bg-white p-10 text-center shadow-sm">
          <CalendarDays className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-4xl font-semibold">No 14-day challenge yet.</h1><p className="mt-3 text-sm text-muted-foreground">Use Plans to choose your dates, review diet and training, confirm the source-backed schedule and inventory, and check readiness.</p><Button asChild className="mt-6"><Link href="/plans">Start a 14-day plan <ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </main>
    )
  }

  const plan = cycle.plan_snapshot_json
  const loggedDays = new Set(logs.map((item) => item.day_number))
  const completion = Math.round((logs.length / 14) * 100)

  return (
    <main className="min-h-full bg-[#f8f6f0] p-4 text-[#1d2c22] md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#647068]">14-Day Cut Command Center</p><h1 className="mt-1 font-serif text-4xl font-medium text-[#173c2a]">Follow the plan. Log the truth.</h1><p className="mt-2 text-sm text-[#687169]">{plan.start_date} – {plan.end_date} · plan revision {cycle.current_plan_revision}</p></div>
          <div className="rounded-xl border border-[#d7ddd4] bg-white px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-[#778078]">Challenge status</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#3c6635]"><ShieldCheck className="h-4 w-4" /> {cycle.status}</p></div>
        </div>

        <section className="mb-5 rounded-2xl border border-[#d7ddd4] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#69736b]">14-day timeline</p><p className="mt-1 text-sm text-[#526058]">{logs.length} of 14 days logged · {completion}%</p></div><div className="h-2 w-48 overflow-hidden rounded-full bg-[#e4e8e2]"><div className="h-full bg-[#6a8c52]" style={{ width: `${completion}%` }} /></div></div>
          <div className="mt-4 grid grid-cols-7 gap-2 lg:grid-cols-14">
            {plan.days.map((day) => <button key={day.day_number} onClick={() => setSelectedDay(day.day_number)} className={`rounded-xl border px-1 py-3 text-center transition ${selectedDay === day.day_number ? "border-[#426b4e] bg-[#edf4ea] ring-2 ring-[#b6c9b2]" : "border-[#dce1da] bg-[#fbfcfa] hover:bg-[#f3f6f1]"}`}><span className="block text-[10px] uppercase text-[#778078]">Day</span><strong className="font-serif text-lg">{day.day_number}</strong><span className={`mx-auto mt-1 block h-2 w-2 rounded-full ${loggedDays.has(day.day_number) ? "bg-[#6f9456]" : "border border-[#9ca59e]"}`} /></button>)}
          </div>
        </section>

        {planDay && log && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
            <div className="space-y-5">
              <section className="overflow-hidden rounded-2xl border border-[#d7ddd4] bg-white">
                <div className="bg-[#173c2a] px-5 py-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.18em]">Day {selectedDay} · {planDay.date}</p><h2 className="mt-1 font-serif text-2xl">Today’s execution</h2></div>
                <div className="divide-y divide-[#e5e9e3]">
                  {[["Training", planDay.training || "Recovery"], ["Cardio / movement", planDay.cardio], ["Key instruction", planDay.key_instruction], ["Nutrition target", `${planDay.nutrition_target.calories} kcal · ${planDay.nutrition_target.protein_g} g protein`]].map(([label, value]) => <div key={label} className="grid grid-cols-[150px_1fr] gap-4 px-5 py-4 text-sm"><span className="text-[#788078]">{label}</span><strong>{value}</strong></div>)}
                </div>
              </section>

              <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#69736b]">Daily log</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">Actual results</h2></div><ClipboardCheck className="h-6 w-6 text-[#52745b]" /></div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[["calories", "Calories", "number"], ["protein_g", "Protein (g)", "number"], ["steps", "Steps", "number"], ["sleep_hours", "Sleep (hours)", "number"], ["resting_hr", "Resting HR", "number"]].map(([field, label, type]) => <label key={field} className="text-xs font-semibold text-[#69736b]">{label}<Input className="mt-1.5" type={type} value={String(log[field as keyof ChallengeDailyLog] ?? "")} onChange={(event) => setLogValue(field as keyof ChallengeDailyLog, event.target.value)} /></label>)}
                  <label className="text-xs font-semibold text-[#69736b] sm:col-span-2 lg:col-span-3">Notes<Input className="mt-1.5" value={String(log.notes ?? "")} onChange={(event) => setLogValue("notes", event.target.value)} /></label>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={log.training_completed} onChange={(event) => setLogValue("training_completed", event.target.checked)} className="accent-[#376447]" /> Training complete</label><label className="flex items-center gap-2"><input type="checkbox" checked={log.cardio_completed} onChange={(event) => setLogValue("cardio_completed", event.target.checked)} className="accent-[#376447]" /> Cardio / movement complete</label></div>
                <Button onClick={saveLog} disabled={busy} className="mt-5 bg-[#173c2a] text-white"><Check className="mr-2 h-4 w-4" /> Save Day {selectedDay}</Button>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#69736b]">Selected source schedule</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">PED timing · source week {planDay.protocol_schedule.source_week}</h2></div><span className="rounded-full bg-[#edf4ea] px-2.5 py-1 text-[10px] font-bold uppercase text-[#37612f]">{planDay.protocol_schedule.phase}</span></div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-[#f3f1e9] p-4"><p className="text-xs font-bold uppercase text-[#6d756e]">Injections</p>{planDay.protocol_schedule.injections.length ? planDay.protocol_schedule.injections.map((item) => <p key={item.source_name} className="mt-2 text-sm"><strong>{item.source_name}</strong> · {item.source_value}</p>) : <p className="mt-2 text-sm text-[#737b74]">No sourced injection item for this day.</p>}</div>
                  <div className="rounded-xl bg-[#f3f1e9] p-4"><p className="text-xs font-bold uppercase text-[#6d756e]">Oral / daily timing</p>{Object.entries(planDay.protocol_schedule.oral_and_daily_timing).map(([timing, value]) => <div key={timing} className="mt-2 grid grid-cols-[100px_1fr] gap-2 text-sm"><strong>{timing}</strong><span>{value}</span></div>)}</div>
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold uppercase text-primary">Exact inventory allocation</p>{planDay.protocol_schedule.inventory_schedule_events?.length ? planDay.protocol_schedule.inventory_schedule_events.map((event, index) => <div key={`${event.timing}-${event.compound}-${index}`} className="mt-2 border-t border-border/60 pt-2 text-sm first:border-0 first:pt-0"><strong>{event.timing} · {event.source_name}</strong><span className="ml-2">{event.amount} {event.unit}</span><p className="mt-0.5 text-xs text-muted-foreground">{event.resolution === "reviewed_range_selection" ? `Reviewed value recorded inside source ${event.source_value}` : `Exact source value ${event.source_value}`} · {event.allocations.map((allocation) => allocation.label_name || allocation.inventory_item_id).join(", ") || "allocation blocked"}</p></div>) : <p className="mt-2 text-sm text-muted-foreground">No inventory-backed events recorded for this day.</p>}</div>
                </div>
                <p className="mt-4 flex gap-2 rounded-lg bg-[#fff5dc] p-3 text-xs text-[#73570d]"><AlertTriangle className="h-4 w-4 shrink-0" /> Preserved from the selected protocol revision. This display does not imply medical approval.</p>
              </section>

              <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#69736b]">Report readiness</p><h2 className="mt-1 font-serif text-2xl text-[#173c2a]">{logs.length} / 14 days logged</h2></div><FileText className="h-6 w-6 text-[#52745b]" /></div>
                <Button onClick={generateReport} disabled={busy} className="mt-4 w-full bg-[#173c2a] text-white">{logs.length >= 14 ? "Generate final 14-day report" : cycle.status === "stopped" ? "Generate stopped-early report" : "Generate plan & progress report"}</Button><Button asChild variant="ghost" className="mt-2 w-full"><Link href="/reports">View all reports <ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
              </section>

              <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
                <button disabled={!canAmendSelectedDay} className="flex w-full items-center justify-between text-left disabled:cursor-not-allowed disabled:opacity-55" onClick={() => setAmending((value) => !value)}><span><span className="text-xs font-bold uppercase tracking-[0.18em] text-[#69736b]">Controlled amendment</span><span className="mt-1 block font-serif text-xl text-[#173c2a]">{canAmendSelectedDay ? "Change this future day" : "This day is protected"}</span></span>{canAmendSelectedDay ? <PencilLine className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}</button>
                {amending && (
                  <div className="mt-4 space-y-3">
                    <Input placeholder="Reason for change" value={amendment.reason} onChange={(event) => setAmendment((value) => ({ ...value, reason: event.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="number" placeholder="Calories" value={amendment.calories} onChange={(event) => setAmendment((value) => ({ ...value, calories: event.target.value }))} />
                      <Input type="number" placeholder="Protein" value={amendment.protein} onChange={(event) => setAmendment((value) => ({ ...value, protein: event.target.value }))} />
                    </div>
                    <Input placeholder="Training" value={amendment.training} onChange={(event) => setAmendment((value) => ({ ...value, training: event.target.value }))} />
                    <Input placeholder="Cardio" value={amendment.cardio} onChange={(event) => setAmendment((value) => ({ ...value, cardio: event.target.value }))} />
                    <div className="rounded-xl border bg-muted/45 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Before / after</p>
                      {amendmentDiff.length ? amendmentDiff.map((item) => (
                        <div key={item.label} className="mt-2 grid grid-cols-[70px_1fr_auto_1fr] items-center gap-2 text-xs">
                          <strong>{item.label}</strong><span className="truncate text-muted-foreground">{item.before}</span><span aria-hidden="true">→</span><span className="truncate text-primary">{item.after}</span>
                        </div>
                      )) : <p className="mt-2 text-xs text-muted-foreground">Change at least one plan field; the PED source schedule remains locked.</p>}
                    </div>
                    <label className="flex gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={amendment.acknowledged} onChange={(event) => setAmendment((value) => ({ ...value, acknowledged: event.target.checked }))} className="accent-primary" /> I understand this creates a new revision and does not rewrite elapsed or logged days.</label>
                    <Button onClick={saveAmendment} disabled={busy || !amendment.acknowledged || amendmentDiff.length === 0} variant="outline" className="w-full">Save amendment as revision {cycle.current_plan_revision + 1}</Button>
                  </div>
                )}
                {!amending && <p className="mt-3 flex gap-2 text-xs text-[#6e776f]"><LockKeyhole className="h-4 w-4 shrink-0" /> {canAmendSelectedDay ? "A dated amendment creates a new revision; the selected PED source schedule cannot be silently overwritten here." : "Today, elapsed days, and logged days are immutable. Select a future day to create an amendment."}</p>}
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
