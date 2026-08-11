"use client"

import * as React from "react"
import { Line, XAxis, YAxis, CartesianGrid, Area, ComposedChart, ReferenceLine } from "recharts"
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BodyFatEntry, WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"
import { useMountedRef } from "@/hooks/use-mounted-ref"
import {
  buildProgressTrendChartData,
  buildGoalProjectionPoints,
  type ComparisonPeriod,
  type GoalProjectionResult,
} from "./progress-trend-chart.utils"

interface ProgressTrendChartProps {
  entries: BodyFatEntry[]
  progression?: WeeklyProgression[]
  title?: string
  description?: string
  showBodyFat?: boolean
  showWeight?: boolean
  showProjection?: boolean
  showComparisonToggle?: boolean
  goalWeight?: number
  endDate?: string | null
}

const chartConfig = {
  weightActual: {
    label: "Weight (Actual)",
    color: "var(--chart-1)",
  },
  weightPredicted: {
    label: "Weight (Predicted)",
    color: "color-mix(in oklch, var(--chart-1) 55%, transparent)",
  },
  bodyFatActual: {
    label: "Body Fat (Actual)",
    color: "var(--chart-2)",
  },
  bodyFatPredicted: {
    label: "Body Fat (Predicted)",
    color: "color-mix(in oklch, var(--chart-2) 55%, transparent)",
  },
  weightProjection: {
    label: "Goal Projection",
    color: "hsl(210 100% 60%)",
  },
  weightProjectionBand: {
    label: "Confidence Band",
    color: "hsl(210 100% 70% / 0.15)",
  },
  weightComparison: {
    label: "Weight (Comparison)",
    color: "color-mix(in oklch, var(--chart-1) 30%, transparent)",
  },
  bodyFatComparison: {
    label: "Body Fat (Comparison)",
    color: "color-mix(in oklch, var(--chart-2) 30%, transparent)",
  },
} satisfies ChartConfig

