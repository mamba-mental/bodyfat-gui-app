"use client"

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react"
import type { ProtocolWindow } from "@/types/challenge"

export function ProtocolScheduleCard({ protocol }: { protocol: ProtocolWindow | null }) {
  if (!protocol) {
    return (
      <div className="rounded-2xl border border-dashed border-[#c7cec3] bg-white/60 p-6 text-sm text-[#667067]">
        Choose a source week to inspect the exact two-week schedule already on file.
      </div>
    )
  }

  const phases = [...new Set(protocol.days.map((day) => day.phase))]
  return (
    <section className="rounded-2xl border border-[#cdd5ca] bg-white p-5 shadow-[0_8px_30px_rgba(31,55,41,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#687469]">Selected source schedule</p>
          <h3 className="mt-1 font-serif text-xl text-[#173c2a]">Weeks {protocol.start_week}–{protocol.end_week}</h3>
          <p className="mt-1 text-sm text-[#667067]">{phases.join(" → ")} · source version {protocol.version}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf5e8] px-3 py-1 text-xs font-semibold text-[#38612f]">
          <CheckCircle2 className="h-3.5 w-3.5" /> 14 days mapped
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {protocol.ped_stack.map((item) => (
          <span key={item.compound} className="rounded-full border border-[#d7ddd4] bg-[#f8faf7] px-2.5 py-1 text-xs text-[#34473a]">
            {item.source_name}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[protocol.days.slice(0, 7), protocol.days.slice(7)].map((week, index) => (
          <div key={index} className="rounded-xl bg-[#f3f1e9] p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6d756e]">Source week {week[0]?.source_week}</p>
            <div className="mt-2 space-y-1.5 text-xs text-[#405047]">
              {week.filter((day) => day.injections.length > 0).map((day) => (
                <p key={day.day_number}>
                  <span className="font-semibold uppercase">{day.weekday}</span>{" "}
                  {day.injections.map((item) => `${item.source_name} ${item.source_value}`).join(" · ")}
                </p>
              ))}
              <p className="pt-1 text-[#6c746d]">Daily timing is preserved verbatim in the Command Center and report.</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <p className="flex gap-2 rounded-lg bg-[#fff6de] p-3 text-[#72540c]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Ranged or missing values remain ranged or missing; the app does not invent replacements.
        </p>
        <p className="flex gap-2 rounded-lg bg-[#edf3ef] p-3 text-[#365143]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> This records a selected source schedule. It is not medical approval or a new PED recommendation.
        </p>
      </div>
    </section>
  )
}
