"use client"

import { Suspense } from "react"
import SetupWizard from "@/components/setup/setup-wizard"

export default function WizardPage() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <SetupWizard />
    </Suspense>
  )
}

function WizardSkeleton() {
  return (
    <div className="container max-w-3xl mx-auto space-y-6 animate-pulse">
      <div className="text-center space-y-2">
        <div className="h-8 w-64 bg-muted rounded mx-auto" />
        <div className="h-4 w-40 bg-muted rounded mx-auto" />
      </div>
      <div className="h-2 bg-muted rounded-full" />
      <div className="h-[420px] bg-muted/50 rounded-lg" />
    </div>
  )
}
