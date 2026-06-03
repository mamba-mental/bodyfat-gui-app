"use client"

import * as React from "react"
import { useApp } from "@/contexts/app-context"

export interface Cycle {
  id: string
  name: string
  status: string
  start_date: string
  end_date?: string | null
  start_weight?: number | null
  start_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
  timeline_weeks?: number | null
  weighin_days?: number[] | null
  [k: string]: unknown
}

/**
 * Single reactive source of truth for ReComp cycles.
 *
 * Both the dashboard banner (CycleContextBanner) and the cycle controls
 * (CycleManagerCard) consume this hook, so a transition in one place updates
 * every reader. It re-fetches whenever the app-wide `refreshKey` bumps — which
 * `notifyChanged()` (a thin wrapper over `refreshWidgets()`) triggers after any
 * cycle mutation. This replaces the previous pattern where each component did
 * its own isolated `fetch('/api/data/cycles')` with an empty-deps useEffect that
 * never refetched (the stale-banner bug).
 */
export function useCycles() {
  const { refreshKey, refreshWidgets } = useApp()
  const [cycles, setCycles] = React.useState<Cycle[]>([])
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    fetch("/api/data/cycles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((cs) => {
        if (!alive) return
        setCycles(Array.isArray(cs) ? cs : [])
        setLoaded(true)
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [refreshKey])

  const active = cycles.find((c) => c.status === "active") ?? null

  // Bump the app-wide refresh signal so every useCycles() consumer re-fetches.
  const notifyChanged = React.useCallback(() => {
    refreshWidgets()
  }, [refreshWidgets])

  return { cycles, active, loaded, notifyChanged }
}
