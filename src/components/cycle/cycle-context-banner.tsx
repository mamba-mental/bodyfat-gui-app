"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarClock, AlertTriangle, Target } from "lucide-react"
import { currentCycleWeek, nextWeighIn, missedWeighIns } from "@/lib/cycleWeek"
import { useCycles } from "@/hooks/use-cycles"

/**
 * Shows "where am I in my ReComp Cycle" context: active cycle name, current week,
 * next scheduled weigh-in, and any missed check-ins. Self-contained — it loads the
 * active cycle itself; the caller passes the entry dates it already has so we don't
 * double-fetch. Pure date math lives in cycleWeek.ts (UTC, timezone-safe).
 */

const DAY = 86_400_000

/** Local calendar date as YYYY-MM-DD (matches how entry dates are stored). */
function todayLocalISO(): string {
  // en-CA formats as YYYY-MM-DD; uses the browser's local timezone.
  return new Date().toLocaleDateString("en-CA")
}

function toISO(d: unknown): string {
  if (typeof d === "string") return d.slice(0, 10)
  try {
    return new Date(d as string).toLocaleDateString("en-CA")
  } catch {
    return ""
  }
}

interface Cycle {
  id: string
  name: string
  status: string
  start_date: string
  end_date?: string | null
  timeline_weeks?: number | null
  weighin_days?: number[] | null
}

interface CycleContextBannerProps {
  /** Entry dates (any format) the caller already has, used for missed-weigh-in detection. */
  entryDates?: string[]
  className?: string
}

export function CycleContextBanner({ entryDates = [], className }: CycleContextBannerProps) {
  // Shared reactive source — re-fetches whenever any cycle transition fires
  // refreshWidgets() (the old empty-deps useEffect never refetched: stale banner).
  const { active: cycle, loaded } = useCycles()

  // No active cycle (or still loading first paint) — render nothing rather than a stub.
  if (!loaded || !cycle) return null

  const today = todayLocalISO()
  const week = currentCycleWeek(cycle.start_date, today, cycle.timeline_weeks ?? undefined)
  const total = cycle.timeline_weeks ?? undefined
  const weighinDays = cycle.weighin_days ?? []
  const dates = entryDates.map(toISO).filter(Boolean)
  const next = nextWeighIn(today, weighinDays)
  const missed = missedWeighIns(cycle.start_date, today, weighinDays, dates)

  // Days remaining in the cycle (if it has an end date).
  const daysLeft = cycle.end_date
    ? Math.max(0, Math.round((Date.parse(cycle.end_date) - Date.parse(today)) / DAY))
    : null

  return (
    <div
      className={`rounded-lg border bg-card/60 p-4 ${className ?? ""}`}
      data-testid="cycle-context-banner"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <span className="font-semibold">{cycle.name}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            current cycle
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span>
            Week <span className="font-semibold">{week}</span>
            {total ? <span className="text-muted-foreground"> of {total}</span> : null}
          </span>
          {daysLeft !== null && (
            <span className="text-xs text-muted-foreground">· {daysLeft} days left</span>
          )}
        </div>

        {next && (
          <div className="text-sm text-muted-foreground">
            Next weigh-in:{" "}
            <span className="font-medium text-foreground">
              {new Date(next + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        )}
      </div>

      {missed.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div>
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {missed.length} missed weigh-in{missed.length > 1 ? "s" : ""} this cycle
            </span>
            <span className="text-muted-foreground">
              {" "}
              — last expected{" "}
              {new Date(missed[missed.length - 1] + "T00:00:00").toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
              . Past misses stay on the record; just log your next scheduled day to resume —
              they won&apos;t count against your trend.
            </span>
          </div>
        </div>
      )}

      {weighinDays.length === 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          No weigh-in schedule set.{" "}
          <Link href="/settings" className="underline underline-offset-2">
            Set your weekly check-in days
          </Link>{" "}
          to track missed weigh-ins.
        </div>
      )}
    </div>
  )
}
