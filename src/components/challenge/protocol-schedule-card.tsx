"use client"

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import type { ProtocolWindow } from "@/types/challenge"

export function ProtocolScheduleCard({ protocol }: { protocol: ProtocolWindow | null }) {
  if (!protocol) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/35 p-6 text-sm text-muted-foreground">
        Choose two source weeks to inspect the exact schedule already on file.
      </div>
    )
  }

  const phases = [...new Set(protocol.days.map((day) => day.phase))]
  return (
    <section className="rounded-xl border border-border bg-card p-5 text-card-foreground" aria-labelledby="selected-source-schedule">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Selected source schedule</p>
          <h4 id="selected-source-schedule" className="mt-1 text-lg font-semibold">Weeks {protocol.start_week}–{protocol.end_week}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{phases.join(" → ")} · source version {protocol.version}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> 14 days mapped
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Compounds in selected source schedule">
        {protocol.ped_stack.map((item) => (
          <span key={item.compound} className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
            {item.source_name}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[protocol.days.slice(0, 7), protocol.days.slice(7)].map((week) => (
          <div key={week[0]?.source_week} className="rounded-lg bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground">Source week {week[0]?.source_week}</p>
            <div className="mt-2 space-y-1.5 text-xs">
              {week.filter((day) => day.injections.length > 0).map((day) => (
                <p key={day.day_number}>
                  <span className="font-semibold">{day.weekday}</span>{" "}
                  {day.injections.map((item) => `${item.source_name} ${item.source_value}`).join(" · ")}
                </p>
              ))}
              <p className="pt-1 text-muted-foreground">Daily timing remains verbatim in the Command Center and report.</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <p className="flex gap-2 rounded-lg border border-warning/35 bg-warning/10 p-3 text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ranged or missing values stay ranged or missing; Apex Fit does not invent replacements.
        </p>
        <p className="flex gap-2 rounded-lg border border-info/30 bg-info/10 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-info" /> This records a selected source schedule. It is not medical approval or a new PED recommendation.
        </p>
      </div>
    </section>
  )
}
