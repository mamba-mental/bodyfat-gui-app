"use client"

/**
 * PED Stack Picker — controlled multi-row compound selector.
 *
 * Lets the user build their PED stack one compound at a time:
 *   compound (dropdown) + optional dose_mg (number) + optional phase (dropdown).
 *
 * Each compound carries an evidence-confidence badge so PRIME knows which
 * modifiers the engine treats as RCT-grade vs estimated. Sourcing reference:
 * docs/PED-MODIFIERS-SOURCING.md.
 *
 * Props:
 *   value    — current ped_stack[] (controlled)
 *   onChange — called with the new ped_stack[] on any change
 */

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { PlusCircle, Trash2 } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PedStackEntry {
  compound: string
  dose_mg?: number
  phase?: string
}

// Internal type that carries a stable identity key so React can track rows
// through deletions and reorderings without reusing stale DOM nodes.
// The _id is never surfaced to callers — it is stripped before onChange fires.
interface PedStackEntryInternal extends PedStackEntry {
  _id: string
}

// ─── Compound catalogue ───────────────────────────────────────────────────────

type ConfidenceTier =
  | "high"          // RCT-grade human data
  | "med-high"      // Multiple controlled human trials
  | "medium"        // Limited controlled or observational human studies
  | "low-med"       // Case series + some observational; mechanism well-characterised
  | "low"           // Mostly case reports / animal data / anecdote; estimated modifier

interface CompoundDef {
  value: string          // sent to engine
  label: string          // full spelled-out name (AuDHD-safe)
  abbreviation?: string  // shown alongside name in the dropdown
  confidence: ConfidenceTier
  tooltip: string        // explains the tier in plain language
}

const COMPOUNDS: CompoundDef[] = [
  {
    value: "testosterone",
    label: "Testosterone",
    confidence: "high",
    tooltip: "RCT-grade: multiple randomised controlled trials confirm dose-dependent anabolic and lipolytic effects in humans.",
  },
  {
    value: "anavar",
    label: "Anavar (Oxandrolone)",
    abbreviation: "Anavar / Oxandrolone",
    confidence: "med-high",
    tooltip: "Med-High: multiple controlled human trials show lean-mass retention and mild fat oxidation effects; less RCT depth than Testosterone.",
  },
  {
    value: "deca",
    label: "Deca (Nandrolone Decanoate)",
    abbreviation: "Deca / Nandrolone",
    confidence: "medium",
    tooltip: "Medium: limited controlled human studies; mechanism characterised via testosterone comparisons. Modifier is a reasoned estimate.",
  },
  {
    value: "clenbuterol",
    label: "Clenbuterol",
    confidence: "medium",
    tooltip: "Medium: human thermogenic effects observed in observational and case studies; dose-response less well-characterised than Testosterone.",
  },
  {
    value: "t3",
    label: "T3 (Liothyronine / Cytomel)",
    abbreviation: "T3 / Liothyronine",
    confidence: "medium",
    tooltip: "Medium: thyroid-axis mechanism clear; controlled data in euthyroid athletes limited. Modifier is an informed estimate.",
  },
  {
    value: "mk677",
    label: "MK-677 (Ibutamoren)",
    abbreviation: "MK-677 / Ibutamoren",
    confidence: "medium",
    tooltip: "Medium: human GH-secretagogue RCTs exist but focus on GH levels, not body-composition outcomes under a caloric deficit. Modifier is estimated.",
  },
  {
    value: "trenbolone",
    label: "Trenbolone (Trenbolone Acetate / Enanthate)",
    abbreviation: "Tren / Trenbolone",
    confidence: "low-med",
    tooltip: "Low-Med: extremely potent partitioning effects are well-documented in case series and veterinary data; controlled human RCTs are absent. Modifier is a characterised estimate.",
  },
  {
    value: "equipoise",
    label: "Equipoise (Boldenone Undecylenate)",
    abbreviation: "EQ / Boldenone",
    confidence: "low",
    tooltip: "Low — estimated, limited human data: primarily veterinary compound. Human body-composition RCTs do not exist. Modifier is estimated from anecdotal and mechanistic extrapolation.",
  },
  {
    value: "winstrol",
    label: "Winstrol (Stanozolol)",
    abbreviation: "Winny / Stanozolol",
    confidence: "low",
    tooltip: "Low — estimated, limited human data: some clinical use (anaemia / hereditary angioedema) but controlled body-composition trials in athletes are absent. Modifier is estimated.",
  },
  {
    value: "superdrol",
    label: "Superdrol (Methasterone)",
    abbreviation: "Superdrol / Methasterone",
    confidence: "low",
    tooltip: "Low — estimated, limited human data: no meaningful controlled human trials. Modifier is extrapolated from related methylated oral androgenic steroids.",
  },
  {
    value: "proviron",
    label: "Proviron (Mesterolone)",
    abbreviation: "Proviron / Mesterolone",
    confidence: "low",
    tooltip: "Low — estimated, limited human data: weak androgen / anti-oestrogen adjunct. Body-composition RCTs absent. Modifier is largely mechanistic / anecdotal.",
  },
]