export function ProgressTrendChart({
  entries,
  progression,
  title = "Weight & Body Fat Trends",
  showBodyFat = true,
  showWeight = true,
  showProjection = false,
  showComparisonToggle = false,
  goalWeight,
  endDate,
  description = "Track your progress over time with AI predictions"
}: ProgressTrendChartProps) {
  const { state, subscribeToDataChanges } = useApp()
  const { current_user } = state
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [comparisonPeriod, setComparisonPeriod] = React.useState<ComparisonPeriod>("none")
  const mountedRef = useMountedRef()

  // Resolve goal weight from props or user data
  const resolvedGoalWeight = goalWeight ?? (showProjection ? current_user?.goal_weight : undefined)
  const resolvedEndDate = endDate ?? (showProjection ? current_user?.end_date : undefined)

  const handleDataChange = useSafeAnimationCallback(() => {
    if (mountedRef.current) {
      setRefreshKey(prev => prev + 1)
    }
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])

  const chartData = React.useMemo(
    () =>
      buildProgressTrendChartData(
        entries,
        progression,
        12,
        comparisonPeriod,
        showProjection ? resolvedGoalWeight : undefined,
        showProjection ? resolvedEndDate : undefined
      ),
    [entries, progression, refreshKey, comparisonPeriod, showProjection, resolvedGoalWeight, resolvedEndDate]
  )

  // Get projection metadata for warning badge
  const projectionResult = React.useMemo((): GoalProjectionResult | null => {
    if (!showProjection || !resolvedGoalWeight || entries.length < 2) return null
    const { result } = buildGoalProjectionPoints(entries, resolvedGoalWeight, resolvedEndDate)
    return result
  }, [showProjection, resolvedGoalWeight, resolvedEndDate, entries, refreshKey])

  const sortedActualEntries = React.useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    [entries]
  )

  const weightTrend = React.useMemo(() => {
    if (sortedActualEntries.length < 2) return null
    const first = sortedActualEntries[0].weight
    const last = sortedActualEntries[sortedActualEntries.length - 1].weight
    return last < first ? "down" : "up"
  }, [sortedActualEntries])

  const bodyFatTrend = React.useMemo(() => {
    const withBF = sortedActualEntries.filter(
      entry => typeof entry.body_fat_percentage === "number"
    )
    if (withBF.length < 2) return null
    const first = withBF[0].body_fat_percentage!
    const last = withBF[withBF.length - 1].body_fat_percentage!
    return last < first ? "down" : "up"
  }, [sortedActualEntries])

  const hasWeightPredicted = React.useMemo(
    () => chartData.some(point => point.weightPredicted !== null),
    [chartData]
  )

  const hasBodyFatPredicted = React.useMemo(
    () => chartData.some(point => point.bodyFatPredicted !== null),
    [chartData]
  )

  const hasProjection = React.useMemo(
    () => chartData.some(point => point.weightProjection !== null),
    [chartData]
  )

  const hasComparison = React.useMemo(
    () => chartData.some(point => point.weightComparison !== null),
    [chartData]
  )

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Add your first entry to see trends</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Trend overlay toggle (FR-012b) */}
            {showComparisonToggle && (
              <Select
                value={comparisonPeriod}
                onValueChange={(value) => setComparisonPeriod(value as ComparisonPeriod)}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Compare to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Comparison</SelectItem>
                  <SelectItem value="lastWeek">vs. Last Week</SelectItem>
                  <SelectItem value="lastMonth">vs. Last Month</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Projection exceeds target warning (FR-012c) */}
            {projectionResult?.exceedsEndDate && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Projection exceeds target date
              </Badge>
            )}

            {weightTrend && (
              <Badge variant={weightTrend === 'down' ? 'default' : 'secondary'}>
                {weightTrend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                Weight {weightTrend === 'down' ? 'Loss' : 'Gain'}
              </Badge>
            )}
            {bodyFatTrend && (
              <Badge variant={bodyFatTrend === 'down' ? 'default' : 'secondary'}>
                {bodyFatTrend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                BF {bodyFatTrend === 'down' ? 'Loss' : 'Gain'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              yAxisId="weight"
              hide={!showWeight}
              orientation="left"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              yAxisId="bodyFat"
              hide={!showBodyFat}
              orientation="right"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />

            {/* Goal weight reference line (FR-012c) */}
            {showProjection && resolvedGoalWeight && showWeight && (
              <ReferenceLine
                yAxisId="weight"
                y={resolvedGoalWeight}
                stroke="hsl(142 76% 36%)"
                strokeDasharray="8 4"
                strokeWidth={1}
                label={{
                  value: `Goal: ${resolvedGoalWeight} lbs`,
                  position: "insideTopRight",
                  className: "text-xs fill-green-600",
                }}
              />
            )}

            {/* Confidence band upper bound (FR-012c) */}
            {hasProjection && showWeight && (
              <Area
                yAxisId="weight"
                dataKey="weightProjectionUpper"
                stroke="none"
                fill="hsl(210 100% 70% / 0.12)"
                isAnimationActive={false}
                name="weightProjectionBand"
                dot={false}
                activeDot={false}
                connectNulls={false}
              />
            )}

            {/* Goal projection dashed line (FR-012c) */}
            {hasProjection && showWeight && (
              <Line
                yAxisId="weight"
                dataKey="weightProjection"
                type="monotone"
                stroke="hsl(210 100% 60%)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                name="weightProjection"
                connectNulls={false}
              />
            )}

            {/* Trend comparison overlay lines (FR-012b) */}
            {hasComparison && showWeight && (
              <Line
                yAxisId="weight"
                dataKey="weightComparison"
                type="monotone"
                stroke="var(--color-weightComparison)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                name="weightComparison"
                connectNulls={false}
              />
            )}
            {hasComparison && showBodyFat && (
              <Line
                yAxisId="bodyFat"
                dataKey="bodyFatComparison"
                type="monotone"
                stroke="var(--color-bodyFatComparison)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                name="bodyFatComparison"
                connectNulls={false}
              />
            )}

            {/* Primary actual data lines */}
            {showWeight && (
              <>
                <Line
                  yAxisId="weight"
                  dataKey="weightActual"
                  type="monotone"
                  stroke="var(--color-weightActual)"
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-weightActual)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  isAnimationActive={false}
                  name="weightActual"
                />
                {hasWeightPredicted && (
                  <Line
                    yAxisId="weight"
                    dataKey="weightPredicted"
                    type="monotone"
                    stroke="var(--color-weightPredicted)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                    name="weightPredicted"
                  />
                )}
              </>
            )}
            {showBodyFat && (
              <>
                <Line
                  yAxisId="bodyFat"
                  dataKey="bodyFatActual"
                  type="monotone"
                  stroke="var(--color-bodyFatActual)"
                  strokeWidth={2}
                  dot={{
                    fill: "var(--color-bodyFatActual)",
                    strokeWidth: 2,
                    r: 4,
                  }}
                  isAnimationActive={false}
                  name="bodyFatActual"
                />
                {hasBodyFatPredicted && (
                  <Line
                    yAxisId="bodyFat"
                    dataKey="bodyFatPredicted"
                    type="monotone"
                    stroke="var(--color-bodyFatPredicted)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                    name="bodyFatPredicted"
                  />
                )}
              </>
            )}
          </ComposedChart>
        </ChartContainer>

        {/* Projection estimated date (FR-012c) */}
        {projectionResult?.projectedDate && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>
              Projected goal date:{" "}
              <span className="font-medium text-foreground">
                {projectionResult.projectedDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
            {projectionResult.daysToGoal != null && (
              <span>({projectionResult.daysToGoal} days)</span>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
          {showWeight && (
            <>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-0.5 rounded"
                  style={{ background: "var(--chart-1)" }}
                ></div>
                <span>Weight (actual)</span>
              </div>
              {hasWeightPredicted && (
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-0.5 rounded border-t border-dashed"
                    style={{ borderColor: "var(--chart-1)" }}
                  ></div>
                  <span>Weight (predicted)</span>
                </div>
              )}
            </>
          )}
          {showBodyFat && (
            <>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-0.5 rounded"
                  style={{ background: "var(--chart-2)" }}
                ></div>
                <span>Body fat % (actual)</span>
              </div>
              {hasBodyFatPredicted && (
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-0.5 rounded border-t border-dashed"
                    style={{ borderColor: "var(--chart-2)" }}
                  ></div>
                  <span>Body fat % (predicted)</span>
                </div>
              )}
            </>
          )}
          {hasProjection && (
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-0.5 rounded border-t border-dashed"
                style={{ borderColor: "hsl(210 100% 60%)" }}
              ></div>
              <span>Goal projection</span>
            </div>
          )}
          {hasComparison && (
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-0.5 rounded border-t border-dashed"
                style={{ borderColor: "color-mix(in oklch, var(--chart-1) 30%, transparent)" }}
              ></div>
              <span>Comparison period</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
