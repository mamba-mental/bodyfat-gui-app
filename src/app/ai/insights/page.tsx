"use client"

import * as React from "react"
import { Activity, Brain, ListChecks } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AIInsightsPanel } from "@/components/ai/ai-insights-panel"
import { useApp } from "@/contexts/app-context"

export default function AIInsightsPage() {
  const { state } = useApp()
  const hasEntries = state.entries.length > 0

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">AI Insights & Guidance</h1>
          <p className="text-muted-foreground">
            Personalized recommendations generated from your logged entries and PRIME calculations.
          </p>
        </div>
      </div>

      {!hasEntries && (
        <Alert>
          <AlertDescription>
            Log at least one entry to unlock AI-driven insights tailored to your goals.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Recommendations
            </CardTitle>
            <CardDescription>
              We highlight opportunities in nutrition, training, and recovery based on your latest data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AIInsightsPanel showHeader={false} maxInsights={8} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              How insights work
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              AI insights combine your profile, recent entries, PRIME progression, and configured AI provider responses.
              When live providers are unavailable, we fall back to on-device analytics so you always have guidance.
            </p>
            <ul className="list-disc space-y-2 pl-4">
              <li>Log entries weekly to refresh calorie targets and body composition forecasts.</li>
              <li>Update AI Settings to select providers and models best suited for your workflow.</li>
              <li>Leverage insights before generating a full report to preview recommended adjustments.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
