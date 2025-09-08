"use client"

import * as React from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { BodyFatEntry, WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"

interface ProgressTrendChartProps {
  entries: BodyFatEntry[]
  progression?: WeeklyProgression[]
  title?: string
  description?: string
  showBodyFat?: boolean
  showWeight?: boolean
}

const chartConfig = {
  weight: {
    label: "Weight (lbs)",
    color: "hsl(var(--chart-1))",
  },
  bodyFat: {
    label: "Body Fat (%)",
    color: "hsl(var(--chart-2))",
  },
  predicted: {
    label: "Predicted",
    color: "hsl(var(--muted-foreground))",
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
  const isUpdatingRef = React.useRef(false)

  // Subscribe to data changes for automatic refresh
  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(() => {
      // Prevent multiple rapid updates
      if (!isUpdatingRef.current) {
        isUpdatingRef.current = true
        setRefreshKey(prev => prev + 1)
        // Reset the flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false
        }, 100)
      }
    })
    
    return unsubscribe
  }, [subscribeToDataChanges])
  const chartData = React.useMemo(() => {
    // Combine actual entries with predicted progression
    const actualData = entries
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: entry.date,
        weight: entry.weight,
        bodyFat: entry.body_fat_percentage,
        type: 'actual' as const,
      }))

    // Add predicted data if available
    const predictedData = progression
      ?.slice(0, 12) // Show next 12 weeks
      .map(week => ({
        date: new Date(week.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: week.date,
        weight: week.weight,
        bodyFat: week.body_fat_percentage,
        type: 'predicted' as const,
      })) || []

    return [...actualData, ...predictedData]
  }, [entries, progression, refreshKey])

  const weightTrend = React.useMemo(() => {
    if (chartData.length < 2) return null
    const actualEntries = chartData.filter(d => d.type === 'actual')
    if (actualEntries.length < 2) return null
    
    const first = actualEntries[0].weight
    const last = actualEntries[actualEntries.length - 1].weight
    return last < first ? 'down' : 'up'
  }, [chartData])

  const bodyFatTrend = React.useMemo(() => {
    if (chartData.length < 2) return null
    const actualEntries = chartData.filter(d => d.type === 'actual' && d.bodyFat)
    if (actualEntries.length < 2) return null
    
    const first = actualEntries[0].bodyFat!
    const last = actualEntries[actualEntries.length - 1].bodyFat!
    return last < first ? 'down' : 'up'
  }, [chartData])

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
              orientation="left"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <YAxis
              yAxisId="bodyFat"
              orientation="right"
              tickLine={false}
              axisLine={false}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              yAxisId="weight"
              dataKey="weight"
              type="monotone"
              stroke="var(--color-weight)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-weight)",
                strokeWidth: 2,
                r: 4,
              }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="bodyFat"
              dataKey="bodyFat"
              type="monotone"
              stroke="var(--color-bodyFat)"
              strokeWidth={2}
              dot={{
                fill: "var(--color-bodyFat)",
                strokeWidth: 2,
                r: 4,
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
        <div className="flex items-center justify-center space-x-6 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-chart-1 rounded"></div>
            <span>Weight (left axis)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-chart-2 rounded"></div>
            <span>Body Fat % (right axis)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-muted-foreground rounded" style={{ borderTop: '1px dashed' }}></div>
            <span>Predicted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}