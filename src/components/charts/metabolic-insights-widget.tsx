"use client"

import * as React from "react"
import { Activity, Flame, Zap, TrendingUp } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"

interface MetabolicInsightsWidgetProps {
  progression?: WeeklyProgression[]
  title?: string
  description?: string
}

const chartConfig = {
  rmr: {
    label: "RMR",
    color: "hsl(var(--chart-1))",
  },
  tef: {
    label: "TEF",
    color: "hsl(var(--chart-2))",
  },
  neat: {
    label: "NEAT",
    color: "hsl(var(--chart-3))",
  },
  exercise: {
    label: "Exercise",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
]

export function MetabolicInsightsWidget({ 
  progression,
  title = "Metabolic Insights",
  description = "Understanding your energy expenditure breakdown"
}: MetabolicInsightsWidgetProps) {
  const { subscribeToDataChanges } = useApp()
  const [refreshKey, setRefreshKey] = React.useState(0)
  const isUpdatingRef = React.useRef(false)
  const isMountedRef = React.useRef(true)

  // Component cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Memoized callback to prevent subscription recreation
  const handleDataChange = React.useCallback(() => {
    // Prevent multiple rapid updates and check if component is still mounted
    if (!isUpdatingRef.current && isMountedRef.current) {
      isUpdatingRef.current = true
      setRefreshKey(prev => prev + 1)
      // Reset the flag after a short delay with mounted check
      setTimeout(() => {
        if (isMountedRef.current) {
          isUpdatingRef.current = false
        }
      }, 100)
    }
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
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Energy Expenditure Breakdown</h4>
              <ChartContainer config={chartConfig} className="h-64">
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
              </ChartContainer>
            </div>

            {/* Breakdown Details */}
            <div className="space-y-4">
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
              {Math.round(currentWeek.neat + Math.max(0, currentWeek.tdee - currentWeek.rmr - currentWeek.tef - currentWeek.neat))}
            </div>
            <p className="text-xs text-muted-foreground">
              NEAT + Exercise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Food Effect</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(currentWeek.tef)}
            </div>
            <p className="text-xs text-muted-foreground">
              Digestion calories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend */}
      {weeklyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Metabolic Trend</CardTitle>
            <CardDescription>
              Track changes in your metabolic rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart
                data={weeklyTrend}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="rmr"
                  fill="var(--color-rmr)"
                  isAnimationActive={false}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="tdee"
                  fill="var(--color-tef)"
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}