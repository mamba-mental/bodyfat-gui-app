"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, Copy, FileText, History, RotateCcw, Save, ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { challengeApi } from "@/lib/challenge-api"
import type { ChallengeTemplate, ChallengeTemplateDefinition } from "@/types/challenge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TemplateEditor() {
  const [template, setTemplate] = React.useState<ChallengeTemplate | null>(null)
  const [draft, setDraft] = React.useState<ChallengeTemplateDefinition | null>(null)
  const [note, setNote] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  const load = React.useCallback(async () => {
    const templates = await challengeApi.templates()
    const selected = templates[0] || await challengeApi.importDefault()
    const full = await challengeApi.template(selected.id)
    setTemplate(full)
    setDraft(structuredClone(full.current_revision.structured_json))
  }, [])

  React.useEffect(() => {
    load().catch((error) => toast.error(error.message))
  }, [load])

  const updateDay = (index: number, field: string, value: string | null) => {
    setDraft((current) => {
      if (!current) return current
      const next = structuredClone(current)
      next.days[index] = { ...next.days[index], [field]: value }
      return next
    })
  }

  const updateNutrition = (field: string, value: string | number) => {
    setDraft((current) => current ? { ...current, nutrition: { ...current.nutrition, [field]: value } } : current)
  }

  const saveRevision = async () => {
    if (!template || !draft || !note.trim()) return toast.error("Add a short revision note")
    if (draft.days.length !== 14 || draft.days.some((day, index) => day.day_number !== index + 1)) {
      return toast.error("The template must retain exactly Days 1 through 14")
    }
    setBusy(true)
    try {
      await challengeApi.saveTemplateRevision(template.id, draft, note.trim())
      await load()
      setNote("")
      toast.success("Revision saved as draft. Activate it when review is complete.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revision save failed")
    } finally {
      setBusy(false)
    }
  }

  const setActive = async () => {
    if (!template) return
    setBusy(true)
    try {
      const updated = await challengeApi.setTemplateStatus(template.id, "active")
      setTemplate(updated)
      toast.success(`Template revision ${updated.current_revision.revision_number} activated`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Activation failed")
    } finally {
      setBusy(false)
    }
  }

  const restoreRevision = (revisionNumber: number) => {
    const revision = template?.revisions?.find((item) => item.revision_number === revisionNumber)
    if (!revision) return
    setDraft(structuredClone(revision.structured_json))
    setNote(`Restore revision ${revisionNumber} as a new revision`)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.info(`Revision ${revisionNumber} loaded into the editor. Save to create a new revision.`)
  }

  const duplicateCurrentRevision = () => {
    setDraft(structuredClone(template?.current_revision.structured_json || draft))
    setNote(`Duplicate revision ${template?.current_revision.revision_number || "current"} for editing`)
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.info("Current revision duplicated into an editable draft. Save to create a new immutable revision.")
  }

  if (!template || !draft) return <div className="p-8 text-sm text-muted-foreground">Loading Template Editor…</div>

  return (
    <main className="min-h-full bg-[#f8f6f0] p-4 text-[#1d2c22] md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/plans" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Back to Plans</Link>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#647068]">Editable source template</p>
            <h1 className="mt-1 font-serif text-4xl font-medium text-[#173c2a]">Two-Week Cut Template Editor</h1>
            <p className="mt-2 text-sm text-[#687169]">Every save creates a new revision. Existing challenges and reports keep their original snapshot.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${template.status === "active" ? "bg-[#e7f0df] text-[#37612f]" : "bg-[#fff0c9] text-[#795b15]"}`}>{template.status} · revision {template.current_revision.revision_number}</span>
            {template.status !== "active" && <Button onClick={setActive} disabled={busy} className="bg-[#173c2a] text-white"><CheckCircle2 className="mr-2 h-4 w-4" /> Activate revision</Button>}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
              <h2 className="font-serif text-xl text-[#173c2a]">Nutrition rules</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  ["calorie_rule", "Calorie rule"],
                  ["protein_rule", "Protein rule"],
                  ["fat_rule", "Fat rule"],
                  ["carbohydrate_rule", "Carbohydrate rule"],
                ].map(([field, label]) => (
                  <label key={field} className="text-xs font-semibold text-[#657067]">{label}<Input className="mt-1.5" value={String(draft.nutrition[field] ?? "")} onChange={(event) => updateNutrition(field, event.target.value)} /></label>
                ))}
                <label className="text-xs font-semibold text-[#657067]">Meals per day<Input className="mt-1.5" type="number" min={1} value={Number(draft.nutrition.meals_per_day ?? 4)} onChange={(event) => updateNutrition("meals_per_day", Number(event.target.value))} /></label>
              </div>
              <p className="mt-4 flex gap-2 rounded-lg bg-[#eef3ef] p-3 text-xs text-[#3c5948]"><ShieldAlert className="h-4 w-4 shrink-0" /> These are template rules. The final calories and protein shown to the user are recalculated from their current PRIME inputs.</p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#d7ddd4] bg-white">
              <div className="border-b border-[#e1e5df] p-5"><h2 className="font-serif text-xl text-[#173c2a]">Fourteen-day execution calendar</h2><p className="mt-1 text-xs text-[#6d756e]">Edit training, cardio, nutrition day type, and the key instruction. Day numbers cannot be removed or reordered.</p></div>
              <div className="divide-y divide-[#e5e9e3]">
                {draft.days.map((day, index) => (
                  <div key={day.day_number} className="grid gap-3 p-4 md:grid-cols-[56px_1fr_1fr_180px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf3ea] font-serif text-lg text-[#244b34]">{day.day_number}</div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#758077]">Training<Input className="mt-1.5 normal-case" value={day.training ?? ""} placeholder="Recovery day" onChange={(event) => updateDay(index, "training", event.target.value || null)} /></label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#758077]">Cardio / movement<Input className="mt-1.5 normal-case" value={day.cardio} onChange={(event) => updateDay(index, "cardio", event.target.value)} /></label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#758077]">Nutrition type<select className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm normal-case" value={day.nutrition_type} onChange={(event) => updateDay(index, "nutrition_type", event.target.value)}><option value="standard">Standard</option><option value="high_carb">High carb</option><option value="conditional_high_carb">Conditional high carb</option><option value="appearance_or_standard">Appearance or standard</option></select></label>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-[#758077] md:col-start-2 md:col-span-3">Key instruction<Input className="mt-1.5 normal-case" value={day.key_instruction} onChange={(event) => updateDay(index, "key_instruction", event.target.value)} /></label>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
              <label className="text-xs font-semibold text-[#657067]">Revision note<Input className="mt-1.5" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed and why?" /></label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={saveRevision} disabled={busy || !note.trim()}><Save className="mr-2 h-4 w-4" /> Save new revision</Button>
                <Button type="button" variant="outline" onClick={duplicateCurrentRevision}><Copy className="mr-2 h-4 w-4" /> Duplicate current revision</Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#647068]"><History className="h-4 w-4" /> Revision history</p>
              <div className="mt-4 space-y-3">
                {template.revisions?.map((revision) => (
                  <div key={revision.id} className={`rounded-xl border p-3 ${revision.id === template.current_revision_id ? "border-[#91aa91] bg-[#f0f5ed]" : "border-[#e0e4de]"}`}>
                    <div className="flex items-center justify-between"><strong className="text-sm">Revision {revision.revision_number}</strong>{revision.id === template.current_revision_id && <span className="text-[10px] font-bold uppercase text-[#37612f]">current</span>}</div>
                    <p className="mt-1 text-xs text-[#667067]">{revision.revision_note}</p>
                    {revision.created_at && <p className="mt-2 flex items-center gap-1 text-[10px] text-[#8a928b]"><Clock3 className="h-3 w-3" /> {new Date(revision.created_at).toLocaleString()}</p>}
                    <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 w-full justify-start px-2 text-xs" onClick={() => restoreRevision(revision.revision_number)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Load as new revision</Button>
                  </div>
                ))}
              </div>
            </section>
            <details className="rounded-2xl border border-[#d7ddd4] bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#647068]"><FileText className="h-4 w-4" /> Original source text</summary>
              <p className="mt-3 text-xs leading-relaxed text-[#6f7871]">Read-only provenance for the imported preliminary plan. Structured edits above are saved as new revisions.</p>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-[#f3f1e9] p-3 text-[10px] leading-relaxed text-[#3d4a40]">{template.current_revision.raw_source}</pre>
            </details>
            <section className="rounded-2xl bg-[#173c2a] p-5 text-[#edf4eb]"><h3 className="font-serif text-xl">Protected history</h3><p className="mt-2 text-xs leading-relaxed text-[#bed0c3]">Changing this template affects only newly generated plans. An active challenge changes only through a dated amendment and a new plan revision.</p></section>
          </aside>
        </div>
      </div>
    </main>
  )
}
