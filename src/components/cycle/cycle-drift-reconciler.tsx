"use client"

/**
 * CycleDriftReconciler
 *
 * Surfaces a per-field selection matrix whenever the user's profile snapshot
 * and the active cycle's stored values disagree on an overlapping field.
 *
 * Two modes (set by the caller via `mode` prop):
 *  - 'drift'       — passive detection: values drifted silently. Header reads
 *                    "Profile & Cycle Have Drifted".
 *  - 'intentional' — user just saved an Update Profile edit. Header reads
 *                    "Apply Profile Update to Active Cycle?".
 *
 * Default-highlighted source: CYCLE (architectural source of truth), but the
 * user can override per field. On "Apply", the chosen value is written to BOTH
 * sides (POST /api/data/user  +  POST /api/data/cycles with the full cycle
 * patched). Never auto-writes — only fires on explicit "Apply" click.
 *
 * Dismissible via "Not now" which calls onDismiss().
 */

import * as React from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { ProfileCycleDriftItem, DriftSelection, DriftFieldSource, CycleSyncMode, UserData } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CycleDriftReconcilerProps {
  /** The fields that differ between profile and cycle. */
  driftItems: ProfileCycleDriftItem[]
  /** The active cycle id — needed so we can POST the patched cycle back. */
  cycleId: string
  /** Controls framing copy (see module doc). */
  mode: CycleSyncMode
  /** Called after a successful Apply or when the user clicks "Not now". */
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to 1 decimal place for display. */
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

// Map a drift field to the key used in the profile write payload.
const PROFILE_KEY_MAP: Record<ProfileCycleDriftItem["field"], keyof UserData> = {
  goal_weight: "goal_weight",
  goal_bf: "goal_bf",
  current_weight: "current_weight",
  current_bf: "current_bf",
  timeline_weeks: "timeline_weeks",
}

// Map a drift field to the key used in the cycle write payload.
const CYCLE_KEY_MAP: Record<ProfileCycleDriftItem["field"], string> = {
  goal_weight: "goal_weight",
  goal_bf: "goal_bf",
  // profile.current_weight maps to cycle.start_weight
  current_weight: "start_weight",
  // profile.current_bf maps to cycle.start_bf
  current_bf: "start_bf",
  timeline_weeks: "timeline_weeks",
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CycleDriftReconciler({
  driftItems,
  cycleId,
  mode,
  onDismiss,
}: CycleDriftReconcilerProps) {
  // Per-field selection: default to 'cycle' (the architectural source of truth).
  const [selection, setSelection] = React.useState<DriftSelection>(() =>
    Object.fromEntries(driftItems.map((item) => [item.field, "cycle" as DriftFieldSource]))
  )

  // Re-sync selection when driftItems change (e.g. a new prompt arrives while
  // the component is already mounted). The lazy useState initializer only runs
  // once, so without this effect newly-added fields would be missing their
  // default and old/removed fields would leave stale keys.
  React.useEffect(() => {
    setSelection(
      Object.fromEntries(driftItems.map((item) => [item.field, "cycle" as DriftFieldSource]))
    )
  }, [driftItems])
  const [applying, setApplying] = React.useState(false)
  const [applyError, setApplyError] = React.useState<string | null>(null)
  const [applySuccess, setApplySuccess] = React.useState(false)

  function choose(field: ProfileCycleDriftItem["field"], source: DriftFieldSource) {
    setSelection((prev) => ({ ...prev, [field]: source }))
  }

  async function handleApply() {
    setApplying(true)
    setApplyError(null)

    // Build the patched values for each side.
    const profilePatch: Record<string, number> = {}
    const cyclePatch: Record<string, number> = {}

    for (const item of driftItems) {
      const chosen = selection[item.field] ?? "cycle"
      const canonicalValue = chosen === "cycle" ? item.cycleValue : item.profileValue

      // Write the canonical value to both sides.
      profilePatch[PROFILE_KEY_MAP[item.field]] = canonicalValue
      cyclePatch[CYCLE_KEY_MAP[item.field]] = canonicalValue
    }

    try {
      // 1. Fetch the current profile so we can merge (not blindly overwrite).
      const userRes = await fetch("/api/data/user")
      if (!userRes.ok) throw new Error(`Failed to load profile: ${userRes.status}`)
      const currentProfile = await userRes.json()

      // 2. Fetch the current cycle so we can merge.
      const cyclesRes = await fetch("/api/data/cycles", { cache: "no-store" })
      if (!cyclesRes.ok) throw new Error(`Failed to load cycles: ${cyclesRes.status}`)
      const cycles: unknown[] = await cyclesRes.json()
      const activeCycle = (cycles as Array<Record<string, unknown>>).find(
        (c) => c.id === cycleId
      )
      if (!activeCycle) throw new Error("Active cycle not found — it may have ended.")

      // 3. POST merged cycle first (cycle is the canonical source of truth;
      //    if the profile write subsequently fails the asymmetry is less bad
      //    than the reverse — profile will re-reconcile on next load).
      const mergedCycle = { ...activeCycle, ...cyclePatch }
      const saveCycleRes = await fetch("/api/data/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedCycle),
      })
      if (!saveCycleRes.ok) {
        throw new Error(`Failed to save cycle: ${saveCycleRes.status}`)
      }

      // 4. POST merged profile.
      const mergedProfile = { ...currentProfile, ...profilePatch }
      const saveProfileRes = await fetch("/api/data/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mergedProfile),
      })
      if (!saveProfileRes.ok) {
        throw new Error(
          `Cycle updated successfully, but the profile update failed (${saveProfileRes.status}). ` +
          `This prompt will reappear until both match — try applying again.`
        )
      }

      setApplySuccess(true)
      // Brief pause so the user sees "Saved!" before the banner closes.
      setTimeout(onDismiss, 1200)
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setApplying(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isIntentional = mode === "intentional"

  const headingText = isIntentional
    ? "Apply Profile Update to Active Cycle?"
    : "Profile & Active Cycle Have Drifted"

  const subText = isIntentional
    ? "You just updated your profile. The fields below differ from your active cycle. Choose which values to make canonical — the selected value will be saved to both your profile and the cycle."
    : "Your profile snapshot and active cycle disagree on the fields below. Choose the canonical value for each field. The selected value will be saved to both your profile and the cycle."

  return (
    <div
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-4"
      role="region"
      aria-label="Profile and cycle data reconciliation"
      data-testid="cycle-drift-reconciler"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
            aria-hidden="true"
          />
          <div className="space-y-1">
            <p className="font-semibold text-sm leading-tight">{headingText}</p>
            <p className="text-xs text-muted-foreground">{subText}</p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss this reconciliation prompt"
          type="button"
        >
          <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </div>

      {/* Selection matrix */}
      <div className="space-y-2" role="group" aria-label="Field-by-field source selection">
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-2 pb-1 border-b border-border/60">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Field
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide w-28 text-center">
            Profile value
          </span>
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide w-28 text-center">
            Cycle value ★
          </span>
        </div>

        {driftItems.map((item) => {
          const chosen = selection[item.field] ?? "cycle"
          return (
            <div
              key={item.field}
              className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center rounded-md px-2 py-1.5 hover:bg-muted/40 transition-colors"
            >
              {/* Field label */}
              <span className="text-sm font-medium">{item.label}</span>

              {/* Profile value selector */}
              <button
                type="button"
                onClick={() => choose(item.field, "profile")}
                aria-pressed={chosen === "profile"}
                aria-label={`Use profile value ${fmt(item.profileValue)} for ${item.label}`}
                className={[
                  "w-28 rounded-md border px-3 py-1.5 text-sm font-mono text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  chosen === "profile"
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50",
                ].join(" ")}
              >
                {fmt(item.profileValue)}
              </button>

              {/* Cycle value selector — default highlighted */}
              <button
                type="button"
                onClick={() => choose(item.field, "cycle")}
                aria-pressed={chosen === "cycle"}
                aria-label={`Use cycle value ${fmt(item.cycleValue)} for ${item.label} (recommended)`}
                className={[
                  "w-28 rounded-md border px-3 py-1.5 text-sm font-mono text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  chosen === "cycle"
                    ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-amber-500/50",
                ].join(" ")}
              >
                {fmt(item.cycleValue)}
              </button>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <p className="text-xs text-muted-foreground px-2">
        ★ Cycle values are the default — the active cycle is the architectural source of truth.
        Override per field if you intended a different value.
      </p>

      {/* Error feedback */}
      {applyError && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription className="text-xs">{applyError}</AlertDescription>
        </Alert>
      )}

      {/* Success feedback */}
      {applySuccess && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Saved to both profile and cycle.</span>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          disabled={applying || applySuccess}
          type="button"
        >
          Not now
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleApply}
          disabled={applying || applySuccess}
          type="button"
          aria-busy={applying}
        >
          {applying ? (
            <>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Applying…
            </>
          ) : (
            "Apply"
          )}
        </Button>
      </div>
    </div>
  )
}
