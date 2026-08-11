import { CheckCircle, PackageSearch, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import ClientIcon from "@/components/ui/client-icon"

const plannedCapabilities = [
  "Confirmed inventory intake with units, quantities, and expiration tracking",
  "Source-backed draft schedules for 14-day, standard, and custom-length cuts",
  "Shortage, unresolved-range, and missing-source blockers before activation",
  "Versioned amendments, completion tracking, and planned-versus-actual reports",
]

export function PedSchedulerRoadmapCard() {
  return (
    <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/[0.035] p-4" aria-labelledby="ped-scheduler-roadmap-title">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <ClientIcon icon={PackageSearch} className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="ped-scheduler-roadmap-title" className="text-lg font-semibold">
              AI-Assisted PED Inventory &amp; Protocol Scheduler
            </h3>
            <Badge variant="outline">Coming soon · specification in review</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Match confirmed on-hand inventory to reviewed protocol sources, then build a dated,
            report-ready draft for 14-day, standard, and custom-length cuts.
          </p>

          <div className="grid gap-2 text-sm md:grid-cols-2">
            {plannedCapabilities.map((capability) => (
              <div key={capability} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{capability}</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p>
              This will be a constrained planning and tracking tool, not an AI prescriber. It will
              not invent compounds, doses, substitutions, or missing source values; activation will
              require complete inputs, provenance, and documented review.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
