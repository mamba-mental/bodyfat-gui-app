"use client"

import { BodyFatEntry, WeeklyProgression } from "@/types"

export type ProgressTrendChartPoint = {
  date: string
  fullDate: string
  type: "actual" | "predicted"
  weightActual: number | null
  weightPredicted: number | null
  bodyFatActual: number | null
  bodyFatPredicted: number | null
}

const MAX_PREDICTED_WEEKS = 12

const formatLabelDate = (value: Date) =>
  value.toLocaleDateString("en-US", { month: "short", day: "numeric" })

const normaliseDate = (value: Date | string) => new Date(value)

export function buildProgressTrendChartData(
  entries: BodyFatEntry[],
  progression?: WeeklyProgression[],
  maxPredictedWeeks: number = MAX_PREDICTED_WEEKS
): ProgressTrendChartPoint[] {
  const actualPoints = [...entries]
    .sort(
      (a, b) =>
        normaliseDate(a.date).getTime() - normaliseDate(b.date).getTime()
    )
    .map<ProgressTrendChartPoint>((entry) => {
      const entryDate = normaliseDate(entry.date)

      return {
        date: formatLabelDate(entryDate),
        fullDate: entryDate.toISOString(),
        type: "actual",
        weightActual: entry.weight,
        weightPredicted: null,
        bodyFatActual:
          typeof entry.body_fat_percentage === "number"
            ? entry.body_fat_percentage
            : null,
        bodyFatPredicted: null,
      }
    })

  const predictedPoints =
    progression
      ?.slice(0, maxPredictedWeeks)
      .map<ProgressTrendChartPoint>((week) => {
        const progressionDate = normaliseDate(week.date)

        return {
          date: formatLabelDate(progressionDate),
          fullDate: progressionDate.toISOString(),
          type: "predicted",
          weightActual: null,
          weightPredicted: week.weight,
          bodyFatActual: null,
          bodyFatPredicted: week.body_fat_percentage,
        }
      }) ?? []

  return [...actualPoints, ...predictedPoints].sort(
    (a, b) =>
      normaliseDate(a.fullDate).getTime() -
      normaliseDate(b.fullDate).getTime()
  )
}

