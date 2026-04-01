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
    program_reference,
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
    archiveProgram,
  } = useDashboardData()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleGenerateReport = React.useCallback(async () => {
    await generateNewReport()
  }, [generateNewReport])

  const handleArchiveProgram = React.useCallback(async (name: string, notes: string) => {
    const result = await archiveProgram(name, notes)
    if (result) {
      console.log('[Dashboard] Program archived successfully:', result.id)
    }
  }, [archiveProgram])

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
              <Button className="min-h-[44px]">
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
        programReference={program_reference}
        loading={loading}
        reportGenerationStatus={report_generation_status}
        onArchiveProgram={handleArchiveProgram}
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
