"use client"

import * as React from "react"
import { AlertOctagon, CheckCircle2, PackagePlus, Pencil, RefreshCw, ShieldAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { challengeApi } from "@/lib/challenge-api"
import type {
  PedInventoryCoverage,
  PedInventoryItem,
  PedInventoryItemInput,
  PedRangeResolution,
  PedReviewEvidence,
  ProtocolWindow,
} from "@/types/challenge"
import { PedInventoryForm } from "./ped-inventory-form"

export interface PedInventoryActivationContext {
  inventory_user_id: string
  inventory_required: true
  range_resolutions: PedRangeResolution[]
  member_inventory_confirmed: boolean
  review_evidence?: PedReviewEvidence
}

const emptyReview = { reviewer_name: "", reviewer_role: "", review_note: "", attested: false }

export function PedInventoryWorkspace({
  protocol,
  startDate,
  onContextChange,
}: {
  protocol: ProtocolWindow | null
  startDate: string
  onContextChange: (context: PedInventoryActivationContext) => void
}) {
  const [items, setItems] = React.useState<PedInventoryItem[]>([])
  const [coverage, setCoverage] = React.useState<PedInventoryCoverage | null>(null)
  const [resolutions, setResolutions] = React.useState<PedRangeResolution[]>([])
  const [memberConfirmed, setMemberConfirmed] = React.useState(false)
  const [review, setReview] = React.useState(emptyReview)
  const [editing, setEditing] = React.useState<PedInventoryItem | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const refreshItems = React.useCallback(async () => {
    const latest = await challengeApi.inventory()
    setItems(latest)
    return latest
  }, [])

  const refreshCoverage = React.useCallback(async () => {
    if (!protocol) return
    setCoverage(await challengeApi.inventoryCoverage({
      user_id: "default",
      start_week: protocol.start_week,
      start_date: startDate,
      range_resolutions: resolutions.filter((row) => row.selected_value),
    }))
  }, [protocol?.start_week, startDate, resolutions])

  React.useEffect(() => {
    let alive = true
    refreshItems()
      .catch((error) => { if (alive) toast.error(error.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [refreshItems])

  React.useEffect(() => {
    if (!protocol) return
    const timer = window.setTimeout(() => {
      refreshCoverage().catch((error) => toast.error(error.message))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [refreshCoverage, items, protocol])

  React.useEffect(() => {
    const completeReview = review.reviewer_name.trim() && review.reviewer_role.trim() && review.review_note.trim()
    onContextChange({
      inventory_user_id: "default",
      inventory_required: true,
      range_resolutions: resolutions.filter((row) => row.selected_value),
      member_inventory_confirmed: memberConfirmed,
      review_evidence: completeReview ? review : undefined,
    })
  }, [memberConfirmed, onContextChange, resolutions, review])

  React.useEffect(() => {
    setResolutions([])
    setMemberConfirmed(false)
  }, [protocol?.start_week])

  const save = async (values: PedInventoryItemInput) => {
    setSaving(true)
    try {
      if (editing) await challengeApi.updateInventoryItem(editing.id, values)
      else await challengeApi.createInventoryItem(values)
      await refreshItems()
      setEditing(null)
      setMemberConfirmed(false)
      toast.success(editing ? "Inventory item updated" : "Inventory item added")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inventory save failed")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: PedInventoryItem) => {
    if (!window.confirm(`Remove ${item.label_name} from inventory?`)) return
    try {
      await challengeApi.deleteInventoryItem(item.id)
      await refreshItems()
      setMemberConfirmed(false)
      toast.success("Inventory item removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inventory delete failed")
    }
  }

  const setRange = (requirement: PedInventoryCoverage["range_requirements"][number], value: string) => {
    setResolutions((current) => [
      ...current.filter((row) => !(row.compound === requirement.compound && row.source_value === requirement.source_value)),
      { compound: requirement.compound, source_value: requirement.source_value, selected_value: value, unit: requirement.unit },
    ])
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-sm" aria-labelledby="ped-inventory-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Tonight MVP · manual and source-bound</p>
          <h2 id="ped-inventory-heading" className="mt-1 text-2xl font-semibold tracking-tight">PED inventory &amp; exact coverage</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Enter what is physically on hand. The app only allocates it to the selected source schedule; it does not choose a protocol or make a medical safety claim.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refreshCoverage()} disabled={!protocol}><RefreshCw className="mr-2 h-4 w-4" /> Recheck</Button>
      </div>

      <PedInventoryForm
        compounds={protocol?.ped_stack.map((row) => row.compound) || []}
        editing={editing}
        saving={saving}
        onSave={save}
        onCancel={() => setEditing(null)}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><PackagePlus className="h-4 w-4 text-primary" /> Confirmed inventory ({items.length})</div>
        {loading ? <p className="text-xs text-muted-foreground">Loading inventory…</p> : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No inventory entered yet. Add each container or package separately.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3">
                <div><p className="text-sm font-semibold">{item.label_name}</p><p className="mt-1 text-xs text-muted-foreground">{item.canonical_compound} · {item.strength_value} {item.strength_unit}/{item.inventory_unit} · {item.available_units} {item.inventory_unit} · expires {item.expiration_date}</p><p className="mt-1 text-[11px] font-medium text-primary">{item.confirmed ? "Label fields confirmed" : "Unconfirmed — cannot allocate"}</p></div>
                <div className="flex gap-1"><Button aria-label={`Edit ${item.label_name}`} size="icon" variant="ghost" onClick={() => setEditing(item)}><Pencil className="h-4 w-4" /></Button><Button aria-label={`Remove ${item.label_name}`} size="icon" variant="ghost" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button></div>
              </article>
            ))}
          </div>
        )}
      </div>

      {coverage?.range_requirements.length ? (
        <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-4">
          <div className="flex gap-2"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="font-semibold">Reviewed values needed for literal source ranges</h3><p className="mt-1 text-xs text-muted-foreground">Record a value that was separately reviewed. The app checks only that it remains inside the source range.</p></div></div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {coverage.range_requirements.map((requirement) => {
              const current = resolutions.find((row) => row.compound === requirement.compound && row.source_value === requirement.source_value)
              return <label key={`${requirement.compound}-${requirement.source_value}`} className="text-xs font-medium">Reviewed value for {requirement.source_name} {requirement.source_value}<div className="mt-1 flex items-center gap-2"><Input aria-label={`Reviewed value for ${requirement.source_name} ${requirement.source_value}`} inputMode="decimal" min={requirement.minimum} max={requirement.maximum} value={current?.selected_value || ""} onChange={(event) => setRange(requirement, event.target.value)} /><span>{requirement.unit}</span></div></label>
            })}
          </div>
        </div>
      ) : null}

      <div className={`rounded-2xl border p-4 ${coverage?.ready ? "border-emerald-500/35 bg-emerald-500/10" : "border-destructive/35 bg-destructive/5"}`}>
        <div className="flex items-center gap-2 font-semibold">{coverage?.ready ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertOctagon className="h-5 w-5 text-destructive" />}{coverage?.ready ? "Inventory covers every exact event" : "Activation is blocked"}</div>
        {coverage?.blockers.length ? <ul className="mt-3 space-y-1 text-xs">{coverage.blockers.map((blocker) => <li key={`${blocker.code}-${blocker.compound}-${blocker.message}`}>• {blocker.message}</li>)}</ul> : null}
        {coverage?.required_by_compound.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{coverage.required_by_compound.map((row) => <div key={`${row.compound}-${row.unit}`} className="rounded-lg bg-background/80 p-2 text-xs"><strong>{row.compound}</strong><br />{row.required_amount} {row.unit} required · {row.available_amount} available · {row.remaining_amount} remaining</div>)}</div> : null}
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Inventory math only · medical safety status: {coverage?.medical_safety_status || "not_validated"}</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-muted/25 p-4 md:grid-cols-2">
        <label className="text-xs font-medium">Reviewer name<Input className="mt-1 bg-background" value={review.reviewer_name} onChange={(event) => setReview((current) => ({ ...current, reviewer_name: event.target.value }))} /></label>
        <label className="text-xs font-medium">Reviewer role<Input className="mt-1 bg-background" value={review.reviewer_role} onChange={(event) => setReview((current) => ({ ...current, reviewer_role: event.target.value }))} placeholder="e.g. licensed clinician" /></label>
        <label className="text-xs font-medium md:col-span-2">Review note<textarea className="mt-1 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={review.review_note} onChange={(event) => setReview((current) => ({ ...current, review_note: event.target.value }))} placeholder="Record the separate review basis; do not paste credentials or private records." /></label>
        <label className="flex items-start gap-2 text-xs md:col-span-2"><input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" checked={memberConfirmed} onChange={(event) => setMemberConfirmed(event.target.checked)} /><span>I confirm the inventory fields above match what is physically on hand.</span></label>
        <label className="flex items-start gap-2 text-xs md:col-span-2"><input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" checked={review.attested} onChange={(event) => setReview((current) => ({ ...current, attested: event.target.checked }))} /><span>I attest this records a separate human review of the existing source schedule. It is not an AI approval.</span></label>
      </div>
    </section>
  )
}
