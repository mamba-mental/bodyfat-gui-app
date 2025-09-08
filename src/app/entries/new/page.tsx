"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EntryForm } from "@/components/forms/entry-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useApp } from "@/contexts/app-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { AIInsightsPanel } from "@/components/ai/ai-insights-panel"

export default function NewEntryPage() {
  const router = useRouter()
  const { state, addEntry } = useApp()
  const { loading, error } = state

  const handleSubmit = async (data: { date: Date; weight: number; body_fat_percentage?: number; notes?: string }) => {
    try {
      await addEntry({
        date: data.date,
        weight: data.weight,
        body_fat_percentage: data.body_fat_percentage,
        notes: data.notes,
      })
      
      // Redirect to dashboard after successful submission
      router.push("/")
    } catch (error) {
      console.error("Error saving entry:", error)
      // Error is handled by the context
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/entries">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Entries
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Entry</h1>
          <p className="text-muted-foreground">
            Add a new weight and body fat measurement to track your progress
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EntryForm onSubmit={handleSubmit} isLoading={loading} />
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