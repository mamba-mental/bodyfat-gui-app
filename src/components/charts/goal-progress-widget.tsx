"use client"

import * as React from "react"
import { Target, Calendar, Trophy, Zap, Clock } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UserData, BodyFatEntry, WeeklyProgression } from "@/types"
import { useApp } from "@/contexts/app-context"

interface GoalProgressWidgetProps {
  user?: UserData
  entries: BodyFatEntry[]
  progression?: WeeklyProgression[]
  title?: string
  description?: string
}

export function GoalProgressWidget({ 
  user, 
  entries, 
  progression,
  title = "Goal Progress Tracking",
  description = "Monitor your journey towards target goals"
}: GoalProgressWidgetProps) {
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
  const latestEntry = entries[0] // entries are sorted by date desc
  const currentWeight = latestEntry?.weight || user?.current_weight || 0
  const currentBF = latestEntry?.body_fat_percentage || user?.current_bf || 0
  
  const goalWeight = user?.goal_weight || 0
  const goalBF = user?.goal_bf || 0
  const startWeight = user?.current_weight || 0
  const startBF = user?.current_bf || 0

  // Calculate progress percentages
  const weightProgress = React.useMemo(() => {
    if (startWeight === goalWeight) return 100
    const totalChange = startWeight - goalWeight
    const currentChange = startWeight - currentWeight
    return Math.max(0, Math.min(100, (currentChange / totalChange) * 100))
  }, [startWeight, currentWeight, goalWeight])

  const bfProgress = React.useMemo(() => {
    if (startBF === goalBF) return 100
    const totalChange = startBF - goalBF
    const currentChange = startBF - currentBF
    return Math.max(0, Math.min(100, (currentChange / totalChange) * 100))
  }, [startBF, currentBF, goalBF])

  // Calculate time estimates based on latest entry and target dates
  const timeEstimate = React.useMemo(() => {
    if (!user) return null
    
    // Use progression if available, otherwise calculate from user dates
    let totalWeeks = progression?.length || 16 // default 16 weeks
    let progressWeeks = 0
    let remainingWeeks = totalWeeks
    let completionDate = new Date()
    
    // If user has start_date and end_date, use those for more accurate calculation
    if (user.start_date && user.end_date) {
      const startDate = new Date(user.start_date)
      const endDate = new Date(user.end_date)
      const currentDate = new Date()
      
      // Calculate total program duration
      const totalDuration = Math.abs(endDate.getTime() - startDate.getTime())
      totalWeeks = Math.ceil(totalDuration / (1000 * 60 * 60 * 24 * 7))
      
      // Calculate progress based on latest entry or current date
      let referenceDate = currentDate
      if (latestEntry && latestEntry.date) {
        referenceDate = new Date(latestEntry.date)
      }
      
      // Calculate weeks elapsed since start
      const elapsedTime = Math.abs(referenceDate.getTime() - startDate.getTime())
      progressWeeks = Math.max(0, Math.ceil(elapsedTime / (1000 * 60 * 60 * 24 * 7)))
      progressWeeks = Math.min(progressWeeks, totalWeeks) // Cap at total weeks
      
      // Calculate remaining weeks
      remainingWeeks = Math.max(0, totalWeeks - progressWeeks)
      
      // Set completion date to user's end date
      completionDate = new Date(endDate)
      
      // If we're past the target date, adjust based on current progress
      if (currentDate > endDate && progressWeeks < totalWeeks) {
        const weeksLeft = totalWeeks - progressWeeks
        completionDate = new Date(currentDate)
        completionDate.setDate(completionDate.getDate() + (weeksLeft * 7))
      }
    } else {
      // Fallback calculation when no dates available
      progressWeeks = Math.min(entries.length, totalWeeks)
      remainingWeeks = Math.max(0, totalWeeks - progressWeeks)
      completionDate.setDate(completionDate.getDate() + (remainingWeeks * 7))
    }
    
    return {
      totalWeeks,
      remainingWeeks,
      completionDate,
      progressWeeks,
      isOnTrack: remainingWeeks >= 0,
      programStatus: progressWeeks >= totalWeeks ? 'completed' : 
                   remainingWeeks === 0 ? 'ending' : 'active'
    }
  }, [progression, entries, user, latestEntry, refreshKey])

  // Calculate velocity (rate of change)
  const velocity = React.useMemo(() => {
    if (entries.length < 2) return { weight: 0, bodyFat: 0 }
    
    const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstEntry = sortedEntries[0]
    const lastEntry = sortedEntries[sortedEntries.length - 1]
    
    const daysDiff = (new Date(lastEntry.date).getTime() - new Date(firstEntry.date).getTime()) / (1000 * 60 * 60 * 24)
    const weeksDiff = daysDiff / 7
    
    if (weeksDiff === 0) return { weight: 0, bodyFat: 0 }
    
    const weightVelocity = (firstEntry.weight - lastEntry.weight) / weeksDiff
    const bfVelocity = lastEntry.body_fat_percentage && firstEntry.body_fat_percentage 
      ? (firstEntry.body_fat_percentage - lastEntry.body_fat_percentage) / weeksDiff
      : 0
    
    return { weight: weightVelocity, bodyFat: bfVelocity }
  }, [entries, refreshKey])

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Target className="h-12 w-12 mb-4" />
            <p className="text-lg font-medium">Set up your profile</p>
            <p className="text-sm">Define your goals to track progress</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="flex space-x-2">
              {weightProgress >= 100 && (
                <Badge variant="default">
                  <Trophy className="h-3 w-3 mr-1" />
                  Weight Goal Achieved!
                </Badge>
              )}
              {bfProgress >= 100 && (
                <Badge variant="default">
                  <Trophy className="h-3 w-3 mr-1" />
                  Body Fat Goal Achieved!
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weight Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Weight Loss Progress</h4>
                <p className="text-xs text-muted-foreground">
                  {currentWeight.toFixed(1)} lbs → {goalWeight.toFixed(1)} lbs
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{weightProgress.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  {(startWeight - currentWeight).toFixed(1)} of {(startWeight - goalWeight).toFixed(1)} lbs lost
                </div>
              </div>
            </div>
            <Progress value={weightProgress} className="h-3" />
            {velocity.weight > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Zap className="h-3 w-3 mr-1" />
                Current rate: {velocity.weight.toFixed(1)} lbs/week
              </div>
            )}
          </div>

          {/* Body Fat Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Body Fat Reduction</h4>
                <p className="text-xs text-muted-foreground">
                  {currentBF.toFixed(1)}% → {goalBF.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{bfProgress.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  {(startBF - currentBF).toFixed(1)} of {(startBF - goalBF).toFixed(1)}% reduced
                </div>
              </div>
            </div>
            <Progress value={bfProgress} className="h-3" />
            {velocity.bodyFat > 0 && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Zap className="h-3 w-3 mr-1" />
                Current rate: {velocity.bodyFat.toFixed(1)}%/week
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Card */}
      {timeEstimate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recomposition Roadmap</CardTitle>
                <CardDescription>
                  Track your journey timeline and milestones
                </CardDescription>
              </div>
              <Badge variant={timeEstimate.programStatus === 'completed' ? 'default' : 
                             timeEstimate.programStatus === 'ending' ? 'destructive' : 'secondary'}>
                {timeEstimate.programStatus === 'completed' ? 'Program Complete' : 
                 timeEstimate.programStatus === 'ending' ? 'Final Week' : 
                 timeEstimate.isOnTrack ? 'On Track' : 'Behind Schedule'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-blue-600">{timeEstimate.progressWeeks}</div>
                <div className="text-xs text-muted-foreground">Weeks Completed</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-600">{timeEstimate.remainingWeeks}</div>
                <div className="text-xs text-muted-foreground">Weeks Remaining</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-purple-600">{timeEstimate.totalWeeks}</div>
                <div className="text-xs text-muted-foreground">Total Duration</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((timeEstimate.progressWeeks / timeEstimate.totalWeeks) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Timeline Complete</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Timeline Progress</span>
                <span>{Math.round((timeEstimate.progressWeeks / timeEstimate.totalWeeks) * 100)}%</span>
              </div>
              <Progress 
                value={(timeEstimate.progressWeeks / timeEstimate.totalWeeks) * 100} 
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Estimated Completion</span>
              </div>
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                {timeEstimate.completionDate.toLocaleDateString()}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Weight Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-medium">{currentWeight.toFixed(1)} lbs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{goalWeight.toFixed(1)} lbs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium text-blue-600">
                {Math.max(0, currentWeight - goalWeight).toFixed(1)} lbs
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Body Fat Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-medium">{currentBF.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal</span>
              <span className="font-medium">{goalBF.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-medium text-blue-600">
                {Math.max(0, currentBF - goalBF).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}