// ─── Phase options ────────────────────────────────────────────────────────────

const PHASE_OPTIONS = [
  { value: "RESET",  label: "RESET  — metabolic reset / diet break" },
  { value: "ADAPT",  label: "ADAPT  — progressive deficit ramp-up" },
  { value: "CYCLE",  label: "CYCLE  — active cut / main protocol" },
  { value: "PEAK",   label: "PEAK   — competition / final shred" },
]

// ─── Badge helpers ────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<ConfidenceTier, string> = {
  "high":    "bg-emerald-100 text-emerald-800 border-emerald-200",
  "med-high":"bg-green-100 text-green-800 border-green-200",
  "medium":  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "low-med": "bg-orange-100 text-orange-800 border-orange-200",
  "low":     "bg-slate-100 text-slate-600 border-slate-200",
}

const BADGE_LABELS: Record<ConfidenceTier, string> = {
  "high":    "RCT",
  "med-high":"Strong",
  "medium":  "Moderate",
  "low-med": "Limited",
  "low":     "Estimated",
}

function ConfidenceBadge({ confidence, tooltip }: { confidence: ConfidenceTier; tooltip: string }) {
  return (
    <span
      title={tooltip}
      aria-label={`Evidence confidence: ${BADGE_LABELS[confidence]}. ${tooltip}`}
      className={`
        inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border
        cursor-help select-none shrink-0
        ${BADGE_STYLES[confidence]}
      `}
    >
      {BADGE_LABELS[confidence]}
    </span>
  )
}

// ─── Single row ───────────────────────────────────────────────────────────────

function PedRow({
  entry,
  index,
  onChange,
  onRemove,
}: {
  entry: PedStackEntryInternal
  index: number
  onChange: (updated: PedStackEntryInternal) => void
  onRemove: () => void
}) {
  const def = COMPOUNDS.find((c) => c.value === entry.compound)

  return (
    <div className="flex flex-wrap items-start gap-3 p-3 rounded-lg border bg-muted/30">
      {/* Compound selector */}
      <div className="flex-1 min-w-[200px] space-y-1">
        <Label className="text-xs text-muted-foreground" htmlFor={`ped-compound-${index}`}>
          Compound
        </Label>
        <Select
          value={entry.compound}
          onValueChange={(v) => onChange({ ...entry, compound: v })}
        >
          <SelectTrigger id={`ped-compound-${index}`} className="h-8 text-sm">
            <SelectValue placeholder="Select compound…" />
          </SelectTrigger>
          <SelectContent>
            {COMPOUNDS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <div className="flex items-center gap-2">
                  <span>{c.label}</span>
                  <ConfidenceBadge confidence={c.confidence} tooltip={c.tooltip} />
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Show badge inline under the selected compound for visibility */}
        {def && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <ConfidenceBadge confidence={def.confidence} tooltip={def.tooltip} />
            <span className="text-[10px] text-muted-foreground leading-tight">{def.tooltip}</span>
          </div>
        )}
      </div>

      {/* Dose */}
      <div className="w-28 space-y-1">
        <Label className="text-xs text-muted-foreground" htmlFor={`ped-dose-${index}`}>
          Dose (mg)
        </Label>
        <Input
          id={`ped-dose-${index}`}
          type="number"
          min={0}
          step={5}
          placeholder="Optional"
          className="h-8 text-sm"
          value={entry.dose_mg ?? ""}
          onChange={(e) => {
            const raw = e.target.value
            onChange({
              ...entry,
              dose_mg: raw === "" ? undefined : parseFloat(raw),
            })
          }}
        />
      </div>

      {/* Phase */}
      <div className="w-48 space-y-1">
        <Label className="text-xs text-muted-foreground" htmlFor={`ped-phase-${index}`}>
          Phase (optional)
        </Label>
        <Select
          value={entry.phase ?? "any"}
          onValueChange={(v) => onChange({ ...entry, phase: v === "any" ? undefined : v })}
        >
          <SelectTrigger id={`ped-phase-${index}`} className="h-8 text-sm">
            <SelectValue placeholder="Any phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any phase</SelectItem>
            {PHASE_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Remove */}
      <div className="flex items-end pb-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          aria-label={`Remove ${entry.compound || "compound"} row`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PedStackPickerProps {
  value: PedStackEntry[]
  onChange: (updated: PedStackEntry[]) => void
}

