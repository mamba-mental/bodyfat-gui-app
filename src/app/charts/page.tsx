"use client"

import * as React from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, Target, Activity, BarChart3, AlertCircle } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import { useApp } from "@/contexts/app-context"
import { calculateProgressPercentage } from "@/lib/calculations"
import { ProgressTrendChart } from "@/components/charts/progress-trend-chart"
import { GoalProgressWidget } from "@/components/charts/goal-progress-widget"
import { MetabolicInsightsWidget } from "@/components/charts/metabolic-insights-widget"
import { CalorieManagementWidget } from "@/components/charts/calorie-management-widget"
import { BeforeAfterComparison } from "@/components/charts/before-after-comparison"
import { PhotoTimeline } from "@/components/charts/photo-timeline"
import { ChartErrorBoundary } from "@/components/error-boundary-chart"
import { useCycles } from "@/hooks/use-cycles"

export default function ChartsPage() {
  const { state } = useApp()
  const { current_user, current_calculation, entries } = state
  const { active: activeCycle } = useCycles()

  const [timeRange, setTimeRange] = useState<"all" | "3months" | "6months" | "1year" | "cycle">("cycle")

  const filteredEntries = React.useMemo(() => {
    if (timeRange === "all") return entries

    if (timeRange === "cycle") {
      if (!activeCycle) return entries
      return entries.filter((entry) => (entry as any).cycle_id === activeCycle.id)
    }

    const now = new Date()
    const cutoffDate = new Date(now)

    switch (timeRange) {
      case "3months":
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case "6months":
        cutoffDate.setMonth(now.getMonth() - 6)
        break
      case "1year":
        cutoffDate.setFullYear(now.getFullYear() - 1)
        break
    }

    return entries.filter(entry => new Date(entry.date) >= cutoffDate)
  }, [entries, timeRange, activeCycle])

  const getProgressStats = () => {
    if (!current_user || entries.length === 0) return null

    const latestEntry = entries[0]
    const oldestEntry = filteredEntries[filteredEntries.length - 1] || entries[entries.length - 1]

    const weightChange = latestEntry.weight - oldestEntry.weight
    const bfChange = (latestEntry.body_fat_percentage || 0) - (oldestEntry.body_fat_percentage || 0)

    const weightProgress = calculateProgressPercentage(
      current_user.current_weight,
      latestEntry.weight,
      current_user.goal_weight
    )

    const bfProgress = calculateProgressPercentage(
      current_user.current_bf,
      latestEntry.body_fat_percentage || current_user.current_bf,
      current_user.goal_bf
    )

    return {
      weightChange,
      bfChange,
      weightProgress: Math.max(0, weightProgress),
      bfProgress: Math.max(0, bfProgress),
      daysTracking: Math.floor((new Date(latestEntry.date).getTime() - new Date(oldestEntry.date).getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  const stats = getProgressStats()

  if (!current_user) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Progress Charts</h1>
          <p className="text-muted-foreground">
            Visual tracking of your body composition progress over time
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please complete your profile setup to view progress charts.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Progress Charts</h1>
          <p className="text-muted-foreground">
            Visual tracking of your body composition progress over time
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClientIcon icon={BarChart3} className="h-5 w-5" />
              No Data to Display
            </CardTitle>
            <CardDescription>
              Start tracking your progress to see charts and visualizations
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You need at least one entry to generate progress charts.
            </p>
            <Button variant="default" onClick={() => window.location.href = '/entries/new'}>
              Add Your First Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Progress Charts</h1>
          <p className="text-muted-foreground">
            Visual tracking of your body composition progress over time
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cycle">
                {activeCycle ? activeCycle.name : "This Cycle"}
              </SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weight Change</CardTitle>
              <ClientIcon icon={stats.weightChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.weightChange >= 0 ? '+' : ''}{stats.weightChange.toFixed(1)} lbs
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(stats.weightChange / (stats.daysTracking || 1) * 7).toFixed(1)} lbs/week average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Body Fat Change</CardTitle>
              <ClientIcon icon={stats.bfChange < 0 ? TrendingDown : TrendingUp} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.bfChange >= 0 ? '+' : ''}{stats.bfChange.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(stats.bfChange / (stats.daysTracking || 1) * 7).toFixed(2)}%/week average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Goal Progress</CardTitle>
              <ClientIcon icon={Target} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((stats.weightProgress + stats.bfProgress) / 2).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Average across both goals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracking Days</CardTitle>
              <ClientIcon icon={Activity} className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.daysTracking}
              </div>
              <p className="text-xs text-muted-foreground">
                {(stats.daysTracking / 7).toFixed(1)} weeks of data
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="weight">Weight Tracking</TabsTrigger>
          <TabsTrigger value="composition">Body Composition</TabsTrigger>
          <TabsTrigger value="goals">Goal Progress</TabsTrigger>
          <TabsTrigger value="metabolic">Metabolic Insights</TabsTrigger>
        </TabsList>

        {/* Overview tab: existing chart + goal projection + trend overlay toggle */}
        <TabsContent value="overview" className="space-y-4">
          <ChartErrorBoundary title="Overall Progress Trend">
            <ProgressTrendChart
              entries={filteredEntries}
              progression={current_calculation?.progression}
              title="Overall Progress Trend"
              description="Weight and body fat progress with AI predictions and goal projection"
              showProjection={true}
              showComparisonToggle={true}
            />
          </ChartErrorBoundary>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartErrorBoundary title="Goal Progress">
              <GoalProgressWidget
                user={current_user}
                entries={filteredEntries}
                progression={current_calculation?.progression}
              />
            </ChartErrorBoundary>
            {current_calculation && (
              <ChartErrorBoundary title="Metabolic Insights">
                <MetabolicInsightsWidget
                  progression={current_calculation.progression}
                />
              </ChartErrorBoundary>
            )}
          </div>
        </TabsContent>

        {/* Comparison tab: Before/After widget (FR-012a) */}
        <TabsContent value="comparison" className="space-y-4">
          <ChartErrorBoundary title="Before / After Comparison">
            <BeforeAfterComparison />
          </ChartErrorBoundary>
        </TabsContent>

        {/* Photos tab: Photo timeline (FR-012d) */}
        <TabsContent value="photos" className="space-y-4">
          <ChartErrorBoundary title="Photo Progress Timeline">
            <PhotoTimeline />
          </ChartErrorBoundary>
        </TabsContent>

        <TabsContent value="weight" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weight Progress Details</CardTitle>
              <CardDescription>Detailed view of your weight loss journey</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressTrendChart
                entries={filteredEntries}
                progression={current_calculation?.progression}
                title=""
                description=""
                showBodyFat={false}
                showProjection={true}
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weight Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Starting Weight:</span>
                    <span className="font-medium">{current_user.current_weight.toFixed(1)} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Current Weight:</span>
                    <span className="font-medium">{entries[0].weight.toFixed(1)} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Goal Weight:</span>
                    <span className="font-medium">{current_user.goal_weight.toFixed(1)} lbs</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm">Total Change:</span>
                    <span className={`font-medium ${stats?.weightChange && stats.weightChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats?.weightChange && stats.weightChange >= 0 ? '+' : ''}{stats?.weightChange.toFixed(1)} lbs
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Remaining:</span>
                    <span className="font-medium">
                      {Math.abs(entries[0].weight - current_user.goal_weight).toFixed(1)} lbs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Trends</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEntries.length >= 2 ? (
                  <div className="space-y-4">
                    {filteredEntries.slice(0, 5).map((entry, index) => {
                      const prevEntry = filteredEntries[index + 1]
                      const change = prevEntry ? entry.weight - prevEntry.weight : 0

                      return (
                        <div key={entry.id} className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {entry.weight.toFixed(1)} lbs
                            </div>
                          </div>
                          {prevEntry && (
                            <Badge variant={change < 0 ? "default" : "secondary"}>
                              {change >= 0 ? '+' : ''}{change.toFixed(1)} lbs
                            </Badge>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Add more entries to see trends
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="composition" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Body Composition Trends</CardTitle>
              <CardDescription>Track changes in body fat percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressTrendChart
                entries={filteredEntries.filter(e => e.body_fat_percentage)}
                progression={current_calculation?.progression}
                title=""
                description=""
                showWeight={false}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <GoalProgressWidget
            user={current_user}
            entries={filteredEntries}
            progression={current_calculation?.progression}
          />
        </TabsContent>

        <TabsContent value="metabolic" className="space-y-4">
          {current_calculation ? (
            <div className="space-y-4">
              <MetabolicInsightsWidget
                progression={current_calculation.progression}
              />

              <CalorieManagementWidget
                progression={current_calculation.progression}
                currentCalories={current_calculation.progression && current_calculation.progression.length > 0 ? current_calculation.progression[0].daily_calorie_intake : 0}
              />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Metabolic Insights</CardTitle>
                <CardDescription>Generate a PRIME calculation to see metabolic data</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Complete a PRIME calculation on the dashboard to view detailed metabolic insights.
                </p>
                <Button variant="secondary" onClick={() => window.location.href = '/'}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
