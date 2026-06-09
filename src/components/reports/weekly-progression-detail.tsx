"use client"

/**
 * WeeklyProgressionDetail
 *
 * Renders the new day-type breakdown fields emitted by the upgraded calc engine:
 *   training_calories, rest_calories, psmf_calories, protein_g, phase,
 *   calorie_floor, weekly_fat_loss_lb, p_ratio, rmr_method, below_rmr, feasibility
 *
 * All new fields are OPTIONAL — this component renders gracefully when they are
 * absent (old reports without the upgraded engine output).
 *
 * Each week is rendered as a collapsible row. Click the week row to expand/collapse
 * the day-type breakdown card beneath it.
 */

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { WeeklyProgression } from "@/types"

// ─── helpers ────────────────────────────────────────────────────────────────

const PHASE_COLORS: Record<string, string> = {
  RESET: "bg-blue-100 text-blue-800 border-blue-200",
  ADAPT: "bg-amber-100 text-amber-800 border-amber-200",
  CYCLE: "bg-purple-100 text-purple-800 border-purple-200",
  PEAK: "bg-rose-100 text-rose-800 border-rose-200",
}

const FEASIBILITY_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  on_track: {
    label: "On Track",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  aggressive: {
    label: "Aggressive",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  ceiling_capped: {
    label: "Ceiling Capped",
    badgeClass: "bg-red-100 text-red-800 border-red-300",
  },
}

function fmt(n: number | undefined | null, decimals = 0): string {
  if (n == null || isNaN(n)) return "—"
  return decimals === 0
    ? Math.round(n).toLocaleString()
    : n.toFixed(decimals)
}

function hasNewFields(week: WeeklyProgression): boolean {
  return (
    week.training_calories != null ||
    week.rest_calories != null ||
    week.psmf_calories != null ||
    week.protein_g != null ||
    week.phase != null ||
    week.feasibility != null
  )
}

// ─── sub-components ─────────────────────────────────────────────────────────

function FeasibilityBadge({
  feasibility,
}: {
  feasibility: WeeklyProgression["feasibility"]
}) {
  if (!feasibility) return null
  const cfg = FEASIBILITY_CONFIG[feasibility]
  if (!cfg) return <Badge variant="outline">{feasibility}</Badge>
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cfg.badgeClass}`}
    >
      {feasibility === "on_track" && (
        <span className="mr-1" aria-hidden>
          ✓
        </span>
      )}
      {feasibility === "aggressive" && (
        <span className="mr-1" aria-hidden>
          ⚡
        </span>
      )}
      {feasibility === "ceiling_capped" && (
        <span className="mr-1" aria-hidden>
          ⚠
        </span>
      )}
      {cfg.label}
    </span>
  )
}

function PhaseBadge({ phase }: { phase?: string }) {
  if (!phase) return null
  const colorClass =
    PHASE_COLORS[phase.toUpperCase()] ||
    "bg-slate-100 text-slate-800 border-slate-200"
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
    >
      {phase}
    </span>
  )
}

function BelowRmrFlag({ below_rmr }: { below_rmr?: boolean }) {
  if (!below_rmr) return null
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
      <span aria-hidden>⚡</span> Below Resting Metabolic Rate (RMR) — by design on PED protocol
    </span>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

interface WeeklyProgressionDetailProps {
  progression: WeeklyProgression[]
}

export function WeeklyProgressionDetail({
  progression,
}: WeeklyProgressionDetailProps) {
  const [expandedWeeks, setExpandedWeeks] = React.useState<Set<number>>(
    new Set()
  )

  const toggleWeek = React.useCallback((index: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // If none of the weeks have new fields, don't render the section at all —
  // this is an old report from before the engine upgrade.
  const anyHasNewFields = React.useMemo(
    () => progression.some(hasNewFields),
    [progression]
  )

  if (!anyHasNewFields) return null

  return (
    <div className="space-y-2">
      {progression.map((week, index) => {
        const weekNum = week.week_number ?? index + 1
        const isExpanded = expandedWeeks.has(index)
        const weekHasDetail = hasNewFields(week)

        return (
          <div key={index} className="rounded-md border bg-card">
            {/* ── Week header row ── */}
            <button
              type="button"
              onClick={() => weekHasDetail && toggleWeek(index)}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors
                ${weekHasDetail ? "hover:bg-muted/60 cursor-pointer" : "cursor-default"}
                ${isExpanded ? "bg-muted/40" : ""}
              `}
              aria-expanded={isExpanded}
              disabled={!weekHasDetail}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold w-16">Week {weekNum}</span>
                <span className="text-muted-foreground tabular-nums">
                  {fmt(week.weight, 1)} lbs
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {fmt(week.body_fat_percentage, 1)}% BF
                </span>
                {week.phase && <PhaseBadge phase={week.phase} />}
                {week.feasibility && (
                  <FeasibilityBadge feasibility={week.feasibility} />
                )}
                {week.below_rmr && <BelowRmrFlag below_rmr={week.below_rmr} />}
              </div>
              {weekHasDetail && (
                <span
                  className="text-muted-foreground text-xs ml-2 shrink-0"
                  aria-hidden
                >
                  {isExpanded ? "▲ Collapse" : "▼ Day-type detail"}
                </span>
              )}
            </button>

            {/* ── Expanded detail card ── */}
            {isExpanded && weekHasDetail && (
              <div className="border-t px-4 py-3">
                <Card className="bg-muted/20">
                  <CardContent className="pt-4 pb-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">

                      {/* Day-type calories */}
                      {week.training_calories != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Training-day calories
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.training_calories)} kcal
                          </p>
                        </div>
                      )}
                      {week.rest_calories != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Rest-day calories
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.rest_calories)} kcal
                          </p>
                        </div>
                      )}
                      {week.psmf_calories != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Protein-Sparing Modified Fast (PSMF) day calories
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.psmf_calories)} kcal
                          </p>
                        </div>
                      )}

                      {/* Protein */}
                      {week.protein_g != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Daily protein
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.protein_g)} g
                          </p>
                        </div>
                      )}

                      {/* Weekly average calories */}
                      {week.weekly_average_calories != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Weekly average calories
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.weekly_average_calories)} kcal/day
                          </p>
                        </div>
                      )}

                      {/* Calorie floor */}
                      {week.calorie_floor != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Calorie floor (this week)
                          </p>
                          <p className="font-semibold tabular-nums">
                            {fmt(week.calorie_floor)} kcal/day
                          </p>
                        </div>
                      )}

                      {/* Weekly fat loss */}
                      {week.weekly_fat_loss_lb != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Est. weekly fat loss
                          </p>
                          <p className="font-semibold tabular-nums text-emerald-700">
                            {fmt(week.weekly_fat_loss_lb, 2)} lbs
                          </p>
                        </div>
                      )}

                      {/* Partitioning ratio */}
                      {week.p_ratio != null && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Fat:lean partitioning ratio (p-ratio)
                          </p>
                          <p className="font-semibold tabular-nums">
                            {(week.p_ratio * 100).toFixed(0)}% fat /{" "}
                            {((1 - week.p_ratio) * 100).toFixed(0)}% lean
                          </p>
                        </div>
                      )}

                      {/* RMR method */}
                      {week.rmr_method && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">
                            Resting Metabolic Rate (RMR) equation
                          </p>
                          <p className="font-semibold capitalize">
                            {week.rmr_method.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Flags row */}
                    {week.below_rmr && (
                      <div className="mt-3 pt-3 border-t">
                        <BelowRmrFlag below_rmr={week.below_rmr} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
