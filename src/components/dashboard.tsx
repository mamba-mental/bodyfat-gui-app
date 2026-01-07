/**
 * Dashboard component - re-exports from modular dashboard structure
 *
 * This file maintains backward compatibility for existing imports.
 * The actual implementation is in ./dashboard/index.tsx
 *
 * File structure:
 * - dashboard/index.tsx - Main container (~150 lines)
 * - dashboard/DashboardHeader.tsx - Title, buttons (~70 lines)
 * - dashboard/MetricsCards.tsx - 4 metric cards (~120 lines)
 * - dashboard/ProgressSummary.tsx - Progress bars (~180 lines)
 * - dashboard/tabs/OverviewTab.tsx - Overview tab content (~70 lines)
 * - dashboard/tabs/ProgressTab.tsx - Progress tab content (~35 lines)
 * - dashboard/tabs/NutritionTab.tsx - Nutrition tab content (~25 lines)
 * - dashboard/tabs/AICoachTab.tsx - AI Coach tab content (~25 lines)
 * - dashboard/hooks/useDashboardData.ts - Data fetching logic (~160 lines)
 */

// Re-export the Dashboard component from the modular structure
// Using dynamic re-export to avoid circular reference issues
export * from "./dashboard/index"
