"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EntryForm } from "@/components/forms/entry-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ClipboardPlus } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AIInsightsPanel } from "@/components/ai/ai-insights-panel"
import { CycleContextBanner } from "@/components/cycle/cycle-context-banner"
import { WorkspacePageHeader } from "@/components/layout/workspace-page-header"

export default function NewEntryPage() {
  const router = useRouter()
  const { state, addEntry } = useApp()
  const { error, entries } = state
  const [isSaving, setIsSaving] = React.useState(false)

  // Entry dates feed missed-weigh-in detection, which needs canonical
  // YYYY-MM-DD strings (F9). Normalise here: BodyFatEntry.date may be an ISO
  // string or a Date, so collapse both to date-only.
  const entryDates = React.useMemo(
    () =>
      (entries ?? []).map((e) =>
        e.date instanceof Date ? e.date.toISOString().slice(0, 10) : String(e.date).slice(0, 10)
      ),
    [entries]
  )

  const handleSubmit = async (data: { date: Date; weight: number; body_fat_percentage?: number; notes?: string; photo?: string }) => {
    setIsSaving(true)
    try {
      const saved = await addEntry({
        date: data.date,
        weight: data.weight,
        body_fat_percentage: data.body_fat_percentage,
        notes: data.notes,
        photo: data.photo,
      })

      if (saved) {
        // Report generation is an explicit, cycle-gated action in Report Center.
        router.push("/")
      }
    } catch (error) {
      console.error("Error saving entry:", error)
      // Error is handled by the context
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <WorkspacePageHeader
        eyebrow="Daily check-in"
        title="Record today’s measurements"
        description="Add a canonical weight and body-fat entry, optional notes, and a progress photo. The new record updates your active cycle, projections, and dashboard, and becomes available to the Report Center."
        icon={ClipboardPlus}
        actions={<Button asChild variant="outline" size="sm"><Link href="/entries"><ArrowLeft className="mr-2 h-4 w-4" /> Entry history</Link></Button>}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CycleContextBanner entryDates={entryDates} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EntryForm onSubmit={handleSubmit} isLoading={isSaving} />
        </div>
        <div className="lg:col-span-1">
          <AIInsightsPanel 
            title="AI Entry Guidance"
            showHeader={true}
            maxInsights={3}
            categories={['progress', 'health', 'goal']}
          />
        </div>
      </div>
    </div>
  )
}
