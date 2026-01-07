"use client"

import {
  ProgressTrendChart,
  GoalProgressWidget,
  MetabolicInsightsWidget
} from "@/components/charts/lazy-chart-components"
import type { BodyFatEntry, UserData, CalculationResult } from "@/types"

interface ProgressTabProps {
  programEntries: BodyFatEntry[]
  currentUser: UserData | null
  currentCalculation: CalculationResult | null
}

export function ProgressTab({
  programEntries,
  currentUser,
  currentCalculation,
}: ProgressTabProps) {
  return (
    <div className="space-y-4">
      <ProgressTrendChart
        entries={programEntries}
        progression={currentCalculation?.progression}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GoalProgressWidget
          user={currentUser ?? undefined}
          entries={programEntries}
          progression={currentCalculation?.progression}
        />
        <MetabolicInsightsWidget
          progression={currentCalculation?.progression}
        />
      </div>
    </div>
  )
}
