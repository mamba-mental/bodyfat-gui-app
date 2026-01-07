"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ProgressTrendChart,
} from "@/components/charts/lazy-chart-components"
import {
  AIInsightsPanel,
  AIChatWidget
} from "@/components/ai/lazy-ai-components"
import { MetricsCards } from "../MetricsCards"
import { ProgressSummary } from "../ProgressSummary"
import type { DashboardMetrics } from "../hooks/useDashboardData"
import type { BodyFatEntry, Report, CalculationResult } from "@/types"

interface OverviewTabProps {
  metrics: DashboardMetrics
  programEntries: BodyFatEntry[]
  reports: Report[]
  currentCalculation: CalculationResult | null
  reportGenerationStatus: string | null
  reportGenerationEntryDate: string | null
}

export function OverviewTab({
  metrics,
  programEntries,
  reports,
  currentCalculation,
  reportGenerationStatus,
  reportGenerationEntryDate,
}: OverviewTabProps) {
  return (
    <div className="space-y-4" role="tabpanel" aria-labelledby="overview-tab">
      <MetricsCards metrics={metrics} currentCalculation={currentCalculation} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Weekly Progress Trend</CardTitle>
            <CardDescription>
              Visual overview of your recent progress with AI predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressTrendChart
              entries={programEntries.slice(0, 8)}
              progression={currentCalculation?.progression?.slice(0, 6)}
              title=""
              description=""
            />
          </CardContent>
        </Card>

        <ProgressSummary
          metrics={metrics}
          programEntries={programEntries}
          reports={reports}
          currentCalculation={currentCalculation}
          reportGenerationStatus={reportGenerationStatus}
          reportGenerationEntryDate={reportGenerationEntryDate}
        />
      </div>

      {/* AI Insights Panel on Overview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AIInsightsPanel
            title="AI Insights & Guidance"
            showHeader={true}
            maxInsights={4}
            categories={['progress', 'nutrition', 'goal']}
          />
        </div>
        <div className="lg:col-span-1">
          <AIChatWidget defaultExpanded={false} maxHeight="350px" />
        </div>
      </div>
    </div>
  )
}
