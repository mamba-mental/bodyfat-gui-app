"use client"

import { CalorieManagementWidget } from "@/components/charts/lazy-chart-components"
import type { UserData, CalculationResult } from "@/types"

interface NutritionTabProps {
  currentUser: UserData | null
  currentCalculation: CalculationResult | null
  currentCalories: number
}

export function NutritionTab({
  currentUser,
  currentCalculation,
  currentCalories,
}: NutritionTabProps) {
  return (
    <div className="space-y-4">
      <CalorieManagementWidget
        progression={currentCalculation?.progression}
        currentCalories={currentCalories}
        user={currentUser ?? undefined}
      />
    </div>
  )
}
