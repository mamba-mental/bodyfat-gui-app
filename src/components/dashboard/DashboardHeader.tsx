"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import ClientIcon from "@/components/ui/client-icon"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { UserData, BodyFatEntry, ProgramReferenceSnapshot } from "@/types"
import { useApp } from "@/contexts/app-context"
import { detectProfileCycleDrift } from "@/lib/cycleMetrics"
import { CycleDriftReconciler } from "@/components/cycle/cycle-drift-reconciler"
import type { ProfileCycleDriftItem, CycleSyncMode } from "@/types"

interface DashboardHeaderProps {
  currentUser: UserData | null
  entries: BodyFatEntry[]
  programReference: ProgramReferenceSnapshot | null
  loading: boolean
  reportGenerationStatus: string | null
  onArchiveProgram: (name: string, notes: string) => Promise<void>
  onGenerateReport: () => void
}

/**
 * Inline cycle fetch result — only the fields needed for drift detection.
 * We fetch here independently (without mutating the use-cycles hook) so the
 * header stays self-contained and the hook stays owned by its existing consumers.
 */
interface SlimCycle {
  id: string
  status: string
  start_weight?: number | null
  start_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
  timeline_weeks?: number | null
}

export function DashboardHeader({
  currentUser,
  entries,
  programReference,
  loading,
  reportGenerationStatus,
  onArchiveProgram,
  onGenerateReport,
}: DashboardHeaderProps) {
  const { state, dispatch } = useApp()
  const cycleSync = state.cycle_sync

  // -------------------------------------------------------------------------
  // Passive drift detection — runs once when the header mounts (and whenever
  // currentUser changes). Compares the profile against the active cycle and
  // dispatches SET_CYCLE_SYNC_PROMPT if fields diverge.
  //
  // We do NOT run this when the reconciler was triggered by an intentional
  // profile edit (app-context.tsx already handled that path), and we skip it
  // when a prompt is already pending (avoid re-opening a dismissed prompt on
  // every render).
  // -------------------------------------------------------------------------
  const [activeCycle, setActiveCycle] = React.useState<SlimCycle | null>(null)

  React.useEffect(() => {
    if (!currentUser) return
    // Skip the passive poll when a reconciler prompt is already live — the user
    // might be mid-decision; re-detecting would race with their selection.
    if (cycleSync != null && !cycleSync.dismissed) return

    let alive = true
    fetch("/api/data/cycles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((cycles: SlimCycle[]) => {
        if (!alive) return
        const active = Array.isArray(cycles)
          ? cycles.find((c) => c.status === "active") ?? null
          : null
        setActiveCycle(active)

        if (!active) return

        const driftItems = detectProfileCycleDrift(currentUser, {
          start_weight: active.start_weight,
          start_bf: active.start_bf,
          goal_weight: active.goal_weight,
          goal_bf: active.goal_bf,
          timeline_weeks: active.timeline_weeks,
        })

        if (driftItems.length > 0) {
          dispatch({
            type: "SET_CYCLE_SYNC_PROMPT",
            payload: {
              driftItems,
              cycleId: active.id,
              mode: "drift",
              dismissed: false,
            },
          })
        }
      })
      .catch(() => {
        // Fail silently — drift detection is a UX enhancement, not load-bearing.
      })

    return () => {
      alive = false
    }
    // currentUser identity (name serves as a stable proxy), cycleSync null/not null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.name])

  // Dismiss handler — sets dismissed in state so the banner collapses.
  const handleDismiss = React.useCallback(() => {
    dispatch({ type: "DISMISS_CYCLE_SYNC_PROMPT" })
  }, [dispatch])

  // Determine whether the reconciler should be visible.
  const showReconciler =
    cycleSync != null &&
    !cycleSync.dismissed &&
    cycleSync.driftItems.length > 0 &&
    cycleSync.cycleId !== null

  return (
    <div className="space-y-3">
      {/* Top bar — title + action buttons */}
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Link href="/setup/custom">
            <Button variant="secondary">
              Update Profile
            </Button>
          </Link>
          <Link href="/entries/new">
            <Button variant="default">
              <ClientIcon icon={Plus} className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </Link>
          <Button variant="secondary" onClick={onGenerateReport} disabled={loading}>
            {loading && reportGenerationStatus ? "Generating Report…" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Drift reconciler — rendered just below the header bar */}
      {showReconciler && cycleSync && (
        <CycleDriftReconciler
          driftItems={cycleSync.driftItems as ProfileCycleDriftItem[]}
          cycleId={cycleSync.cycleId as string}
          mode={cycleSync.mode as CycleSyncMode}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}
