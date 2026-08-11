import Link from "next/link"
import { ArrowRight, CheckCircle, PackageSearch, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import ClientIcon from "@/components/ui/client-icon"

const availableCapabilities = [
  "Confirmed inventory intake with units, quantities, and expiration tracking",
  "Exact source-event coverage and shortage blockers for the 14-day cut",
  "Documented reviewed values for literal source ranges",
  "Inventory and review provenance frozen into the generated report",
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
            <Badge variant="outline">14-day manual MVP available</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            The manual 14-day workflow is ready in Plans. The complete design still targets
            source-backed schedules for 14-day, standard, and custom-length cuts.
          </p>

          <div className="grid gap-2 text-sm md:grid-cols-2">
            {availableCapabilities.map((capability) => (
              <div key={capability} className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{capability}</span>
              </div>
            ))}
          </div>

          <Link href="/plans" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            Open 14-day setup <ArrowRight className="h-4 w-4" />
          </Link>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 p-3 text-xs text-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p>
              AI label intake, arbitrary durations, reminders, and automated replanning remain on the roadmap.
              The available MVP is a constrained planning and tracking tool, not an AI prescriber; it will not
              invent compounds, doses, substitutions, or missing source values.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
