"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell, LabelList } from "recharts"
import { ArrowDown, ArrowUp, Scale } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"
import { useMountedRef } from "@/hooks/use-mounted-ref"

const chartConfig = {
  starting: {
    label: "Starting",
    color: "color-mix(in oklch, var(--muted-foreground) 40%, transparent)",
  },
  current: {
    label: "Current",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface ComparisonDataPoint {
  metric: string
  starting: number
  current: number
  delta: number
  deltaLabel: string
  unit: string
}

export function BeforeAfterComparison() {
  const { state, subscribeToDataChanges } = useApp()
  const { current_user, entries } = state
  const [refreshKey, setRefreshKey] = React.useState(0)
  const mountedRef = useMountedRef()

  const handleDataChange = useSafeAnimationCallback(() => {
    if (mountedRef.current) {
      setRefreshKey(prev => prev + 1)
    }
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])

  const comparisonData = React.useMemo((): ComparisonDataPoint[] => {
    if (!current_user || entries.length === 0) return []

    // Determine starting values from program_reference or first entry
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const firstEntry = sortedEntries[0]
    const latestEntry = sortedEntries[sortedEntries.length - 1]

    const programRef = current_user.program_reference
    const startingWeight = programRef?.initial_weight ?? firstEntry.weight
    const startingBF = programRef?.initial_bf ?? firstEntry.body_fat_percentage ?? current_user.current_bf

    const currentWeight = latestEntry.weight
    const currentBF = latestEntry.body_fat_percentage ?? current_user.current_bf

    const weightDelta = currentWeight - startingWeight
    const bfDelta = currentBF - startingBF

    const data: ComparisonDataPoint[] = [
      {
        metric: "Weight (lbs)",
        starting: startingWeight,
        current: currentWeight,
        delta: weightDelta,
        deltaLabel: `${weightDelta >= 0 ? "+" : ""}${weightDelta.toFixed(1)} lbs`,
        unit: "lbs",
      },
    ]

    // Only add BF comparison if we have meaningful body fat data
    if (startingBF > 0 && currentBF > 0) {
      data.push({
        metric: "Body Fat (%)",
        starting: startingBF,
        current: currentBF,
        delta: bfDelta,
        deltaLabel: `${bfDelta >= 0 ? "+" : ""}${bfDelta.toFixed(1)}%`,
        unit: "%",
      })
    }

    return data
  }, [current_user, entries, refreshKey])

  if (!current_user || entries.length === 0 || comparisonData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Before / After Comparison</CardTitle>
          <CardDescription>Compare your starting stats with your current progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Scale className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No comparison data</p>
            <p className="text-sm">Add entries to see your before and after</p>
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
            <CardTitle>Before / After Comparison</CardTitle>
            <CardDescription>Starting stats vs. current progress</CardDescription>
          </div>
          <div className="flex gap-2">
            {comparisonData.map((item) => (
              <Badge
                key={item.metric}
                variant={item.delta <= 0 ? "default" : "secondary"}
              >
                {item.delta <= 0 ? (
                  <ArrowDown className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowUp className="h-3 w-3 mr-1" />
                )}
                {item.deltaLabel}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px]">
          <BarChart
            accessibilityLayer
            data={comparisonData}
            layout="vertical"
            margin={{ left: 20, right: 60, top: 12, bottom: 12 }}
            barCategoryGap="30%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              horizontal={false}
            />
            <XAxis type="number" tickLine={false} axisLine={false} className="text-xs" />
            <YAxis
              type="category"
              dataKey="metric"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              width={100}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="starting"
              fill="var(--color-starting)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              name="starting"
            >
              <LabelList
                dataKey="starting"
                position="right"
                formatter={(value: unknown) => typeof value === "number" ? value.toFixed(1) : String(value ?? "")}
                className="text-xs fill-muted-foreground"
              />
            </Bar>
            <Bar
              dataKey="current"
              fill="var(--color-current)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              name="current"
            >
              <LabelList
                dataKey="current"
                position="right"
                formatter={(value: unknown) => typeof value === "number" ? value.toFixed(1) : String(value ?? "")}
                className="text-xs fill-foreground font-medium"
              />
            </Bar>
          </BarChart>
        </ChartContainer>

        {/* Delta summary cards */}
        <div className="grid gap-4 mt-4" style={{ gridTemplateColumns: `repeat(${comparisonData.length}, 1fr)` }}>
          {comparisonData.map((item) => (
            <div
              key={item.metric}
              className="flex flex-col items-center p-3 rounded-lg border bg-muted/30"
            >
              <span className="text-xs text-muted-foreground mb-1">{item.metric}</span>
              <span
                className={`text-xl font-bold ${
                  item.delta <= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {item.deltaLabel}
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                {item.starting.toFixed(1)} &rarr; {item.current.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: "color-mix(in oklch, var(--muted-foreground) 40%, transparent)" }}
            />
            <span>Starting</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: "var(--chart-1)" }}
            />
            <span>Current</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
