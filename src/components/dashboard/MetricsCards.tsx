"use client"

import { CalendarDays, Target, TrendingDown } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardMetrics } from "./hooks/useDashboardData"
import type { CalculationResult } from "@/types"

interface MetricsCardsProps {
  metrics: DashboardMetrics
  currentCalculation: CalculationResult | null
}

export function MetricsCards({ metrics, currentCalculation }: MetricsCardsProps) {
  const {
    currentWeight,
    currentBF,
    startWeight,
    startBF,
    currentCalories,
    programData,
  } = metrics

  return (
    <section aria-labelledby="metrics-heading">
      <h3 id="metrics-heading" className="sr-only">Current Metrics Overview</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Current Weight Card */}
        <Card
          className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20"
          role="article"
          aria-labelledby="current-weight-title"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="current-weight-title" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Current Weight
            </CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-full" aria-hidden="true">
              <ClientIcon icon={TrendingDown} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="text-2xl font-bold text-emerald-800 dark:text-emerald-200"
              aria-label={`Current weight: ${currentWeight.toFixed(1)} pounds`}
            >
              {currentWeight.toFixed(1)} lbs
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              {startWeight > currentWeight ? (
                <span aria-label={`${Math.abs(startWeight - currentWeight).toFixed(1)} pounds lost since starting`}>
                  <span aria-hidden="true">&#8595;</span> {Math.abs(startWeight - currentWeight).toFixed(1)} lbs lost
                </span>
              ) : (
                <span aria-label={`${Math.abs(startWeight - currentWeight).toFixed(1)} pounds gained since starting`}>
                  <span aria-hidden="true">&#8593;</span> {Math.abs(startWeight - currentWeight).toFixed(1)} lbs gained
                </span>
              )}
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-10" aria-hidden="true">&#x2696;&#xFE0F;</div>
        </Card>

        {/* Body Fat Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Body Fat %</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full">
              <ClientIcon icon={TrendingDown} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {currentBF.toFixed(1)}%
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
              {startBF > currentBF ? (
                <>&#8595; {Math.abs(startBF - currentBF).toFixed(1)}% reduced</>
              ) : (
                <>&#8593; {Math.abs(startBF - currentBF).toFixed(1)}% increased</>
              )}
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F3AF;</div>
        </Card>

        {/* Calories Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">This Week's Calories</CardTitle>
            <div className="p-2 bg-orange-500/10 rounded-full">
              <ClientIcon icon={Target} className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              {currentCalories ? Math.round(currentCalories) : 'Calculating...'}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {currentCalculation ? `Week ${programData.currentWeek} target` : 'Pending calculation'}
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F525;</div>
        </Card>

        {/* Program Progress Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Program Progress</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full">
              <ClientIcon icon={CalendarDays} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              Week {programData.currentWeek}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              of {programData.totalWeeks} weeks ({Math.round(programData.programProgress)}% complete)
            </p>
          </CardContent>
          <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F4C8;</div>
        </Card>
      </div>
    </section>
  )
}
