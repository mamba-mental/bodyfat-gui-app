"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RefreshCw, Square, Archive, Repeat } from "lucide-react"
import { currentCycleWeek } from "@/lib/cycleWeek"
import { useCycles } from "@/hooks/use-cycles"

/**
 * ReComp Cycle manager (P3). Surfaces the active cycle on the dashboard and wires
 * the real transitions — start a new cycle (demotes the prior active one server-side
 * via save_cycle's one-active invariant), stop the current cycle, or archive it.
 * All transitions POST the full cycle to /api/data/cycles, then refetch.
 */

interface Cycle {
  id: string
  name: string
  status: string
  start_date: string
  end_date?: string | null
  start_weight?: number | null
  start_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
  timeline_weeks?: number | null
  weighin_days?: number[] | null
  [k: string]: unknown
}

interface CycleManagerCardProps {
  /** Latest weigh-in, used to seed a new cycle's starting weight/bf. */
  latestWeight?: number | null
  latestBf?: number | null
}

function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA")
}

export function CycleManagerCard({ latestWeight, latestBf }: CycleManagerCardProps) {
  // Shared reactive source — notifyChanged() bumps the app-wide refreshKey so
  // this card AND the dashboard banner both re-fetch after any transition.
  const { active, notifyChanged } = useCycles()
  const [busy, setBusy] = React.useState(false)
  const [startOpen, setStartOpen] = React.useState(false)

  const postCycle = async (cycle: Cycle) => {
    setBusy(true)
    try {
      const res = await fetch("/api/data/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cycle),
      })
      if (res.ok) notifyChanged()
    } finally {
      setBusy(false)
    }
  }

  const setStatus = (status: "stopped" | "archived") => {
    if (!active) return
    postCycle({ ...active, status })
  }

  // --- New-cycle form state ---
  const [form, setForm] = React.useState({
    name: "",
    startDate: todayLocalISO(),
    timelineWeeks: 16,
    goalWeight: "",
    goalBf: "",
  })

  const startNewCycle = async () => {
    const today = todayLocalISO()
    const end = new Date(Date.parse(form.startDate) + (form.timelineWeeks || 16) * 7 * 86_400_000)
      .toISOString()
      .slice(0, 10)
    const newCycle: Cycle = {
      id: `cyc-${Date.now()}`,
      name: form.name.trim() || `Recomp ${today}`,
      status: "active",
      start_date: form.startDate || today,
      end_date: end,
      start_weight: latestWeight ?? active?.goal_weight ?? null,
      start_bf: latestBf ?? active?.goal_bf ?? null,
      goal_weight: form.goalWeight ? Number(form.goalWeight) : active?.goal_weight ?? null,
      goal_bf: form.goalBf ? Number(form.goalBf) : active?.goal_bf ?? null,
      timeline_weeks: form.timelineWeeks || 16,
      weighin_days: active?.weighin_days ?? [],
    }
    await postCycle(newCycle)
    setStartOpen(false)
  }

  const week = active ? currentCycleWeek(active.start_date, todayLocalISO(), active.timeline_weeks ?? undefined) : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            ReComp Cycle
          </CardTitle>
          <CardDescription>
            {active
              ? `${active.name} — Week ${week}${active.timeline_weeks ? ` of ${active.timeline_weeks}` : ""}`
              : "No active cycle. Start one to begin tracking a new recomp phase."}
          </CardDescription>
        </div>
        {active && <Badge variant="default">active</Badge>}
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {/* Start new cycle */}
        <Dialog open={startOpen} onOpenChange={setStartOpen}>
          <DialogTrigger asChild>
            <Button variant="default" disabled={busy}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {active ? "Start New Cycle" : "Start Cycle"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a New ReComp Cycle</DialogTitle>
              <DialogDescription>
                {active
                  ? `This stops "${active.name}" (kept as history) and begins a fresh cycle. Past entries and reports stay with their cycle.`
                  : "Begin tracking a new recomp phase."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cyc-name">Cycle name</Label>
                <Input
                  id="cyc-name"
                  placeholder={`Recomp ${todayLocalISO()}`}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cyc-start">Start date</Label>
                  <Input
                    id="cyc-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cyc-weeks">Timeline (weeks)</Label>
                  <Input
                    id="cyc-weeks"
                    type="number"
                    min={1}
                    value={form.timelineWeeks}
                    onChange={(e) => setForm((f) => ({ ...f, timelineWeeks: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cyc-gw">Goal weight (lbs)</Label>
                  <Input
                    id="cyc-gw"
                    type="number"
                    step="0.1"
                    placeholder={active?.goal_weight ? String(active.goal_weight) : "Optional"}
                    value={form.goalWeight}
                    onChange={(e) => setForm((f) => ({ ...f, goalWeight: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="cyc-gbf">Goal body fat (%)</Label>
                  <Input
                    id="cyc-gbf"
                    type="number"
                    step="0.1"
                    placeholder={active?.goal_bf ? String(active.goal_bf) : "Optional"}
                    value={form.goalBf}
                    onChange={(e) => setForm((f) => ({ ...f, goalBf: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStartOpen(false)}>
                Cancel
              </Button>
              <Button onClick={startNewCycle} disabled={busy}>
                {busy ? "Starting..." : "Start Cycle"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stop current cycle */}
        {active && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={busy}>
                <Square className="mr-2 h-4 w-4" />
                Stop Cycle
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Stop {active.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Stopping ends this cycle early but keeps all its entries and reports as history.
                  You can start a new cycle anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStatus("stopped")}>Stop Cycle</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Archive current cycle */}
        {active && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" disabled={busy}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {active.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Archiving hides this cycle from the active view while preserving its data.
                  It will still appear in the Reports cycle selector.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStatus("archived")}>Archive</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
