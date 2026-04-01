"use client"

import { BodyFatEntry, WeeklyProgression } from "@/types"

export type ProgressTrendChartPoint = {
  date: string
  fullDate: string
  type: "actual" | "predicted" | "projection"
  weightActual: number | null
  weightPredicted: number | null
  bodyFatActual: number | null
  bodyFatPredicted: number | null
  // Goal projection fields
  weightProjection: number | null
  weightProjectionUpper: number | null
  weightProjectionLower: number | null
  // Trend overlay comparison fields
  weightComparison: number | null
  bodyFatComparison: number | null
}

const MAX_PREDICTED_WEEKS = 12

const formatLabelDate = (value: Date) => {
  if (isNaN(value.getTime())) return "Invalid"
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const normaliseDate = (value: Date | string): Date => {
  const date = new Date(value)
  // Return current date if invalid to prevent crashes
  if (isNaN(date.getTime())) {
    console.warn('[Chart] Invalid date value:', value)
    return new Date()
  }
  return date
}

const safeToISOString = (date: Date): string => {
  if (isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

// ── Linear regression helpers ──────────────────────────────────────────

interface LinearRegressionResult {
  slope: number       // weight change per day
  intercept: number
  stdDev: number      // standard deviation of residuals
}

function linearRegression(
  points: { dayOffset: number; weight: number }[]
): LinearRegressionResult | null {
  if (points.length < 2) return null

  const n = points.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
  for (const p of points) {
    sumX += p.dayOffset
    sumY += p.weight
    sumXY += p.dayOffset * p.weight
    sumX2 += p.dayOffset * p.dayOffset
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null

  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // Standard deviation of residuals
  let sumResidualSq = 0
  for (const p of points) {
    const predicted = intercept + slope * p.dayOffset
    sumResidualSq += (p.weight - predicted) ** 2
  }
  const stdDev = Math.sqrt(sumResidualSq / n)

  return { slope, intercept, stdDev }
}

// ── Goal projection data builder ───────────────────────────────────────

export interface GoalProjectionResult {
  projectedDate: Date | null   // When goal would be reached
  exceedsEndDate: boolean      // True if projection goes past end_date
  daysToGoal: number | null
}

export function buildGoalProjectionPoints(
  entries: BodyFatEntry[],
  goalWeight: number,
  endDate?: string | null
): { points: ProgressTrendChartPoint[]; result: GoalProjectionResult } {
  const emptyResult: GoalProjectionResult = {
    projectedDate: null,
    exceedsEndDate: false,
    daysToGoal: null,
  }

  if (entries.length < 2) return { points: [], result: emptyResult }

  // Sort entries oldest to newest
  const sorted = [...entries].sort(
    (a, b) => normaliseDate(a.date).getTime() - normaliseDate(b.date).getTime()
  )

  // Use last 14 days of data for regression
  const latestDate = normaliseDate(sorted[sorted.length - 1].date)
  const cutoff = new Date(latestDate)
  cutoff.setDate(cutoff.getDate() - 14)

  const recentEntries = sorted.filter(
    (e) => normaliseDate(e.date).getTime() >= cutoff.getTime()
  )

  if (recentEntries.length < 2) return { points: [], result: emptyResult }

  // Build regression input
  const regressionBase = normaliseDate(recentEntries[0].date)
  const regressionPoints = recentEntries.map((e) => ({
    dayOffset:
      (normaliseDate(e.date).getTime() - regressionBase.getTime()) /
      (1000 * 60 * 60 * 24),
    weight: e.weight,
  }))

  const reg = linearRegression(regressionPoints)
  if (!reg || reg.slope >= 0) {
    // Not losing weight — no meaningful projection
    return { points: [], result: emptyResult }
  }

  // Project forward from the latest data point
  const latestWeight = sorted[sorted.length - 1].weight
  const latestDayOffset =
    (latestDate.getTime() - regressionBase.getTime()) / (1000 * 60 * 60 * 24)

  // Calculate days until goal weight is reached
  const goalDayOffset = (goalWeight - reg.intercept) / reg.slope
  const daysToGoal = Math.max(0, Math.ceil(goalDayOffset - latestDayOffset))

  // Cap projection at 365 days to prevent runaway charts
  const maxProjectionDays = Math.min(daysToGoal, 365)

  // Generate projection points (one per week)
  const projectionPoints: ProgressTrendChartPoint[] = []
  const stepDays = 7

  const nullFields = {
    weightPredicted: null,
    bodyFatActual: null,
    bodyFatPredicted: null,
    weightComparison: null,
    bodyFatComparison: null,
  }

  for (let d = 0; d <= maxProjectionDays; d += stepDays) {
    const projDate = new Date(latestDate)
    projDate.setDate(projDate.getDate() + d)
    const projDayOffset = latestDayOffset + d
    const projWeight = reg.intercept + reg.slope * projDayOffset

    // Stop projecting if weight drops below goal
    if (projWeight < goalWeight) break

    projectionPoints.push({
      date: formatLabelDate(projDate),
      fullDate: safeToISOString(projDate),
      type: "projection",
      weightActual: d === 0 ? latestWeight : null,
      ...nullFields,
      weightProjection: projWeight,
      weightProjectionUpper: projWeight + reg.stdDev,
      weightProjectionLower: Math.max(projWeight - reg.stdDev, goalWeight * 0.9),
    })
  }

  // Add the exact goal point
  const goalDate = new Date(latestDate)
  goalDate.setDate(goalDate.getDate() + daysToGoal)
  projectionPoints.push({
    date: formatLabelDate(goalDate),
    fullDate: safeToISOString(goalDate),
    type: "projection",
    weightActual: null,
    ...nullFields,
    weightProjection: goalWeight,
    weightProjectionUpper: goalWeight + reg.stdDev,
    weightProjectionLower: goalWeight,
  })

  const exceedsEndDate =
    endDate != null &&
    goalDate.getTime() > normaliseDate(endDate).getTime()

  return {
    points: projectionPoints,
    result: {
      projectedDate: goalDate,
      exceedsEndDate,
      daysToGoal,
    },
  }
}

// ── Trend overlay comparison data builder ──────────────────────────────

export type ComparisonPeriod = "none" | "lastWeek" | "lastMonth"

export function buildComparisonOverlay(
  entries: BodyFatEntry[],
  period: ComparisonPeriod
): Map<string, { weight: number; bodyFat: number | null }> {
  if (period === "none" || entries.length === 0) return new Map()

  const shiftDays = period === "lastWeek" ? 7 : 30

  const sorted = [...entries].sort(
    (a, b) => normaliseDate(a.date).getTime() - normaliseDate(b.date).getTime()
  )

  // Build a map: shift each entry's date forward by shiftDays to align with "current" timeline
  const compMap = new Map<string, { weight: number; bodyFat: number | null }>()
  for (const entry of sorted) {
    const entryDate = normaliseDate(entry.date)
    const shiftedDate = new Date(entryDate)
    shiftedDate.setDate(shiftedDate.getDate() + shiftDays)
    const label = safeToISOString(shiftedDate)

    compMap.set(label, {
      weight: entry.weight,
      bodyFat:
        typeof entry.body_fat_percentage === "number"
          ? entry.body_fat_percentage
          : null,
    })
  }

  return compMap
}

// ── Main chart data builder (enhanced) ─────────────────────────────────

export function buildProgressTrendChartData(
  entries: BodyFatEntry[],
  progression?: WeeklyProgression[],
  maxPredictedWeeks: number = MAX_PREDICTED_WEEKS,
  comparisonPeriod: ComparisonPeriod = "none",
  goalWeight?: number,
  endDate?: string | null
): ProgressTrendChartPoint[] {
  // Build comparison overlay map
  const compMap = buildComparisonOverlay(entries, comparisonPeriod)

  const nullProjectionFields = {
    weightProjection: null,
    weightProjectionUpper: null,
    weightProjectionLower: null,
  }

  const actualPoints = [...entries]
    .sort(
      (a, b) =>
        normaliseDate(a.date).getTime() - normaliseDate(b.date).getTime()
    )
    .map<ProgressTrendChartPoint>((entry) => {
      const entryDate = normaliseDate(entry.date)

      // Find closest comparison point within 1 day tolerance
      let compWeight: number | null = null
      let compBF: number | null = null
      if (compMap.size > 0) {
        const entryTime = entryDate.getTime()
        const tolerance = 1000 * 60 * 60 * 24 // 1 day
        for (const [key, val] of compMap.entries()) {
          const compTime = normaliseDate(key).getTime()
          if (Math.abs(compTime - entryTime) <= tolerance) {
            compWeight = val.weight
            compBF = val.bodyFat
            break
          }
        }
      }

      return {
        date: formatLabelDate(entryDate),
        fullDate: safeToISOString(entryDate),
        type: "actual" as const,
        weightActual: entry.weight,
        weightPredicted: null,
        bodyFatActual:
          typeof entry.body_fat_percentage === "number"
            ? entry.body_fat_percentage
            : null,
        bodyFatPredicted: null,
        ...nullProjectionFields,
        weightComparison: compWeight,
        bodyFatComparison: compBF,
      }
    })

  const predictedPoints =
    progression
      ?.slice(0, maxPredictedWeeks)
      .map<ProgressTrendChartPoint>((week) => {
        const progressionDate = normaliseDate(week.date)

        return {
          date: formatLabelDate(progressionDate),
          fullDate: safeToISOString(progressionDate),
          type: "predicted" as const,
          weightActual: null,
          weightPredicted: week.weight,
          bodyFatActual: null,
          bodyFatPredicted: week.body_fat_percentage,
          ...nullProjectionFields,
          weightComparison: null,
          bodyFatComparison: null,
        }
      }) ?? []

  // Build goal projection points
  let projectionPoints: ProgressTrendChartPoint[] = []
  if (goalWeight != null && goalWeight > 0) {
    const { points } = buildGoalProjectionPoints(entries, goalWeight, endDate)
    projectionPoints = points
  }

  return [...actualPoints, ...predictedPoints, ...projectionPoints].sort(
    (a, b) =>
      normaliseDate(a.fullDate).getTime() -
      normaliseDate(b.fullDate).getTime()
  )
}
