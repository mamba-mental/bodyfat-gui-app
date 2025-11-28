import { describe, expect, it } from "vitest"

import { buildProgressTrendChartData } from "@/components/charts/progress-trend-chart.utils"
import type { BodyFatEntry, WeeklyProgression } from "@/types"

const buildEntry = (overrides: Partial<BodyFatEntry>): BodyFatEntry => ({
  id: overrides.id ?? "entry-id",
  date: overrides.date ?? new Date().toISOString(),
  weight: overrides.weight ?? 0,
  body_fat_percentage: overrides.body_fat_percentage,
  notes: overrides.notes,
  user_id: overrides.user_id ?? "user-1",
  created_at: overrides.created_at ?? new Date().toISOString(),
  updated_at: overrides.updated_at ?? new Date().toISOString(),
})

const buildWeek = (overrides: Partial<WeeklyProgression>): WeeklyProgression => ({
  date: overrides.date ?? new Date().toISOString(),
  weight: overrides.weight ?? 0,
  body_fat_percentage: overrides.body_fat_percentage ?? 0,
  daily_calorie_intake: overrides.daily_calorie_intake ?? 0,
  tdee: overrides.tdee ?? 0,
  weekly_caloric_output: overrides.weekly_caloric_output ?? 0,
  total_weight_lost: overrides.total_weight_lost ?? 0,
  lean_mass: overrides.lean_mass ?? 0,
  fat_mass: overrides.fat_mass ?? 0,
  muscle_gain: overrides.muscle_gain ?? 0,
  rmr: overrides.rmr ?? 0,
  tef: overrides.tef ?? 0,
  neat: overrides.neat ?? 0,
})

describe("buildProgressTrendChartData", () => {
  it("separates actual and predicted values while keeping chronological order", () => {
    const entries: BodyFatEntry[] = [
      buildEntry({
        id: "b",
        date: "2024-01-08T00:00:00.000Z",
        weight: 198,
        body_fat_percentage: 18.4,
      }),
      buildEntry({
        id: "a",
        date: "2024-01-01T00:00:00.000Z",
        weight: 200,
        body_fat_percentage: 19.5,
      }),
    ]

    const progression: WeeklyProgression[] = [
      buildWeek({
        date: "2024-01-15T00:00:00.000Z",
        weight: 197.2,
        body_fat_percentage: 18,
      }),
      buildWeek({
        date: "2024-01-22T00:00:00.000Z",
        weight: 196.4,
        body_fat_percentage: 17.7,
      }),
    ]

    const chartData = buildProgressTrendChartData(entries, progression)

    expect(chartData.map(point => point.type)).toEqual([
      "actual",
      "actual",
      "predicted",
      "predicted",
    ])

    expect(chartData[0]).toMatchObject({
      weightActual: 200,
      weightPredicted: null,
      bodyFatActual: 19.5,
      bodyFatPredicted: null,
    })

    expect(chartData[2]).toMatchObject({
      weightActual: null,
      weightPredicted: 197.2,
      bodyFatActual: null,
      bodyFatPredicted: 18,
    })
  })

  it("limits predicted points to the configured maximum (12 weeks by default)", () => {
    const progression: WeeklyProgression[] = Array.from({ length: 20 }, (_, index) =>
      buildWeek({
        date: new Date(Date.UTC(2024, 0, index + 1)).toISOString(),
        weight: 200 - index,
        body_fat_percentage: 20 - index * 0.2,
      })
    )

    const chartData = buildProgressTrendChartData([], progression)

    const predictedPoints = chartData.filter(point => point.type === "predicted")

    expect(predictedPoints).toHaveLength(12)
    expect(predictedPoints[0].weightPredicted).toBe(200)
    expect(predictedPoints.at(-1)?.weightPredicted).toBe(200 - 11)
  })

  it("handles missing body fat percentages by outputting null actual values", () => {
    const entries: BodyFatEntry[] = [
      buildEntry({
        id: "no-bf",
        date: "2024-01-01T00:00:00.000Z",
        weight: 210,
      }),
    ]

    const chartData = buildProgressTrendChartData(entries, [])

    expect(chartData).toHaveLength(1)
    expect(chartData[0]).toMatchObject({
      type: "actual",
      weightActual: 210,
      bodyFatActual: null,
    })
  })
})

