"use client"

import * as React from "react"
import { useApp } from "@/contexts/app-context"
import { calculateProgressPercentage, estimateTimeToGoal } from "@/lib/calculations"
import { archiveProgram as archiveProgramAction } from "@/contexts/app/actions"
import { useCycles } from "@/hooks/use-cycles"
import { activeCycleMetrics } from "@/lib/cycleMetrics"
import { currentCycleWeek } from "@/lib/cycleWeek"

export interface ProgramData {
  totalWeeks: number
  currentWeek: number
  daysIntoProgram: number
  programProgress: number
}

export interface DashboardMetrics {
  currentWeight: number
  currentBF: number
  goalWeight: number
  goalBF: number
  startWeight: number
  startBF: number
  weightProgress: number
  bfProgress: number
  currentCalories: number
  programData: ProgramData
  timeEstimate: { weeks: number; completion_date: Date }
}

export function useDashboardData() {
  const { state, dispatch, calculateAndUpdateProgression, generateNewReport, setUserData, createNewProgram, refreshWidgets } = useApp()
  // The active ReComp cycle is the aggregate root for every dashboard metric.
  const { active: activeCycle } = useCycles()

  const {
    current_user,
    program_reference,
    current_calculation,
    entries,
    reports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
  } = state

  // Legacy program scoping — used ONLY as a fallback when no cycle is active
  // (back-compat for profiles that predate ReComp Cycles).
  const legacyProgramEntries = React.useMemo(() => {
    if (current_user?.current_program_id) {
      const filtered = entries.filter(entry =>
        entry.program_id === current_user.current_program_id
      )
      if (filtered.length > 0) {
        return filtered
      }
    }

    const programStartDateStr = current_user?.program_reference?.start_date || current_user?.start_date
    if (!programStartDateStr) return entries

    const startDate = new Date(programStartDateStr)
    startDate.setHours(0, 0, 0, 0)

    return entries.filter(entry => {
      const entryDate = new Date(entry.date)
      entryDate.setHours(0, 0, 0, 0)
      return entryDate >= startDate
    })
  }, [entries, current_user?.start_date, current_user?.current_program_id, current_user?.program_reference?.start_date])

  // F3+F5: when a cycle is active, ALL weight/bf/baseline metrics come from ONE
  // domain service scoped to that cycle — no profile-blob or program_reference
  // divergence (the "3 current-weights" bug). When NO cycle is active, preserve
  // the legacy program_reference derivation so pre-cycle profiles are unaffected.
  const cycleMetrics = React.useMemo(
    () => activeCycleMetrics(entries, activeCycle, current_user ?? {}),
    [entries, activeCycle, current_user],
  )

  const programEntries = activeCycle ? cycleMetrics.cycleEntries : legacyProgramEntries

  // Legacy (no active cycle) derivation — latest entry + program_reference baseline.
  const legacyLatest = legacyProgramEntries[0]
  const legacyCurrentWeight = legacyLatest?.weight || current_user?.current_weight || 0
  const legacyCurrentBF = legacyLatest?.body_fat_percentage || current_user?.current_bf || 0
  const legacyStartWeight = current_user?.program_reference?.initial_weight || current_user?.current_weight || 0
  const legacyStartBF = current_user?.program_reference?.initial_bf || current_user?.current_bf || 0

  const currentWeight = activeCycle ? cycleMetrics.currentWeight : legacyCurrentWeight
  const currentBF = activeCycle ? cycleMetrics.currentBF : legacyCurrentBF
  const goalWeight = activeCycle ? cycleMetrics.goalWeight : (current_user?.goal_weight || 0)
  const goalBF = activeCycle ? cycleMetrics.goalBF : (current_user?.goal_bf || 0)
  const startWeight = activeCycle ? cycleMetrics.startWeight : legacyStartWeight
  const startBF = activeCycle ? cycleMetrics.startBF : legacyStartBF

  const weightProgress = calculateProgressPercentage(startWeight, currentWeight, goalWeight)
  const bfProgress = calculateProgressPercentage(startBF, currentBF, goalBF)

  // Calculate program timeline data.
  // F3: when a cycle is active, the timeline (week N of M) is the CYCLE's —
  // start_date + timeline_weeks — using the timezone-safe cycleWeek math.
  const programData = React.useMemo<ProgramData>(() => {
    if (activeCycle?.start_date && activeCycle.timeline_weeks && activeCycle.timeline_weeks > 0) {
      const now = new Date()
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const startDay = String(activeCycle.start_date).slice(0, 10)
      const totalWeeks = activeCycle.timeline_weeks
      const currentWeek = currentCycleWeek(startDay, today, totalWeeks)
      const dayMs = 1000 * 60 * 60 * 24
      const elapsedDays = Math.max(0, Math.floor((new Date(today).getTime() - new Date(startDay).getTime()) / dayMs))
      const daysIntoProgram = Math.min(totalWeeks * 7, elapsedDays)
      const programProgress = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100))
      return { totalWeeks, currentWeek, daysIntoProgram, programProgress }
    }

    if (!current_user?.start_date || !current_user?.end_date) {
      return { totalWeeks: 0, currentWeek: 0, daysIntoProgram: 0, programProgress: 0 }
    }

    const startDate = new Date(current_user.start_date)
    const endDate = new Date(current_user.end_date)
    const currentDate = new Date()

    const startMs = startDate.getTime()
    const endMs = endDate.getTime()

    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return { totalWeeks: 0, currentWeek: 0, daysIntoProgram: 0, programProgress: 0 }
    }

    const weekMs = 1000 * 60 * 60 * 24 * 7
    const dayMs = 1000 * 60 * 60 * 24

    const totalTime = endMs - startMs
    const elapsedTime = Math.max(0, currentDate.getTime() - startMs)

    const totalWeeks = Math.max(1, Math.ceil(totalTime / weekMs))
    const currentWeek = Math.min(totalWeeks, Math.max(1, Math.ceil(elapsedTime / weekMs)))
    const programProgress = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100))
    const daysIntoProgram = Math.min(Math.round(totalWeeks * 7), Math.max(0, Math.floor(elapsedTime / dayMs)))

    return { totalWeeks, currentWeek, daysIntoProgram, programProgress }
  }, [activeCycle?.start_date, activeCycle?.timeline_weeks, current_user?.start_date, current_user?.end_date])

  // Get current week's calorie recommendation
  const currentCalories = React.useMemo(() => {
    try {
      const progression = current_calculation?.progression
      if (progression && progression.length > 0) {
        const weekIndex = Math.max(0, Math.min(programData.currentWeek - 1, progression.length - 1))
        return progression[weekIndex]?.daily_calorie_intake || 0
      }
    } catch (e) {
      console.error('Error calculating current calories:', e)
    }
    return 0
  }, [current_calculation, programData.currentWeek])

  // Time estimation using program length
  const timeEstimate = React.useMemo(() => {
    try {
      const progression = current_calculation?.progression
      if (progression && progression.length > 0) {
        return estimateTimeToGoal(progression, goalWeight, goalBF, programData.totalWeeks)
      }
    } catch (e) {
      console.error('Error estimating time to goal:', e)
    }
    return {
      weeks: programData.totalWeeks,
      completion_date: current_user ? new Date(current_user.end_date || Date.now()) : new Date()
    }
  }, [current_calculation, goalWeight, goalBF, programData.totalWeeks, current_user])

  // Handle initial calculation if needed
  React.useEffect(() => {
    if (current_user && !current_calculation && !loading) {
      calculateAndUpdateProgression()
    }
  }, [current_user, current_calculation, loading, calculateAndUpdateProgression])

  const metrics: DashboardMetrics = {
    currentWeight,
    currentBF,
    goalWeight,
    goalBF,
    startWeight,
    startBF,
    weightProgress,
    bfProgress,
    currentCalories,
    programData,
    timeEstimate,
  }

  // Archive program callback
  const archiveProgram = React.useCallback(async (name: string, notes: string) => {
    return archiveProgramAction(name, notes, {
      dispatch,
      currentUser: current_user,
      entries,
      programReference: program_reference,
      refreshWidgets,
    })
  }, [dispatch, current_user, entries, program_reference, refreshWidgets])

  return {
    // State
    current_user,
    program_reference,
    current_calculation,
    entries,
    reports,
    loading,
    error,
    report_generation_status,
    report_generation_entry_date,
    programEntries,
    metrics,
    // Actions
    calculateAndUpdateProgression,
    generateNewReport,
    setUserData,
    createNewProgram,
    archiveProgram,
  }
}
