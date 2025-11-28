"use client"

import * as React from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { BodyFatEntry, WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"
import { useMountedRef } from "@/hooks/use-mounted-ref"
import { buildProgressTrendChartData } from "./progress-trend-chart.utils"

interface ProgressTrendChartProps {
  entries: BodyFatEntry[]
  progression?: WeeklyProgression[]
  title?: string
  description?: string
  showBodyFat?: boolean
  showWeight?: boolean
}

const chartConfig = {
  weightActual: {
    label: "Weight (Actual)",
    color: "hsl(var(--chart-1))",
  },
  weightPredicted: {
    label: "Weight (Predicted)",
    color: "hsl(var(--chart-1) / 0.55)",
  },
  bodyFatActual: {
    label: "Body Fat (Actual)",
    color: "hsl(var(--chart-2))",
  },
  bodyFatPredicted: {
    label: "Body Fat (Predicted)",
    color: "hsl(var(--chart-2) / 0.55)",
  },
} satisfies ChartConfig

export function ProgressTrendChart({
  entries,
  progression,
  title = "Weight & Body Fat Trends",
  showBodyFat = true,
  showWeight = true,
  description = "Track your progress over time with AI predictions"
}: ProgressTrendChartProps) {
  const { subscribeToDataChanges } = useApp()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const mountedRef = useMountedRef()

  // Use safe animation callback for data updates with mounted guard
  const handleDataChange = useSafeAnimationCallback(() => {
    if (mountedRef.current) {
      setRefreshKey(prev => prev + 1)
    }
  }, [])

  // Subscribe to data changes for automatic refresh
  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])
  const chartData = React.useMemo(
    () => buildProgressTrendChartData(entries, progression),
    [entries, progression, refreshKey]
  )

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
    const actualEntriesWithBodyFat = sortedActualEntries.filter(
      entry => typeof entry.body_fat_percentage === "number"
    )

    if (actualEntriesWithBodyFat.length < 2) return null

    const first = actualEntriesWithBodyFat[0].body_fat_percentage!
    const last =
      actualEntriesWithBodyFat[actualEntriesWithBodyFat.length - 1]
        .body_fat_percentage!
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex space-x-2">
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
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
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
          </LineChart>
        </ChartContainer>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
          {showWeight && (
            <>
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-0.5 rounded"
                  style={{ background: "hsl(var(--chart-1))" }}
                ></div>
                <span>Weight (actual)</span>
              </div>
              {hasWeightPredicted && (
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-0.5 rounded border-t border-dashed"
                    style={{ borderColor: "hsl(var(--chart-1))" }}
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
                  style={{ background: "hsl(var(--chart-2))" }}
                ></div>
                <span>Body fat % (actual)</span>
              </div>
              {hasBodyFatPredicted && (
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-0.5 rounded border-t border-dashed"
                    style={{ borderColor: "hsl(var(--chart-2))" }}
                  ></div>
                  <span>Body fat % (predicted)</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
