"use client"

import * as React from "react"
import { Activity, Flame, Zap, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"
import { useMountedRef } from "@/hooks/use-mounted-ref"

interface MetabolicInsightsWidgetProps {
  progression?: WeeklyProgression[]
  title?: string
  description?: string
}

const chartConfig = {
  rmr: {
    label: "RMR",
    color: "var(--chart-1)",
  },
  tef: {
    label: "TEF",
    color: "var(--chart-2)",
  },
  neat: {
    label: "NEAT",
    color: "var(--chart-3)",
  },
  exercise: {
    label: "Exercise",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
]

export function MetabolicInsightsWidget({
  progression,
  title = "Metabolic Insights",
  description = "Understanding your energy expenditure"
}: MetabolicInsightsWidgetProps) {
  const { subscribeToDataChanges, refreshKey } = useApp()
  const mountedRef = useMountedRef()

  const handleDataChange = React.useCallback(() => {
    // Data refresh handled by parent or context
  }, [])

  // Subscribe to data changes for automatic refresh
  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])

  const currentWeek = progression?.[0]

  const metabolicBreakdown = React.useMemo(() => {
    if (!currentWeek) return []

    const exercise = currentWeek.tdee - currentWeek.rmr - currentWeek.tef - currentWeek.neat

    return [
      {
        name: "RMR (Resting)",
        value: currentWeek.rmr,
        percentage: (currentWeek.rmr / currentWeek.tdee) * 100,
        description: "Base metabolic rate"
      },
      {
        name: "TEF (Digestion)",
        value: currentWeek.tef,
        percentage: (currentWeek.tef / currentWeek.tdee) * 100,
        description: "Thermic effect of food"
      },
      {
        name: "NEAT (Activity)",
        value: currentWeek.neat,
        percentage: (currentWeek.neat / currentWeek.tdee) * 100,
        description: "Non-exercise activity"
      },
      {
        name: "Exercise",
        value: Math.max(0, exercise),
        percentage: Math.max(0, (exercise / currentWeek.tdee) * 100),
        description: "Planned exercise"
      }
    ]
  }, [currentWeek, refreshKey])

  const weeklyTrend = React.useMemo(() => {
    if (!progression) return []

    return progression.slice(0, 7).reverse().map((week, index) => ({
      week: `W${index + 1}`,
      rmr: week.rmr,
      tdee: week.tdee,
      deficit: week.tdee - week.daily_calorie_intake,
    }))
  }, [progression, refreshKey])

  const metabolicRate = React.useMemo(() => {
    if (!currentWeek) return "Normal"

    // Simple heuristic for metabolic rate assessment
    const rmrPerKg = currentWeek.rmr / (currentWeek.weight * 0.453592) // Convert lbs to kg

    if (rmrPerKg < 20) return "Low"
    if (rmrPerKg > 25) return "High"
    return "Normal"
  }, [currentWeek, refreshKey])

  if (!mountedRef.current) return null

  if (!progression || !currentWeek) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No metabolic data available</p>
            <p className="text-sm">Complete your profile to see metabolic insights</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Metabolic Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Badge variant={metabolicRate === "Normal" ? "default" : "secondary"}>
              <Flame className="h-3 w-3 mr-1" />
              {metabolicRate} Metabolic Rate
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex flex-col space-y-2 min-w-0">
              <h4 className="text-sm font-medium">Energy Expenditure Breakdown</h4>
              {/* Use a plain div with explicit height — ChartContainer's built-in
                  aspect-video + flex causes the pie to overflow its grid column
                  and overlay the adjacent breakdown details. */}
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metabolicBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {metabolicBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-background border rounded-lg p-3 shadow-lg">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm text-muted-foreground">{data.description}</p>
                              <p className="font-bold text-lg">{Math.round(data.value)} cal</p>
                              <p className="text-sm">{data.percentage.toFixed(1)}% of TDEE</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Breakdown Details */}
            <div className="space-y-4 min-w-0">
              <h4 className="text-sm font-medium">Daily Energy Components</h4>
              <div className="space-y-3">
                {metabolicBreakdown.map((component, index) => (
                  <div key={component.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span>{component.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{Math.round(component.value)} cal</span>
                        <span className="text-muted-foreground ml-2">
                          ({component.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={component.percentage} className="h-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total TDEE</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(currentWeek.tdee)}
            </div>
            <p className="text-xs text-muted-foreground">
              Calories burned daily
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resting Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(currentWeek.rmr)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((currentWeek.rmr / currentWeek.tdee) * 100).toFixed(0)}% of TDEE
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity Burn</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(currentWeek.neat + (currentWeek.tdee - currentWeek.rmr - currentWeek.tef - currentWeek.neat))}
            </div>
            <p className="text-xs text-muted-foreground">
              NEAT + Exercise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[40px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend}>
                  <Bar dataKey="tdee" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
