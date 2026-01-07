"use client"

import * as React from "react"
import { Plus, AlertCircle } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { useDashboardData } from "./hooks/useDashboardData"
import { DashboardHeader } from "./DashboardHeader"
import { OverviewTab } from "./tabs/OverviewTab"
import { ProgressTab } from "./tabs/ProgressTab"
import { NutritionTab } from "./tabs/NutritionTab"
import { AICoachTab } from "./tabs/AICoachTab"

export function Dashboard() {
  const [mounted, setMounted] = React.useState(false)

  const {
    current_user,
    current_calculation,
    entries,
    reports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
    programEntries,
    metrics,
    generateNewReport,
    setUserData,
    createNewProgram,
    calculateAndUpdateProgression,
  } = useDashboardData()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleGenerateReport = React.useCallback(async () => {
    await generateNewReport()
  }, [generateNewReport])

  const handleStartNewProgram = React.useCallback(async () => {
    if (!current_user) return

    const newProgramId = createNewProgram()
    if (!newProgramId) {
      console.error('[Dashboard] Failed to create new program')
      return
    }

    const startDateIso = new Date().toISOString().split('T')[0]
    const timelineWeeks = current_user.timeline_weeks || 16
    const endDateIso = new Date(Date.now() + timelineWeeks * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const newStartWeight = current_user.current_weight
    const newStartBF = current_user.current_bf
    console.log('[Dashboard] Starting new program with profile baseline:', newStartWeight, 'lbs,', newStartBF, '% BF')

    const updatedUser = {
      ...current_user,
      current_program_id: newProgramId,
      current_weight: newStartWeight,
      current_bf: newStartBF,
      start_date: startDateIso,
      end_date: endDateIso
    }

    setUserData(updatedUser)
    await calculateAndUpdateProgression(updatedUser)
  }, [current_user, createNewProgram, setUserData, calculateAndUpdateProgression])

  if (!mounted) return null

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
      <DashboardHeader
        currentUser={current_user}
        entries={entries}
        loading={loading}
        reportGenerationStatus={report_generation_status}
        onStartNewProgram={handleStartNewProgram}
        onGenerateReport={handleGenerateReport}
      />

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

        <TabsContent value="overview">
          <OverviewTab
            metrics={metrics}
            programEntries={programEntries}
            reports={reports}
            currentCalculation={current_calculation}
            reportGenerationStatus={report_generation_status}
            reportGenerationEntryDate={report_generation_entry_date}
          />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressTab
            programEntries={programEntries}
            currentUser={current_user}
            currentCalculation={current_calculation}
          />
        </TabsContent>

        <TabsContent value="nutrition">
          <NutritionTab
            currentUser={current_user}
            currentCalculation={current_calculation}
            currentCalories={metrics.currentCalories}
          />
        </TabsContent>

        <TabsContent value="ai-coach">
          <AICoachTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Re-export for backward compatibility
export { Dashboard as default }
