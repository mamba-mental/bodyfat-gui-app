"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PedInventoryItem, PedInventoryItemInput } from "@/types/challenge"

const SOURCE_COMPOUNDS = [
  "testosterone",
  "equipoise",
  "deca",
  "trenbolone",
  "t3",
  "clenbuterol",
  "proviron",
  "superdrol",
  "anavar",
  "mk677",
  "winstrol",
]

function blankItem(compounds: string[]): PedInventoryItemInput {
  return {
    user_id: "default",
    label_name: "",
    canonical_compound: compounds[0] || SOURCE_COMPOUNDS[0],
    formulation: "injectable",
    strength_value: "",
    strength_unit: "mg",
    available_units: "",
    inventory_unit: "mL",
    expiration_date: "",
    lot_reference: "",
    source_note: "",
    confirmed: false,
    status: "active",
  }
}

export function PedInventoryForm({
  compounds,
  editing,
  saving,
  onSave,
  onCancel,
}: {
  compounds: string[]
  editing: PedInventoryItem | null
  saving: boolean
  onSave: (values: PedInventoryItemInput) => Promise<void>
  onCancel: () => void
}) {
  const options = [...new Set([...compounds, ...SOURCE_COMPOUNDS])]
  const [values, setValues] = React.useState<PedInventoryItemInput>(() => blankItem(options))

  React.useEffect(() => {
    setValues(editing ? {
      user_id: editing.user_id,
      label_name: editing.label_name,
      canonical_compound: editing.canonical_compound,
      formulation: editing.formulation,
      strength_value: String(editing.strength_value),
      strength_unit: editing.strength_unit,
      available_units: String(editing.available_units),
      inventory_unit: editing.inventory_unit,
      expiration_date: editing.expiration_date,
      lot_reference: editing.lot_reference || "",
      source_note: editing.source_note || "",
      confirmed: editing.confirmed,
      status: editing.status,
    } : blankItem(options))
  }, [editing])

  const set = <K extends keyof PedInventoryItemInput>(key: K, value: PedInventoryItemInput[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border bg-muted/25 p-4 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault()
        await onSave(values)
        if (!editing) setValues(blankItem(options))
      }}
    >
      <label className="text-xs font-medium text-muted-foreground md:col-span-2">
        Label name
        <Input className="mt-1 bg-background" required value={values.label_name} onChange={(event) => set("label_name", event.target.value)} placeholder="Exactly as shown on the container" />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Confirmed compound
        <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={values.canonical_compound} onChange={(event) => set("canonical_compound", event.target.value)}>
          {options.map((compound) => <option key={compound} value={compound}>{compound}</option>)}
        </select>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Form
        <select className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={values.formulation} onChange={(event) => set("formulation", event.target.value as PedInventoryItemInput["formulation"])}>
          <option value="injectable">Injectable</option><option value="oral">Oral</option><option value="other">Other</option>
        </select>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Amount per inventory unit
        <div className="mt-1 flex gap-2"><Input required inputMode="decimal" value={values.strength_value} onChange={(event) => set("strength_value", event.target.value)} placeholder="250" /><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={values.strength_unit} onChange={(event) => set("strength_unit", event.target.value as "mg" | "mcg")}><option value="mg">mg</option><option value="mcg">mcg</option></select></div>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Units physically on hand
        <div className="mt-1 flex gap-2"><Input required inputMode="decimal" value={values.available_units} onChange={(event) => set("available_units", event.target.value)} placeholder="10" /><select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={values.inventory_unit} onChange={(event) => set("inventory_unit", event.target.value as PedInventoryItemInput["inventory_unit"])}><option value="mL">mL</option><option value="tablet">tablets</option><option value="capsule">capsules</option></select></div>
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Expiration date
        <Input className="mt-1 bg-background" required type="date" value={values.expiration_date} onChange={(event) => set("expiration_date", event.target.value)} />
      </label>
      <label className="text-xs font-medium text-muted-foreground">
        Lot or source reference (optional)
        <Input className="mt-1 bg-background" value={values.lot_reference || ""} onChange={(event) => set("lot_reference", event.target.value)} />
      </label>
      <label className="flex items-start gap-2 text-xs md:col-span-2">
        <input className="mt-0.5 h-4 w-4 accent-primary" type="checkbox" checked={values.confirmed} onChange={(event) => set("confirmed", event.target.checked)} />
        <span>I checked the label, form, amount per unit, physical quantity, and expiration. Unconfirmed items cannot be allocated.</span>
      </label>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={saving || !values.confirmed}>{editing ? "Save changes" : "Add confirmed item"}</Button>
        {editing && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  )
}
