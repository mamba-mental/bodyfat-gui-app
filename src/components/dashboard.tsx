"use client"

import * as React from "react"
import { CalendarDays, Target, TrendingDown, AlertCircle, Plus } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useApp } from "@/contexts/app-context"
import { calculateProgressPercentage, estimateTimeToGoal } from "@/lib/calculations"
import { formatDate } from "@/lib/date-utils"
import {
  ProgressTrendChart,
  CalorieManagementWidget,
  GoalProgressWidget,
  MetabolicInsightsWidget
} from "@/components/charts/lazy-chart-components"
import {
  AIInsightsPanel,
  AIChatWidget
} from "@/components/ai/lazy-ai-components"

export function Dashboard() {
  const [mounted, setMounted] = React.useState(false)
  const { state, calculateAndUpdateProgression, generateNewReport, setUserData, createNewProgram } = useApp()

  React.useEffect(() => {
    setMounted(true)
  }, [])


  const {
    current_user,
    current_calculation,
    entries,
    reports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
  } = state

  // Filter entries for the current program
  const programEntries = React.useMemo(() => {
    // If user has a current_program_id, filter by program_id
    if (current_user?.current_program_id) {
      const filtered = entries.filter(entry =>
        entry.program_id === current_user.current_program_id
      )
      // If we have program-filtered entries, use them
      // Otherwise fall back to date-based filtering for legacy data
      if (filtered.length > 0) {
        return filtered
      }
    }

    // Fallback: filter by start_date for legacy entries without program_id
    if (!current_user?.start_date) return entries
    const startDate = new Date(current_user.start_date)
    // Reset time to start of day for fair comparison
    startDate.setHours(0, 0, 0, 0)

    return entries.filter(entry => {
      const entryDate = new Date(entry.date)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate >= startDate
    })
  }, [entries, current_user?.start_date, current_user?.current_program_id])

  // Calculate current metrics based on program entries
  const latestEntry = programEntries[0] // entries are sorted by date desc
  const currentWeight = latestEntry?.weight || current_user?.current_weight || 0
  const currentBF = latestEntry?.body_fat_percentage || current_user?.current_bf || 0

  const goalWeight = current_user?.goal_weight || 0
  const goalBF = current_user?.goal_bf || 0
  // In our model, current_user.current_weight IS the start weight of the program
  // But if program_reference exists (New Program started), use that as the definitive start point
  const startWeight = current_user?.program_reference?.initial_weight || current_user?.current_weight || 0
  const startBF = current_user?.program_reference?.initial_bf || current_user?.current_bf || 0

  const weightProgress = calculateProgressPercentage(startWeight, currentWeight, goalWeight)
  const bfProgress = calculateProgressPercentage(startBF, currentBF, goalBF)

  // Calculate program timeline data
  const programData = current_user?.start_date && current_user?.end_date ? (() => {
    const startDate = new Date(current_user.start_date)
    const endDate = new Date(current_user.end_date)
    const currentDate = new Date()

    const startMs = startDate.getTime()
    const endMs = endDate.getTime()

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return { totalWeeks: 0, currentWeek: 0, daysIntoProgram: 0, programProgress: 0 }
    }

    const weekMs = 1000 * 60 * 60 * 24 * 7
    const dayMs = 1000 * 60 * 60 * 24

    const totalTime = endMs - startMs
    const elapsedTime = Math.max(0, currentDate.getTime() - startMs)

    const totalWeeks = Math.max(1, Math.ceil(totalTime / weekMs))
    const currentWeek = Math.min(totalWeeks, Math.max(1, Math.ceil(elapsedTime / weekMs)))
    const programProgress = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100))
    const daysIntoProgram = Math.min(Math.round(totalWeeks * 7), Math.max(0, Math.floor(elapsedTime / dayMs)))

    return {
      totalWeeks,
      currentWeek,
      daysIntoProgram,
      programProgress
    }
  })() : { totalWeeks: 0, currentWeek: 0, daysIntoProgram: 0, programProgress: 0 }

  // Get current week's calorie recommendation based on program progression
  let currentCalories = 0
  try {
    if (current_calculation && current_calculation.progression && Array.isArray(current_calculation.progression) && current_calculation.progression.length > 0) {
      const weekIndex = Math.max(0, Math.min(programData.currentWeek - 1, current_calculation.progression.length - 1))
      const weekData = current_calculation.progression[weekIndex]
      currentCalories = weekData?.daily_calorie_intake || 0
    }
  } catch (e) {
    console.error('Error calculating current calories:', e)
    currentCalories = 0
  }

  // Time estimation using program length
  let timeEstimate = { weeks: programData.totalWeeks, completion_date: current_user ? new Date(current_user.end_date || Date.now()) : new Date() }
  try {
    if (current_calculation && current_calculation.progression && Array.isArray(current_calculation.progression) && current_calculation.progression.length > 0) {
      timeEstimate = estimateTimeToGoal(current_calculation.progression, goalWeight, goalBF, programData.totalWeeks)
    }
  } catch (e) {
    console.error('Error estimating time to goal:', e)
  }

  // Handle initial calculation if needed
  React.useEffect(() => {
    if (current_user && !current_calculation && !loading) {
      calculateAndUpdateProgression()
    }
  }, [current_user, current_calculation, loading, calculateAndUpdateProgression])

  if (!mounted) return null


  const handleGenerateReport = async () => {
    await generateNewReport()
  }

  const handleStartNewProgram = async () => {
    if (!current_user) return

    // Use createNewProgram from context which:
    // 1. Generates a new program_id
    // 2. Creates a program_reference snapshot with current metrics
    // 3. Updates user data with current_program_id
    // 4. Refreshes widgets
    const newProgramId = createNewProgram()

    if (!newProgramId) {
      console.error('[Dashboard] Failed to create new program')
      return
    }

    // Also update the timeline dates for UI purposes
    const startDateIso = new Date().toISOString().split('T')[0]
    const timelineWeeks = current_user.timeline_weeks || 16
    const endDateIso = new Date(Date.now() + timelineWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Get the updated user from state after createNewProgram
    // Note: createNewProgram already saved the user, but we need to update dates
    const newStartWeight = entries[0]?.weight || current_user.current_weight
    const newStartBF = entries[0]?.body_fat_percentage || current_user.current_bf

    const updatedUser = {
      ...current_user,
      current_program_id: newProgramId,
      current_weight: newStartWeight,
      current_bf: newStartBF,
      start_date: startDateIso,
      end_date: endDateIso
    }

    setUserData(updatedUser)
    // Recalculate progression with new baseline
    await calculateAndUpdateProgression(updatedUser)
  }

  if (!current_user) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ApexFit.ai - Alpha</CardTitle>
            <CardDescription>Set up your profile to start tracking your progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/setup">
              <Button>
                <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
                Set Up Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-dashed">
                Start New Program
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start a New Program?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset your progress tracking to start from today.
                  Your current weight ({entries[0]?.weight || current_user.current_weight} lbs) will become your new starting weight.
                  Past entries will be preserved in history but won't affect new program stats.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleStartNewProgram}>Start New Program</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Link href="/setup/custom">
            <Button variant="secondary">
              Update Profile
            </Button>
          </Link>
          <Link href="/entries/new">
            <Button>
              <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
          <Button variant="outline" onClick={handleGenerateReport} disabled={loading}>
            {loading && report_generation_status ? 'Generating Report…' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <ClientIcon icon={AlertCircle} className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Alert>
          <AlertDescription>Calculating progression...</AlertDescription>
        </Alert>
      )}

      {report_generation_status && (
        <Alert>
          <AlertDescription>
            Report status: {report_generation_status}
            {report_generation_entry_date && (
              <span className="ml-1">
                (Entry date: {report_generation_entry_date})
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4" aria-label="Dashboard sections">
        <TabsList
          className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
          role="tablist"
          aria-label="Dashboard navigation tabs"
        >
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            aria-label="Overview section - View current metrics and progress summary"
          >
            <span aria-hidden="true">&#x1F4CA;</span> Overview
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-500 data-[state=active]:text-white"
            aria-label="Progress section - View detailed progress charts and trends"
          >
            <span aria-hidden="true">&#x1F4C8;</span> Progress
          </TabsTrigger>
          <TabsTrigger
            value="nutrition"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white"
            aria-label="Nutrition section - View calorie and nutrition guidance"
          >
            <span aria-hidden="true">&#x1F34E;</span> Nutrition
          </TabsTrigger>
          <TabsTrigger
            value="ai-coach"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            aria-label="AI Coach section - Get personalized AI insights and chat"
          >
            <span aria-hidden="true">&#x1F916;</span> AI Coach
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4" role="tabpanel" aria-labelledby="overview-tab">
          <section aria-labelledby="metrics-heading">
            <h3 id="metrics-heading" className="sr-only">Current Metrics Overview</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card
                className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20"
                role="article"
                aria-labelledby="current-weight-title"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle id="current-weight-title" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Current Weight</CardTitle>
                  <div className="p-2 bg-emerald-500/10 rounded-full" aria-hidden="true">
                    <ClientIcon icon={TrendingDown} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200" aria-label={`Current weight: ${currentWeight.toFixed(1)} pounds`}>
                    {currentWeight.toFixed(1)} lbs
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    {startWeight > currentWeight ? (
                      <span aria-label={`${Math.abs(startWeight - currentWeight).toFixed(1)} pounds lost since starting`}>
                        <span aria-hidden="true">↓</span> {Math.abs(startWeight - currentWeight).toFixed(1)} lbs lost
                      </span>
                    ) : (
                      <span aria-label={`${Math.abs(startWeight - currentWeight).toFixed(1)} pounds gained since starting`}>
                        <span aria-hidden="true">↑</span> {Math.abs(startWeight - currentWeight).toFixed(1)} lbs gained
                      </span>
                    )}
                  </p>
                </CardContent>
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10" aria-hidden="true">&#x2696;&#xFE0F;</div>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Body Fat %</CardTitle>
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <ClientIcon icon={TrendingDown} className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {currentBF.toFixed(1)}%
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    {startBF > currentBF ? (
                      <>↓ {Math.abs(startBF - currentBF).toFixed(1)}% reduced</>
                    ) : (
                      <>↑ {Math.abs(startBF - currentBF).toFixed(1)}% increased</>
                    )}
                  </p>
                </CardContent>
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F3AF;</div>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 dark:from-orange-900/20 dark:to-orange-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">This Week's Calories</CardTitle>
                  <div className="p-2 bg-orange-500/10 rounded-full">
                    <ClientIcon icon={Target} className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                    {currentCalories ? Math.round(currentCalories) : 'Calculating...'}
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    {current_calculation ? `Week ${programData.currentWeek} target` : 'Pending calculation'}
                  </p>
                </CardContent>
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F525;</div>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Program Progress</CardTitle>
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <ClientIcon icon={CalendarDays} className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    Week {programData.currentWeek}
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    of {programData.totalWeeks} weeks ({Math.round(programData.programProgress)}% complete)
                  </p>
                </CardContent>
                <div className="absolute -right-4 -bottom-4 text-6xl opacity-10">&#x1F4C8;</div>
              </Card>
            </div>
          </section>

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
                  entries={programEntries.slice(0, 8)} // Show last 8 entries of current program
                  progression={current_calculation?.progression?.slice(0, 6)} // Next 6 weeks prediction
                  title=""
                  description=""
                />
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Progress Summary</CardTitle>
                <CardDescription>Key metrics and goals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Goal Progress Section */}
                <div className="space-y-4">
                  <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-700">&#x1F4AA; Weight Loss Progress</span>
                      <span className="font-bold text-emerald-800">{Math.max(0, weightProgress).toFixed(1)}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={Math.max(0, Math.min(100, weightProgress))} className="h-3 bg-emerald-100" />
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, weightProgress))}%` }} />
                    </div>
                    <div className="text-center text-xs text-emerald-600">
                      {currentWeight.toFixed(1)} lbs → {goalWeight.toFixed(1)} lbs
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-700">&#x1F3AF; Body Fat Reduction</span>
                      <span className="font-bold text-blue-800">{Math.max(0, bfProgress).toFixed(1)}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={Math.max(0, Math.min(100, bfProgress))} className="h-3 bg-blue-100" />
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, bfProgress))}%` }} />
                    </div>
                    <div className="text-center text-xs text-blue-600">
                      {currentBF.toFixed(1)}% → {goalBF.toFixed(1)}%
                    </div>
                  </div>

                  <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-purple-700">&#x23F0; Timeline Progress</span>
                      <span className="font-bold text-purple-800">{Math.round(programData.programProgress)}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={programData.programProgress} className="h-3 bg-purple-100" />
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
                        style={{ width: `${Math.min(100, programData.programProgress)}%` }} />
                    </div>
                    <div className="text-center text-xs text-purple-600">
                      Day {programData.daysIntoProgram} of {Math.round(programData.totalWeeks * 7)}
                    </div>
                  </div>

                  {current_calculation?.confidence_score && (
                    <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-amber-700">&#x1F9E0; AI Confidence Score</span>
                        <span className="font-bold text-amber-800">{current_calculation?.confidence_score}/100</span>
                      </div>
                      <div className="relative">
                        <Progress value={current_calculation?.confidence_score || 0} className="h-3 bg-amber-100" />
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                          style={{ width: `${current_calculation?.confidence_score || 0}%` }} />
                      </div>
                      <div className="text-xs text-amber-600 text-center">
                        Plan reliability assessment
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="text-lg">&#x1F4CA;</span>
                    Recent Activity
                  </h4>
                  <div className="space-y-3">
                    {programEntries.slice(0, 2).map((entry, index) => (
                      <div key={entry.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          &#x1F4C8;
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-medium text-blue-900">
                            {entry.weight.toFixed(1)} lbs
                            {entry.body_fat_percentage && ` (${entry.body_fat_percentage.toFixed(1)}% BF)`}
                          </p>
                          <p className="text-xs text-blue-600">
                            {formatDate(entry.date)}
                            {index === 0 && <span className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 rounded-full text-xs">Latest</span>}
                          </p>
                        </div>
                      </div>
                    ))}

                    {reports.slice(0, 1).map((report) => (
                      <div key={report.id} className="flex items-center space-x-3 p-2 rounded-lg bg-gradient-to-r from-emerald-50/50 to-green-50/50 border border-emerald-100/50">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          &#x1F504;
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-xs font-medium text-emerald-900">Report generated</p>
                          <p className="text-xs text-emerald-600">
                            {new Date(report.generated_at).toLocaleDateString()}
                            <span className="ml-2 px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full text-xs">New</span>
                          </p>
                        </div>
                      </div>
                    ))}

                    {programEntries.length === 0 && reports.length === 0 && (
                      <div className="text-center py-2 text-muted-foreground">
                        <p className="text-xs">No activity yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Diagnostics */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <span className="text-lg">&#x1F50E;</span>
                    Report Diagnostics
                  </h4>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      {report_generation_status || "No report generation in progress."}
                    </p>
                    <p>
                      <span className="font-semibold">Entry used:</span>{" "}
                      {report_generation_entry_date || "Not recorded"}
                    </p>
                    {reports[0] && (
                      <p>
                        <span className="font-semibold">Last report:</span>{" "}
                        {new Date(reports[0].generated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <ProgressTrendChart
            entries={programEntries}
            progression={current_calculation?.progression}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <GoalProgressWidget
              user={current_user}
              entries={programEntries}
              progression={current_calculation?.progression}
            />
            <MetabolicInsightsWidget
              progression={current_calculation?.progression}
            />
          </div>
        </TabsContent>

        <TabsContent value="nutrition" className="space-y-4">
          <CalorieManagementWidget
            progression={current_calculation?.progression}
            currentCalories={currentCalories}
            user={current_user}
          />
        </TabsContent>

        <TabsContent value="ai-coach" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <AIInsightsPanel
                title="Personalized AI Insights"
                showHeader={true}
                maxInsights={6}
                categories={['progress', 'nutrition', 'workout', 'goal', 'health']}
              />
            </div>
            <div className="space-y-4">
              <AIChatWidget defaultExpanded={true} maxHeight="600px" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