/** Attach stable _id to external entries on the way in (idempotent). */
function toInternal(entries: PedStackEntry[]): PedStackEntryInternal[] {
  return entries.map((e) =>
    "_id" in e
      ? (e as PedStackEntryInternal)
      : { ...e, _id: crypto.randomUUID() }
  )
}

/** Strip internal _id before surfacing to the caller. */
function toExternal(entries: PedStackEntryInternal[]): PedStackEntry[] {
  return entries.map(({ _id: _dropped, ...rest }) => rest)
}

export function PedStackPicker({ value, onChange }: PedStackPickerProps) {
  // Maintain internal rows with stable ids. Seed from the controlled value
  // but keep internal ids stable across re-renders driven by parent state.
  const [internalRows, setInternalRows] = React.useState<PedStackEntryInternal[]>(() =>
    toInternal(value)
  )

  // When the controlled value changes from outside (e.g. form reset), re-seed.
  // We compare by length + compound names to avoid infinite loops.
  const prevValueRef = React.useRef(value)
  React.useEffect(() => {
    const prev = prevValueRef.current
    const changed =
      prev.length !== value.length ||
      prev.some((e, i) => e.compound !== value[i]?.compound)
    if (changed) {
      setInternalRows(toInternal(value))
      prevValueRef.current = value
    }
  }, [value])

  const emit = (rows: PedStackEntryInternal[]) => {
    setInternalRows(rows)
    onChange(toExternal(rows))
  }

  const addRow = () => {
    emit([...internalRows, { compound: "", _id: crypto.randomUUID() }])
  }

  const updateRow = (index: number, updated: PedStackEntryInternal) => {
    emit(internalRows.map((row, i) => (i === index ? updated : row)))
  }

  const removeRow = (index: number) => {
    emit(internalRows.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground items-center">
        <span className="font-medium">Evidence badge key:</span>
        {(["high", "med-high", "medium", "low-med", "low"] as ConfidenceTier[]).map((tier) => (
          <span key={tier} className="flex items-center gap-1">
            <ConfidenceBadge confidence={tier} tooltip="" />
          </span>
        ))}
        <span>— hover any badge for details</span>
      </div>

      {/* Rows */}
      {internalRows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No compounds added yet. Click &ldquo;Add Compound&rdquo; to start building your stack.
        </p>
      ) : (
        <div className="space-y-2">
          {internalRows.map((entry, i) => (
            <PedRow
              key={entry._id}
              index={i}
              entry={entry}
              onChange={(updated) => updateRow(i, updated)}
              onRemove={() => removeRow(i)}
            />
          ))}
        </div>
      )}

      {/* Add row */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="gap-1.5"
      >
        <PlusCircle className="h-4 w-4" />
        Add Compound
      </Button>

      {/* Sourcing note */}
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Evidence tiers reflect peer-reviewed human body-composition data availability as of the build
        date. &ldquo;Estimated&rdquo; modifiers are mechanistically derived — they are not zero, but
        they carry wider confidence intervals than RCT-grade values. See{" "}
        <code className="text-[10px] bg-muted px-0.5 rounded">docs/PED-MODIFIERS-SOURCING.md</code>{" "}
        for compound-level citations.
      </p>
    </div>
  )
}
