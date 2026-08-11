"use client"

import { ArrowRight, CalendarDays, Check, FileText, LockKeyhole } from "lucide-react"
import type { ChallengePreview } from "@/types/challenge"

export function PlanPreviewPanel({ preview, loading }: { preview: ChallengePreview | null; loading: boolean }) {
  if (loading) {
    return <div className="min-h-[520px] animate-pulse rounded-3xl bg-[#e7efae]" aria-label="Building plan preview" />
  }
  if (!preview) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl bg-[linear-gradient(145deg,#ecf5d0,#f8d95e)] p-8 text-center text-[#17230f]">
        <CalendarDays className="h-10 w-10" />
        <h2 className="mt-4 font-serif text-3xl">Your exact 14-day plan will appear here.</h2>
        <p className="mt-3 max-w-md text-sm text-[#48512f]">The preview binds your current metrics, the editable template revision, the selected source schedule, and one PRIME calculation snapshot.</p>
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
    <section className="rounded-3xl bg-[linear-gradient(145deg,#eef7bc,#f5d13c)] p-6 text-[#17230f] shadow-[0_20px_60px_rgba(69,78,19,0.14)] lg:p-8">
      <div className="grid grid-cols-2 gap-4 border-b border-black/15 pb-6 md:grid-cols-4">
        {[
          [dailyCalories.toLocaleString(), "Average calories"],
          [`${protein} g`, "Daily protein"],
          [`${first?.body_fat_percentage?.toFixed(1) ?? "—"}% → ${last?.body_fat_percentage?.toFixed(1) ?? "—"}%`, "PRIME projection"],
          ["14", "Calendar days"],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="text-2xl font-semibold tracking-tight lg:text-3xl">{value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#4c562d]">{label}</p>
          </div>
        ))}
      </div>

      <div className="py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]">Plan preview</p>
            <h2 className="mt-1 font-serif text-3xl">{preview.plan_snapshot.title}</h2>
          </div>
          <span className="rounded-full border border-black/20 bg-white/35 px-3 py-1 text-xs font-semibold">
            Revision {preview.plan_snapshot.template_revision_number}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5" aria-label="Fourteen day schedule overview">
          {preview.plan_snapshot.days.map((day) => (
            <div key={day.day_number} className="rounded-lg border border-black/10 bg-white/35 px-1 py-2 text-center">
              <p className="text-[10px] font-semibold uppercase text-[#596332]">D{day.day_number}</p>
              <p className="mt-1 text-xs font-bold">{day.nutrition_target.calories}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-black/15 pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Why this plan is reproducible</p>
        <ol className="mt-4 space-y-3">
          {[
            "Current profile and goals are captured in the calculation snapshot.",
            `Template revision ${preview.plan_snapshot.template_revision_number} supplies the training, nutrition-day, recovery, and safety structure.`,
            `Protocol source weeks ${preview.protocol_snapshot.start_week}–${preview.protocol_snapshot.end_week} supply all 14 days of the selected PED schedule.`,
            "The plan and report read the same immutable revision; actual daily logs are layered on top.",
          ].map((item, index) => (
            <li key={item} className="flex gap-3 text-sm">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#18210f] text-xs text-white">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 rounded-xl border border-black/15 bg-white/30 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {preview.readiness.ready ? <Check className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
          {preview.readiness.ready ? "Ready to activate" : "Activation requirements"}
        </div>
        {!preview.readiness.ready && (
          <ul className="mt-2 space-y-1 text-xs text-[#535c34]">
            {preview.readiness.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
          </ul>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-xs text-[#4d562f]">
        <span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Report-ready revision</span>
        <span className="inline-flex items-center gap-1">Command Center <ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </section>
  )
}
