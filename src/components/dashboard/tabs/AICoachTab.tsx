"use client"

import {
  AIInsightsPanel,
  AIChatWidget
} from "@/components/ai/lazy-ai-components"

export function AICoachTab() {
  return (
    <div className="space-y-4">
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
    </div>
  )
}
