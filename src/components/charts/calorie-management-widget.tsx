"use client"

import * as React from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Target, TrendingUp, TrendingDown, Zap } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { WeeklyProgression, UserData } from "@/types"
import { useApp } from "@/contexts/app-context"
import { useSafeAnimationCallback } from "@/hooks/use-safe-animation-callback"

interface CalorieManagementWidgetProps {
  progression?: WeeklyProgression[]
  currentCalories?: number
  title?: string
  description?: string
  user?: UserData
}

const chartConfig = {
  intake: {
    label: "Daily Intake",
    color: "hsl(var(--chart-1))",
  },
  tdee: {
    label: "TDEE",
    color: "hsl(var(--chart-2))",
  },
  deficit: {
    label: "Deficit",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export function CalorieManagementWidget({
  progression,
  currentCalories = 0,
  title = "Calorie Management",
  description = "Track your caloric intake vs expenditure",
  user
}: CalorieManagementWidgetProps) {
  const { subscribeToDataChanges } = useApp()
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Use safe animation callback for data updates
  const handleDataChange = useSafeAnimationCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // Subscribe to data changes for automatic refresh
  React.useEffect(() => {
    const unsubscribe = subscribeToDataChanges(handleDataChange)
    return unsubscribe
  }, [subscribeToDataChanges, handleDataChange])
  const chartData = React.useMemo(() => {
    if (!progression) return []
    
    return progression.slice(0, 7).map((week, index) => ({
      week: `Week ${index + 1}`,
      intake: Math.round(week.daily_calorie_intake),
      tdee: Math.round(week.tdee),
      deficit: Math.round(week.tdee - week.daily_calorie_intake),
      date: week.date,
    }))
  }, [progression, refreshKey])

  const currentWeek = chartData[0]
  const avgDeficit = React.useMemo(() => {
    if (chartData.length === 0) return 0
    return chartData.reduce((sum, week) => sum + week.deficit, 0) / chartData.length
  }, [chartData])

  const weeklyWeightLoss = avgDeficit > 0 ? (avgDeficit * 7) / 3500 : 0 // 3500 cal = 1 lb

  // Calculate macronutrient recommendations based on user data
  const macros = React.useMemo(() => {
    if (!user || !currentCalories) return null
    
    const proteinCaloriesPerGram = 4
    const carbCaloriesPerGram = 4
    const fatCaloriesPerGram = 9
    
    // Base protein on user's protein intake if available, otherwise calculate
    const proteinGrams = user.protein_intake || Math.max(user.current_weight * 1.0, 140)
    const proteinCalories = proteinGrams * proteinCaloriesPerGram
    
    // Fat recommendations based on diet type
    let fatPercentage = 0.25 // Default 25%
    if (user.diet_type === 'keto') fatPercentage = 0.70
    else if (user.diet_type === 'high_protein') fatPercentage = 0.20
    else if (user.diet_type === 'balanced') fatPercentage = 0.30
    
    const fatCalories = currentCalories * fatPercentage
    const fatGrams = fatCalories / fatCaloriesPerGram
    
    // Remaining calories for carbs
    const carbCalories = Math.max(0, currentCalories - proteinCalories - fatCalories)
    const carbGrams = carbCalories / carbCaloriesPerGram
    
    return {
      protein: { grams: Math.round(proteinGrams), calories: Math.round(proteinCalories), percentage: Math.round((proteinCalories / currentCalories) * 100) },
      carbs: { grams: Math.round(carbGrams), calories: Math.round(carbCalories), percentage: Math.round((carbCalories / currentCalories) * 100) },
      fat: { grams: Math.round(fatGrams), calories: Math.round(fatCalories), percentage: Math.round((fatCalories / currentCalories) * 100) }
    }
  }, [user, currentCalories, refreshKey])

  // Nutrition recommendations based on workout type and goals
  const nutritionTips = React.useMemo(() => {
    if (!user) return []
    
    const tips = []
    
    if (user.workout_type === 'Bodybuilding') {
      tips.push({
        icon: '💪',
        title: 'Muscle Preservation',
        tip: `Your protein target of ${user.protein_intake || Math.round(user.current_weight * 1.2)}g supports muscle retention during your cut.`
      })
      tips.push({
        icon: '⏰',
        title: 'Nutrient Timing',
        tip: 'Consider consuming 25-30g protein within 2 hours post-workout for optimal recovery.'
      })
    }
    
    if (user.workout_type === 'CrossFit') {
      tips.push({
        icon: '🔥',
        title: 'Performance Carbs',
        tip: 'Time carb intake around high-intensity sessions to maintain WOD performance.'
      })
    }
    
    if (user.diet_type === 'keto') {
      tips.push({
        icon: '🥑',
        title: 'Ketosis Support',
        tip: 'Maintain <25g net carbs daily and prioritize MCT oils for sustained energy.'
      })
    }
    
    if (avgDeficit > 1000) {
      tips.push({
        icon: '⚠️',
        title: 'Aggressive Deficit',
        tip: 'Your deficit is quite large. Consider periodic refeed days to support hormonal health.'
      })
    }
    
    return tips
  }, [user, avgDeficit, refreshKey])

  if (!progression || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Target className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">No calorie data available</p>
            <p className="text-sm">Complete your profile to see calorie recommendations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge variant={avgDeficit > 0 ? "default" : "secondary"}>
                {avgDeficit > 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                {avgDeficit > 0 ? 'Deficit' : 'Surplus'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig}>
            <BarChart
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
                dataKey="week"
                tickLine={false}
                axisLine={false}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                className="text-xs"
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="intake"
                fill="var(--color-intake)"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="tdee"
                fill="var(--color-tdee)"
                radius={[2, 2, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Current Week Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Target</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentCalories ? Math.round(currentCalories) : currentWeek?.intake || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Calories per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Deficit</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgDeficit > 0 ? Math.round(avgDeficit) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Calories below TDEE
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Weekly Loss</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklyWeightLoss.toFixed(1)} lbs
            </div>
            <p className="text-xs text-muted-foreground">
              Based on current deficit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deficit Progress */}
      {currentWeek && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Week Progress</CardTitle>
            <CardDescription>
              Calorie balance for optimal fat loss
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Calorie Deficit</span>
                <span>{currentWeek.deficit} cal/day</span>
              </div>
              <Progress 
                value={Math.min(100, (currentWeek.deficit / 750) * 100)} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 cal (maintenance)</span>
                <span>750 cal (optimal)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Daily Intake</p>
                <p className="text-xl font-bold text-chart-1">{currentWeek.intake} cal</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Total Expenditure</p>
                <p className="text-xl font-bold text-chart-2">{currentWeek.tdee} cal</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Macronutrient Breakdown */}
      {macros && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🍎 Macronutrient Breakdown
            </CardTitle>
            <CardDescription>
              Optimized for {user?.diet_type} diet and {user?.workout_type} training
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">🥩 Protein</span>
                  <span className="text-sm font-bold text-blue-800">{macros.protein.percentage}%</span>
                </div>
                <div className="text-xl font-bold text-blue-800">{macros.protein.grams}g</div>
                <div className="text-xs text-blue-600">{macros.protein.calories} calories</div>
                <Progress value={macros.protein.percentage} className="h-2 bg-blue-100" />
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">🌾 Carbs</span>
                  <span className="text-sm font-bold text-green-800">{macros.carbs.percentage}%</span>
                </div>
                <div className="text-xl font-bold text-green-800">{macros.carbs.grams}g</div>
                <div className="text-xs text-green-600">{macros.carbs.calories} calories</div>
                <Progress value={macros.carbs.percentage} className="h-2 bg-green-100" />
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-yellow-700">🥑 Fats</span>
                  <span className="text-sm font-bold text-yellow-800">{macros.fat.percentage}%</span>
                </div>
                <div className="text-xl font-bold text-yellow-800">{macros.fat.grams}g</div>
                <div className="text-xs text-yellow-600">{macros.fat.calories} calories</div>
                <Progress value={macros.fat.percentage} className="h-2 bg-yellow-100" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized Nutrition Tips */}
      {nutritionTips.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              💡 Personalized Nutrition Tips
            </CardTitle>
            <CardDescription>
              Recommendations tailored to your {user?.workout_type} training and {user?.diet_type} diet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nutritionTips.map((tip, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 border border-purple-100">
                  <div className="text-2xl">{tip.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-purple-800">{tip.title}</h4>
                    <p className="text-sm text-purple-700 mt-1">{tip.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}