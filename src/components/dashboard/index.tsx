"use client"

import * as React from "react"
import { Activity, ArrowRight, AlertCircle, Target, Brain, TrendingUp } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"

import { useDashboardData } from "./hooks/useDashboardData"
import { CycleManagerCard } from "@/components/cycle/cycle-manager-card"
import { QuietDashboard } from "./quiet-dashboard"
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
      <div className="flex-1 p-4 md:p-8 pt-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] items-start">
          {/* Left column — welcome CTA */}
          <Card className="flex flex-col items-center text-center py-12 md:py-16 lg:items-start lg:text-left">
            <CardContent className="flex flex-col items-center gap-6 lg:items-start">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-950">
                <ClientIcon icon={Activity} className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Welcome to Ap3xFit.ai
                </h1>
                <p className="max-w-md text-muted-foreground">
                  Track your body composition journey with AI-powered insights.
                  Our precision engine turns metrics into progress.
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 lg:items-start">
                <Link href="/setup">
                  <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    Set Up Profile
                    <ClientIcon icon={ArrowRight} className="h-4 w-4" />
                  </Button>
                </Link>
                <span className="text-xs text-muted-foreground">
                  Takes about 2 minutes
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Right column — preview widget placeholders */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: Target, label: "Body Fat %", desc: "Current estimate & trend" },
              { icon: Brain, label: "AI Readiness", desc: "Personalized coaching score" },
              { icon: TrendingUp, label: "Weekly Goal", desc: "Progress toward your target" },
            ].map(({ icon, label, desc }) => (
              <Card
                key={label}
                className="border-dashed opacity-60 py-5"
              >
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed">
                    <ClientIcon icon={icon} className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1">
      <QuietDashboard
        user={current_user}
        metrics={metrics}
        entries={entries}
        reports={reports}
        calculation={current_calculation}
        onGenerateReport={handleGenerateReport}
      />

      <section className="space-y-4 bg-[#f8f6f0] px-4 pb-8 md:px-8">

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

      <div className="flex flex-wrap items-end justify-between gap-3 pt-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#69736b]">Detailed workspace</p><h2 className="mt-1 font-serif text-3xl text-[#173c2a]">All existing analytics remain available</h2></div></div>
      <Tabs defaultValue="overview" className="space-y-4" aria-label="Dashboard sections">
        <TabsList
          className="grid w-full grid-cols-4 border border-[#d7ddd4] bg-white lg:w-auto lg:grid-cols-4"
          role="tablist"
          aria-label="Dashboard navigation tabs"
        >
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#173c2a] data-[state=active]:text-white"
            aria-label="Overview section - View current metrics and progress summary"
          >
            <span aria-hidden="true">&#x1F4CA;</span> Overview
          </TabsTrigger>
          <TabsTrigger
            value="progress"
            className="data-[state=active]:bg-[#173c2a] data-[state=active]:text-white"
            aria-label="Progress section - View detailed progress charts and trends"
          >
            <span aria-hidden="true">&#x1F4C8;</span> Progress
          </TabsTrigger>
          <TabsTrigger
            value="nutrition"
            className="data-[state=active]:bg-[#173c2a] data-[state=active]:text-white"
            aria-label="Nutrition section - View calorie and nutrition guidance"
          >
            <span aria-hidden="true">&#x1F34E;</span> Nutrition
          </TabsTrigger>
          <TabsTrigger
            value="ai-coach"
            className="data-[state=active]:bg-[#173c2a] data-[state=active]:text-white"
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
      <details className="rounded-2xl border border-[#d7ddd4] bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-[#365640]">Standard cycle controls</summary><div className="mt-4"><CycleManagerCard latestWeight={entries?.[0]?.weight ?? null} latestBf={entries?.[0]?.body_fat_percentage ?? null} /></div></details>
      <details className="rounded-2xl border border-[#d7ddd4] bg-white p-4"><summary className="cursor-pointer text-sm font-semibold text-[#365640]">Legacy program and report actions</summary><div className="mt-4"><DashboardHeader currentUser={current_user} entries={entries} programReference={program_reference} loading={loading} reportGenerationStatus={report_generation_status} onArchiveProgram={handleArchiveProgram} onGenerateReport={handleGenerateReport} /></div></details>
      </section>
    </div>
  )
}

// Re-export for backward compatibility
export { Dashboard as default }
