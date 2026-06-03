"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Check } from "lucide-react"
import { nextWeighIn } from "@/lib/cycleWeek"

/**
 * Weigh-in commitment editor (P8). Lets the user pick which weekdays they'll weigh
 * in; the schedule is stored on the ACTIVE cycle (weighin_days + weighin_per_week)
 * so missed-check-in detection (New Entry banner) and the next-check-in date on
 * reports both read from one place. Saves via POST /api/data/cycles (full upsert).
 */

const DAYS = [
  { idx: 0, short: "Sun", label: "Sunday" },
  { idx: 1, short: "Mon", label: "Monday" },
  { idx: 2, short: "Tue", label: "Tuesday" },
  { idx: 3, short: "Wed", label: "Wednesday" },
  { idx: 4, short: "Thu", label: "Thursday" },
  { idx: 5, short: "Fri", label: "Friday" },
  { idx: 6, short: "Sat", label: "Saturday" },
]

interface Cycle {
  id: string
  name: string
  status: string
  start_date: string
  weighin_days?: number[] | null
  [k: string]: unknown
}

function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function WeighInScheduleCard() {
  const [cycle, setCycle] = React.useState<Cycle | null>(null)
  const [days, setDays] = React.useState<number[]>([])
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    fetch("/api/data/cycles")
      .then((r) => (r.ok ? r.json() : []))
      .then((cs: Cycle[]) => {
        if (!alive) return
        const active = (Array.isArray(cs) ? cs : []).find((c) => c.status === "active") ?? null
        setCycle(active)
        setDays(Array.isArray(active?.weighin_days) ? active!.weighin_days! : [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const toggleDay = (idx: number) => {
    setSaved(false)
    setDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b)
    )
  }

  const save = async () => {
    if (!cycle) return
    setSaving(true)
    setSaved(false)
    try {
      // Full upsert: spread the existing cycle so no field is lost, override schedule.
      const payload = {
        ...cycle,
        weighin_days: days,
        weighin_per_week: days.length,
        status: "active",
      }
      const res = await fetch("/api/data/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setCycle(payload)
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    cycle != null &&
    JSON.stringify(days) !==
      JSON.stringify(Array.isArray(cycle.weighin_days) ? cycle.weighin_days : [])

  const next = nextWeighIn(todayLocalISO(), days)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Weigh-In Schedule
        </CardTitle>
        <CardDescription>
          {cycle
            ? `Set which days you'll weigh in for ${cycle.name}. We'll flag missed check-ins and show your next one.`
            : "No active ReComp cycle. Start a cycle on the dashboard to set a weigh-in schedule."}
        </CardDescription>
      </CardHeader>
      {cycle && (
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d) => {
              const on = days.includes(d.idx)
              return (
                <button
                  key={d.idx}
                  type="button"
                  onClick={() => toggleDay(d.idx)}
                  aria-pressed={on}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  }`}
                >
                  {d.short}
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="secondary">
              {days.length === 0
                ? "No schedule"
                : `${days.length}x / week`}
            </Badge>
            {next && (
              <span className="text-muted-foreground">
                Next check-in:{" "}
                <span className="font-medium text-foreground">
                  {new Date(next + "T00:00:00").toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving..." : "Save Schedule"}
            </Button>
            {saved && !dirty && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
