"use client"

import dynamic from 'next/dynamic'
import { AISkeleton } from '@/components/ui/lazy-wrapper'

// Lazy load AI components with custom loading states
export const LazyAIInsightsPanel = dynamic(
  () => import('./ai-insights-panel').then(mod => ({ default: mod.AIInsightsPanel })),
  {
    loading: () => <AISkeleton />,
    ssr: false
  }
)

export const LazyAIChatWidget = dynamic(
  () => import('./ai-chat-widget').then(mod => ({ default: mod.AIChatWidget })),
  {
    loading: () => <AISkeleton compact={true} />,
    ssr: false
  }
)

// Export for compatibility
export {
  LazyAIInsightsPanel as AIInsightsPanel,
  LazyAIChatWidget as AIChatWidget
}