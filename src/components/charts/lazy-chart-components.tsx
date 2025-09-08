"use client"

import dynamic from 'next/dynamic'
import { ChartSkeleton } from '@/components/ui/lazy-wrapper'

// Lazy load chart components with custom loading states
export const LazyProgressTrendChart = dynamic(
  () => import('./progress-trend-chart').then(mod => ({ default: mod.ProgressTrendChart })),
  {
    loading: () => <ChartSkeleton title="Weekly Progress Trend" height="h-80" />,
    ssr: false
  }
)

export const LazyCalorieManagementWidget = dynamic(
  () => import('./calorie-management-widget').then(mod => ({ default: mod.CalorieManagementWidget })),
  {
    loading: () => <ChartSkeleton title="Calorie Management" height="h-64" />,
    ssr: false
  }
)

export const LazyGoalProgressWidget = dynamic(
  () => import('./goal-progress-widget').then(mod => ({ default: mod.GoalProgressWidget })),
  {
    loading: () => <ChartSkeleton title="Goal Progress" height="h-64" />,
    ssr: false
  }
)

export const LazyMetabolicInsightsWidget = dynamic(
  () => import('./metabolic-insights-widget').then(mod => ({ default: mod.MetabolicInsightsWidget })),
  {
    loading: () => <ChartSkeleton title="Metabolic Insights" height="h-64" />,
    ssr: false
  }
)

// Export individual components for compatibility
export {
  LazyProgressTrendChart as ProgressTrendChart,
  LazyCalorieManagementWidget as CalorieManagementWidget,
  LazyGoalProgressWidget as GoalProgressWidget,
  LazyMetabolicInsightsWidget as MetabolicInsightsWidget
}