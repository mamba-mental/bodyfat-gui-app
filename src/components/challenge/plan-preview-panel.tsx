"use client"

import { CalendarDays, Check, FileText, LockKeyhole } from "lucide-react"
import type { ChallengePreview } from "@/types/challenge"

export function PlanPreviewPanel({ preview, loading }: { preview: ChallengePreview | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5" aria-label="Building plan preview" aria-busy="true">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-muted" />)}
        </div>
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/35 p-8 text-center">
        <CalendarDays className="h-9 w-9 text-primary" />
        <h4 className="mt-4 text-xl font-semibold">Your exact 14-day plan will appear here</h4>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Return to Readiness to bind your profile, template revision, source schedule, inventory coverage, and PRIME calculation.
        </p>
      </div>
    )
  }

  const progression = preview.calculation_snapshot.progression
  const first = progression[0]
  const last = progression[progression.length - 1]
  const dailyCalories = Math.round(
    preview.plan_snapshot.days.reduce((sum, day) => sum + day.nutrition_target.calories, 0) / 14,
  )
  const protein = Math.round(preview.plan_snapshot.days[0]?.nutrition_target.protein_g || 0)

  return (
    <section className="rounded-xl border border-border bg-card text-card-foreground" aria-labelledby="exact-plan-preview">
      <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Final plan preview</p>
          <h4 id="exact-plan-preview" className="mt-1 text-xl font-semibold">{preview.plan_snapshot.title}</h4>
        </div>
        <span className="w-fit rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
          Template revision {preview.plan_snapshot.template_revision_number}
        </span>
      </div>

      <dl className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          [dailyCalories.toLocaleString(), "Average calories"],
          [`${protein} g`, "Daily protein"],
          [`${first?.body_fat_percentage?.toFixed(1) ?? "—"}% → ${last?.body_fat_percentage?.toFixed(1) ?? "—"}%`, "PRIME projection"],
          ["14", "Calendar days"],
        ].map(([value, label], index) => (
          <div key={label} className={`p-4 ${index > 0 ? "border-t border-border sm:border-t-0 sm:border-l" : ""}`}>
            <dd className="text-xl font-semibold tracking-[-0.02em]">{value}</dd>
            <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="p-5">
        <p className="text-sm font-semibold">Fourteen-day calorie map</p>
        <div className="mt-3 grid grid-cols-7 gap-1.5" aria-label="Fourteen day schedule overview">
          {preview.plan_snapshot.days.map((day) => (
            <div key={day.day_number} className="rounded-md border border-border bg-muted px-1 py-2 text-center">
              <p className="text-[10px] text-muted-foreground">D{day.day_number}</p>
              <p className="mt-1 text-xs font-semibold">{day.nutrition_target.calories}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <p className="text-sm font-semibold">What is frozen into this revision</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Current profile, goals, and PRIME calculation inputs.</li>
            <li>• Diet, training, recovery, and safety template revision {preview.plan_snapshot.template_revision_number}.</li>
            <li>• Protocol source weeks {preview.protocol_snapshot.start_week}–{preview.protocol_snapshot.end_week} and all 14 dated PED events.</li>
            <li>• Inventory allocations, reviewed ranges, confirmation, and documented review provenance.</li>
          </ul>
        </div>

        <div className={`mt-5 rounded-lg border p-4 ${preview.readiness.ready ? "border-success/35 bg-success/10" : "border-warning/40 bg-warning/10"}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {preview.readiness.ready
              ? <Check className="h-4 w-4 text-success" />
              : <LockKeyhole className="h-4 w-4 text-warning" />}
            {preview.readiness.ready ? "Ready to start" : "Activation requirements remain"}
          </div>
          {!preview.readiness.ready ? (
            <ul className="mt-2 space-y-1 text-xs text-warning-foreground">
              {preview.readiness.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
            </ul>
          ) : null}
        </div>

        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> The Command Center and reports use this same immutable revision.
        </p>
      </div>
    </section>
  )
}
