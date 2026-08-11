"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  History,
  Loader2,
  LockKeyhole,
  Pencil,
  Save,
  ShieldCheck,
  Sparkles,
  Utensils,
} from "lucide-react"
import { toast } from "sonner"

import { useApp } from "@/contexts/app-context"
import { useCycles } from "@/hooks/use-cycles"
import { challengeApi } from "@/lib/challenge-api"
import {
  CHALLENGE_STEPS,
  PLAN_WIZARD_STORAGE_KEY,
  challengeEndDate,
  createDefaultPlanWizardDraft,
  formatDateOnly,
  parsePlanWizardDraft,
  serializePlanWizardDraft,
  type ChallengePlanStep,
  type PlanKind,
  type PlanWizardDraft,
  type StandardPlanWeeks,
} from "@/lib/plan-wizard"
import type { ChallengePreview, ChallengeTemplate, ProtocolCatalog, ProtocolWindow } from "@/types/challenge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProtocolScheduleCard } from "./protocol-schedule-card"
import { PlanPreviewPanel } from "./plan-preview-panel"
import { PedInventoryWorkspace, type PedInventoryActivationContext } from "./ped-inventory-workspace"

const EMPTY_INVENTORY_CONTEXT: PedInventoryActivationContext = {
  inventory_user_id: "default",
  inventory_required: true,
  range_resolutions: [],
  member_inventory_confirmed: false,
}

interface ReadinessItem {
  id: string
  label: string
  detail: string
  complete: boolean
  actionLabel?: string
  action?: () => void
}

function averageTargets(preview: ChallengePreview | null) {
  if (!preview?.plan_snapshot.days.length) return null
  const calories = Math.round(
    preview.plan_snapshot.days.reduce((sum, day) => sum + day.nutrition_target.calories, 0)
      / preview.plan_snapshot.days.length,
  )
  const protein = Math.round(preview.plan_snapshot.days[0]?.nutrition_target.protein_g || 0)
  return { calories, protein }
}

function planKindButtonClass(selected: boolean) {
  return [
    "w-full rounded-xl border p-5 text-left transition-colors duration-200",
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2",
    selected
      ? "border-primary bg-accent text-accent-foreground"
      : "border-border bg-card text-card-foreground hover:border-primary/60 hover:bg-accent/45",
  ].join(" ")
}

export function PlanStudio() {
  const router = useRouter()
  const { state, refreshWidgets } = useApp()
  const { active, cycles, loaded: cyclesLoaded } = useCycles()
  const user = state.current_user

  const [template, setTemplate] = React.useState<ChallengeTemplate | null>(null)
  const [catalog, setCatalog] = React.useState<ProtocolCatalog | null>(null)
  const [protocol, setProtocol] = React.useState<ProtocolWindow | null>(null)
  const [preview, setPreview] = React.useState<ChallengePreview | null>(null)
  const [draft, setDraft] = React.useState<PlanWizardDraft>(() => createDefaultPlanWizardDraft(1))
  const [maxVisitedStep, setMaxVisitedStep] = React.useState<ChallengePlanStep>(1)
  const [inventoryContext, setInventoryContext] = React.useState<PedInventoryActivationContext>(EMPTY_INVENTORY_CONTEXT)
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [hydrated, setHydrated] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [protocolLoading, setProtocolLoading] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [readinessError, setReadinessError] = React.useState<string | null>(null)
  const endDate = challengeEndDate(draft.startDate)
  const targets = averageTargets(preview)
  const historicalCycles = cycles.filter((cycle) => cycle.status !== "active")
  const currentIsChallenge = active?.plan_mode === "two_week_cut"
  const currentDestination = currentIsChallenge ? "/challenge" : "/"
  const activeDuration = currentIsChallenge
    ? "14 days"
    : active?.timeline_weeks
      ? `${active.timeline_weeks} weeks`
      : null

  React.useEffect(() => {
    if (state.loading) return
    let alive = true

    Promise.all([challengeApi.templates(), challengeApi.protocolCatalog()])
      .then(async ([templates, protocolCatalog]) => {
        const selectedTemplate = templates[0] || await challengeApi.importDefault()
        if (!alive) return

        const profileWeek = user?.start_date
          ? Math.max(1, Math.floor((Date.now() - new Date(`${user.start_date}T00:00:00`).getTime()) / 604_800_000) + 1)
          : protocolCatalog.available_start_weeks[0]
        const recommendedWeek = protocolCatalog.available_start_weeks.reduce((best, week) =>
          Math.abs(week - profileWeek) < Math.abs(best - profileWeek) ? week : best,
          protocolCatalog.available_start_weeks[0],
        )
        const restored = parsePlanWizardDraft(
          window.localStorage.getItem(PLAN_WIZARD_STORAGE_KEY),
          protocolCatalog.available_start_weeks,
          recommendedWeek,
        )

        setTemplate(selectedTemplate)
        setCatalog(protocolCatalog)
        setDraft(restored)
        setMaxVisitedStep(restored.challengeStep)
        setHydrated(true)
        return challengeApi.protocolWindow(restored.startWeek)
      })
      .then((window) => {
        if (alive && window) setProtocol(window)
      })
      .catch((error) => {
        if (!alive) return
        const message = error instanceof Error ? error.message : "Plans could not be loaded"
        setLoadError(message)
        toast.error(message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [state.loading, user?.start_date])

  React.useEffect(() => {
    if (!hydrated) return
    window.localStorage.setItem(PLAN_WIZARD_STORAGE_KEY, serializePlanWizardDraft(draft))
  }, [draft, hydrated])

  const updateDraft = React.useCallback((patch: Partial<PlanWizardDraft>) => {
    setDraft((current) => ({ ...current, ...patch }))
  }, [])

  const invalidatePreview = React.useCallback(() => {
    setPreview(null)
    setReadinessError(null)
  }, [])

  const updateInventoryContext = React.useCallback((context: PedInventoryActivationContext) => {
    setInventoryContext(context)
    invalidatePreview()
  }, [invalidatePreview])

  const choosePlanKind = (planKind: Exclude<PlanKind, null>) => {
    updateDraft({ planKind })
    if (planKind === "challenge") {
      setMaxVisitedStep((current) => Math.max(current, draft.challengeStep) as ChallengePlanStep)
    }
  }

  const chooseStandardWeeks = (standardWeeks: StandardPlanWeeks) => {
    updateDraft({ planKind: "standard", standardWeeks })
  }

  const chooseWeek = async (week: number) => {
    updateDraft({ startWeek: week })
    invalidatePreview()
    setProtocolLoading(true)
    try {
      setProtocol(await challengeApi.protocolWindow(week))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The selected source weeks could not be loaded")
    } finally {
      setProtocolLoading(false)
    }
  }

  const moveToStep = (step: ChallengePlanStep) => {
    if (step > maxVisitedStep) return
    updateDraft({ challengeStep: step })
    window.requestAnimationFrame(() => document.getElementById("plan-step-panel")?.focus())
  }

  const continueToStep = (step: ChallengePlanStep) => {
    setMaxVisitedStep((current) => Math.max(current, step) as ChallengePlanStep)
    updateDraft({ challengeStep: step })
    window.requestAnimationFrame(() => document.getElementById("plan-step-panel")?.focus())
  }

  const changeStartDate = (startDate: string) => {
    updateDraft({ startDate })
    invalidatePreview()
  }

  const saveAndExit = () => {
    window.localStorage.setItem(PLAN_WIZARD_STORAGE_KEY, serializePlanWizardDraft(draft))
    toast.success("Plan setup saved. You can continue from Plans whenever you are ready.")
    router.push("/")
  }

  const buildReadiness = async () => {
    if (!user || !template || !protocol) {
      toast.error("Complete your profile and source schedule before checking readiness.")
      return
    }
    setPreviewing(true)
    setReadinessError(null)
    try {
      let currentTemplate = template
      if (currentTemplate.status !== "active") {
        currentTemplate = await challengeApi.setTemplateStatus(currentTemplate.id, "active")
        setTemplate(currentTemplate)
        toast.success("Diet and training details saved for plan review.")
      }
      const result = await challengeApi.preview({
        user_data: user,
        template_id: currentTemplate.id,
        protocol_start_week: draft.startWeek,
        start_date: draft.startDate,
        safety_acknowledged: acknowledged,
        ...inventoryContext,
      })
      setPreview(result)
      if (result.readiness.ready) {
        setMaxVisitedStep(5)
        toast.success("Everything is ready. Review the exact plan before starting it.")
      } else {
        toast.error("The plan still needs attention. Use the checklist below to finish it.")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "The readiness check could not be completed"
      setReadinessError(message)
      toast.error(message)
    } finally {
      setPreviewing(false)
    }
  }

  const createChallenge = async () => {
    if (!user || !template || !preview?.readiness.ready) return
    setSaving(true)
    try {
      await challengeApi.create({
        user_data: user,
        template_id: template.id,
        protocol_start_week: draft.startWeek,
        start_date: draft.startDate,
        safety_acknowledged: acknowledged,
        ...inventoryContext,
        name: "Two-Week Emergency Cut",
        activate: true,
      })
      window.localStorage.removeItem(PLAN_WIZARD_STORAGE_KEY)
      refreshWidgets()
      toast.success("Your 14-day cut is active. The Command Center now uses this exact revision.")
      router.push("/challenge")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The 14-day cut could not be started")
    } finally {
      setSaving(false)
    }
  }

  const reviewEvidenceComplete = Boolean(
    inventoryContext.member_inventory_confirmed
      && inventoryContext.review_evidence?.reviewer_name?.trim()
      && inventoryContext.review_evidence?.reviewer_role?.trim()
      && inventoryContext.review_evidence?.review_note?.trim()
      && inventoryContext.review_evidence?.attested,
  )

  const readinessItems: ReadinessItem[] = [
    {
      id: "profile",
      label: "Starting profile and goals",
      detail: user ? "Current measurements and goals are available for the PRIME calculation." : "Complete your profile before building this plan.",
      complete: Boolean(user),
      actionLabel: "Open profile",
      action: () => router.push("/setup"),
    },
    {
      id: "template",
      label: "Diet and training details",
      detail: template?.status === "active"
        ? `Revision ${template.current_revision.revision_number} is ready.`
        : "The current draft will be saved as the active plan details during the readiness check.",
      complete: Boolean(template),
      actionLabel: "Review details",
      action: () => moveToStep(2),
    },
    {
      id: "protocol",
      label: "Two source-protocol weeks",
      detail: protocol?.days.length === 14
        ? `Source weeks ${protocol.start_week}–${protocol.end_week} provide all 14 dated events.`
        : "Choose two complete consecutive source weeks.",
      complete: protocol?.days.length === 14,
      actionLabel: "Choose schedule",
      action: () => moveToStep(3),
    },
    {
      id: "inventory",
      label: "Inventory confirmation and documented review",
      detail: reviewEvidenceComplete
        ? "Inventory fields and separate review evidence are complete. Exact coverage is confirmed by the preview API."
        : "Confirm the inventory on hand and complete the separate-review record.",
      complete: reviewEvidenceComplete,
      actionLabel: "Complete inventory review",
      action: () => moveToStep(3),
    },
    {
      id: "acknowledgement",
      label: "Safety and source acknowledgement",
      detail: acknowledged
        ? "You acknowledged that the app is tracking an existing source schedule rather than prescribing it."
        : "Read and accept the source-tracking acknowledgement below.",
      complete: acknowledged,
    },
    {
      id: "preview",
      label: "Exact PRIME preview",
      detail: preview?.readiness.ready
        ? "The calculation, template, source schedule, inventory coverage, and report snapshot agree."
        : "Run the readiness check to create the exact report-ready preview.",
      complete: Boolean(preview?.readiness.ready),
    },
  ]

  const trainingDays = template?.current_revision.structured_json.days.filter((day) => Boolean(day.training)).length || 0
  const cardioDays = template?.current_revision.structured_json.days.filter((day) => day.cardio && day.cardio !== "None").length || 0
  const nutritionTypes = template
    ? [...new Set(template.current_revision.structured_json.days.map((day) => day.nutrition_type))]
    : []

  if (loading || state.loading) {
    return (
      <main className="min-h-full bg-background p-4 md:p-8" aria-busy="true">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <div className="h-9 w-72 animate-pulse rounded-md bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
          <p className="text-sm text-muted-foreground">Loading your plans and setup choices…</p>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="min-h-full bg-background p-4 text-foreground md:p-8">
        <section className="mx-auto max-w-2xl rounded-xl border border-destructive/40 bg-card p-6">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h1 className="mt-4 text-2xl font-semibold">Plans could not be loaded</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>Try again</Button>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-full bg-background p-4 text-foreground md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] md:text-4xl">Start or change a plan</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Continue what is active, or build a new plan one decision at a time. You will review everything before it replaces your current plan.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card text-card-foreground" aria-labelledby="current-plan-heading">
          <div className="flex flex-col gap-5 p-5 sm:flex-row">
            <div className="min-w-0 flex-1">
              <p id="current-plan-heading" className="text-sm font-medium text-muted-foreground">Current plan</p>
              {cyclesLoaded && active ? (
                <>
                  <h2 className="mt-1 truncate text-xl font-semibold">{active.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Started {formatDateOnly(active.start_date)}{activeDuration ? ` · ${activeDuration}` : ""} · Active
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mt-1 text-xl font-semibold">No active plan</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose a standard or 14-day cut below when you are ready.</p>
                </>
              )}
            </div>
            {active ? (
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={currentDestination}>Continue current plan <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            ) : null}
          </div>

          {historicalCycles.length > 0 ? (
            <div className="border-t border-border px-5 py-3">
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 text-sm font-medium text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((current) => !current)}
              >
                <History className="h-4 w-4" /> {historyOpen ? "Hide" : "View"} plan history ({historicalCycles.length})
              </button>
              {historyOpen ? (
                <div className="divide-y divide-border border-t border-border" aria-label="Previous plans">
                  {historicalCycles.map((cycle) => (
                    <div key={cycle.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium">{cycle.name}</span>
                      <span className="text-muted-foreground">{formatDateOnly(cycle.start_date)} · {cycle.status}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="mt-8" aria-labelledby="plan-choice-heading">
          <h2 id="plan-choice-heading" className="text-xl font-semibold">What do you want to do?</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-xl border border-border bg-card p-1">
              <button
                type="button"
                aria-pressed={draft.planKind === "standard"}
                className={planKindButtonClass(draft.planKind === "standard")}
                onClick={() => choosePlanKind("standard")}
              >
                <span className="flex items-start gap-4">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
                    {draft.planKind === "standard" ? <Check className="h-4 w-4" /> : null}
                  </span>
                  <span>
                    <span className="block text-lg font-semibold">Start a standard cut</span>
                    <span className="mt-2 block max-w-xl text-sm leading-6 text-muted-foreground">
                      Build a 12-, 15-, or 22-week program from an editable copy of your current profile and goals.
                    </span>
                  </span>
                </span>
              </button>
              <div className="flex flex-wrap gap-2 px-5 pb-4 pt-2" aria-label="Standard cut duration">
                {([12, 15, 22] as const).map((weeks) => (
                  <button
                    key={weeks}
                    type="button"
                    className={`min-h-11 rounded-md border px-4 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                      draft.planKind === "standard" && draft.standardWeeks === weeks
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                    aria-pressed={draft.planKind === "standard" && draft.standardWeeks === weeks}
                    onClick={() => chooseStandardWeeks(weeks)}
                  >
                    {weeks} weeks
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-pressed={draft.planKind === "challenge"}
              className={planKindButtonClass(draft.planKind === "challenge")}
              onClick={() => choosePlanKind("challenge")}
            >
              <span className="flex items-start gap-4">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
                  {draft.planKind === "challenge" ? <Check className="h-4 w-4" /> : null}
                </span>
                <span>
                  <span className="block text-lg font-semibold">Start a 14-day cut</span>
                  <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                    Build the focused challenge with diet, training, a source-backed PED schedule, inventory review, and report setup.
                  </span>
                </span>
              </span>
            </button>
          </div>
        </section>

        {draft.planKind === "standard" ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-5" aria-labelledby="standard-plan-heading">
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex-1">
                <h2 id="standard-plan-heading" className="text-xl font-semibold">Start a {draft.standardWeeks}-week cut</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Your current profile will be copied into an editable review. Saving creates the new active cycle and baseline while preserving every prior entry and report.
                </p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={`/setup/custom?newProgram=true&weeks=${draft.standardWeeks}`}>
                  Review profile and start plan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        ) : null}

        {draft.planKind === "challenge" ? (
          <section className="mt-6" style={{ minWidth: 0 }} aria-labelledby="challenge-builder-heading">
            <h2 id="challenge-builder-heading" className="sr-only">14-day cut setup</h2>
            <nav
              className="overflow-x-auto rounded-xl border border-border bg-card"
              style={{ minWidth: 0, maxWidth: "100%", width: "100%" }}
              aria-label="14-day setup progress"
            >
              <ol
                className="grid"
                style={{ minWidth: "640px", gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
              >
                {CHALLENGE_STEPS.map((step) => {
                  const current = step.id === draft.challengeStep
                  const completed = step.id < draft.challengeStep
                  const reachable = step.id <= maxVisitedStep
                  return (
                    <li key={step.id} className="relative">
                      <button
                        type="button"
                        className={`flex min-h-[76px] w-full items-center gap-3 px-4 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50 ${
                          current ? "bg-accent text-accent-foreground" : reachable ? "hover:bg-muted" : "text-muted-foreground"
                        }`}
                        aria-current={current ? "step" : undefined}
                        aria-label={`${step.label}: ${current ? "current step" : completed ? "completed" : reachable ? "available" : "locked"}`}
                        disabled={!reachable}
                        onClick={() => moveToStep(step.id)}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                          current || completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                        }`}>
                          {completed ? <Check className="h-4 w-4" /> : step.id}
                        </span>
                        <span>
                          <span className="block text-xs text-muted-foreground">Step {step.id}</span>
                          <span className="block text-sm font-medium">{step.label}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </nav>

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <section
                  id="plan-step-panel"
                  tabIndex={-1}
                  className="rounded-xl border border-border bg-card p-5 outline-none md:p-6"
                  aria-live="polite"
                >
                  {draft.challengeStep === 1 ? (
                    <div>
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-1 h-5 w-5 text-primary" />
                        <div>
                          <h3 className="text-xl font-semibold">Basics</h3>
                          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Confirm the dates and the profile values that will anchor this 14-day plan.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium">
                          Start date
                          <Input className="mt-2" type="date" value={draft.startDate} onChange={(event) => changeStartDate(event.target.value)} />
                        </label>
                        <label className="text-sm font-medium">
                          End date
                          <Input className="mt-2" type="date" value={endDate} readOnly aria-readonly="true" />
                          <span className="mt-1 block text-xs text-muted-foreground">Calculated automatically as 14 calendar days.</span>
                        </label>
                      </div>

                      {user ? (
                        <div className="mt-6 border-y border-border">
                          <dl className="grid gap-x-6 md:grid-cols-2">
                            {[
                              ["Current weight", `${user.current_weight} lb`],
                              ["Current body fat", `${user.current_bf}%`],
                              ["Target weight", `${user.goal_weight} lb`],
                              ["Target body fat", `${user.goal_bf}%`],
                              ["Training frequency", `${user.workout_days} days per week`],
                              ["Activity level", `Level ${user.activity_level}`],
                            ].map(([label, value], index) => (
                              <div key={label} className={`flex items-center justify-between gap-4 py-3 text-sm ${index % 2 === 0 ? "md:pr-5" : "md:border-l md:border-border md:pl-5"}`}>
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="text-right font-medium">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ) : (
                        <div className="mt-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
                          Complete your profile before starting a 14-day cut.
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                        <Button asChild variant="outline"><Link href="/setup"><Pencil className="h-4 w-4" /> Update profile values</Link></Button>
                        <Button size="lg" disabled={!user || !draft.startDate} onClick={() => continueToStep(2)}>
                          Continue to diet and training <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {draft.challengeStep === 2 ? (
                    <div>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <Utensils className="mt-1 h-5 w-5 text-primary" />
                          <div>
                            <h3 className="text-xl font-semibold">Diet and training</h3>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                              Review the reusable 14-day structure. Editing creates a new version without changing earlier plans or reports.
                            </p>
                          </div>
                        </div>
                        <Button asChild variant="outline">
                          <Link href="/challenge/template"><Pencil className="h-4 w-4" /> Edit plan details</Link>
                        </Button>
                      </div>

                      {template ? (
                        <div className="mt-6">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                            <div>
                              <p className="font-semibold">{template.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">Revision {template.current_revision.revision_number} · {template.current_revision.validation_status}</p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${template.status === "active" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground"}`}>
                              {template.status === "active" ? "Plan details ready" : "Draft · saved at readiness"}
                            </span>
                          </div>
                          <dl className="divide-y divide-border text-sm">
                            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-muted-foreground">Calendar</dt><dd className="font-medium">14 configured days</dd></div>
                            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-muted-foreground">Training</dt><dd className="font-medium">{trainingDays} scheduled days</dd></div>
                            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-muted-foreground">Cardio and movement</dt><dd className="font-medium">{cardioDays} instructed days</dd></div>
                            <div className="flex items-start justify-between gap-4 py-4"><dt className="text-muted-foreground">Nutrition day types</dt><dd className="max-w-[70%] text-right font-medium">{nutritionTypes.join(" · ") || "Configured in template"}</dd></div>
                          </dl>
                          <p className="mt-4 rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
                            PRIME calculates the exact calorie and protein targets during Readiness. This template supplies the day structure, training, cardio, recovery, measurements, and safety instructions.
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" onClick={() => moveToStep(1)}><ArrowLeft className="h-4 w-4" /> Back to basics</Button>
                        <Button size="lg" disabled={!template} onClick={() => continueToStep(3)}>
                          Continue to PED schedule <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {draft.challengeStep === 3 ? (
                    <div>
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-1 h-5 w-5 text-primary" />
                        <div>
                          <h3 className="text-xl font-semibold">PED schedule and inventory</h3>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Select the two source weeks being tracked, then confirm that the exact scheduled events can be covered by what is physically on hand.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 block max-w-md text-sm font-medium">
                        Which two source weeks should be used?
                        <select
                          className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          value={draft.startWeek}
                          onChange={(event) => chooseWeek(Number(event.target.value))}
                        >
                          {catalog?.available_start_weeks.map((week) => <option key={week} value={week}>Source weeks {week}–{week + 1}</option>)}
                        </select>
                      </label>

                      {protocolLoading ? (
                        <div className="mt-5 flex min-h-32 items-center justify-center rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading the selected source schedule…
                        </div>
                      ) : (
                        <div className="mt-5"><ProtocolScheduleCard protocol={protocol} /></div>
                      )}

                    </div>
                  ) : null}

                  {draft.challengeStep === 4 ? (
                    <div>
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-1 h-5 w-5 text-primary" />
                        <div>
                          <h3 className="text-xl font-semibold">Readiness</h3>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                            Check every input against the authoritative APIs. Anything incomplete stays visible and blocks activation.
                          </p>
                        </div>
                      </div>

                      <label className="mt-6 flex min-h-11 items-start gap-3 rounded-lg border border-border bg-muted/35 p-4 text-sm">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-5 w-5 accent-primary"
                          checked={acknowledged}
                          onChange={(event) => {
                            setAcknowledged(event.target.checked)
                            invalidatePreview()
                          }}
                        />
                        <span>
                          <strong className="block">Safety and source acknowledgement</strong>
                          <span className="mt-1 block leading-5 text-muted-foreground">
                            I understand Apex Fit is tracking an existing source schedule, not prescribing or medically approving it, and that gaps or ranges remain unresolved unless separately reviewed.
                          </span>
                        </span>
                      </label>

                      <div className="mt-5 divide-y divide-border border-y border-border" aria-label="Plan readiness checklist">
                        {readinessItems.map((item) => (
                          <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              {item.complete
                                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Complete" />
                                : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-label="Action needed" />}
                              <div>
                                <p className="text-sm font-medium">{item.label}</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                              </div>
                            </div>
                            {!item.complete && item.action ? (
                              <Button variant="ghost" size="sm" onClick={item.action}>{item.actionLabel}</Button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {readinessError ? (
                        <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                          <p className="font-medium text-destructive">The readiness check found a blocker</p>
                          <p className="mt-1 leading-6 text-muted-foreground">{readinessError}</p>
                        </div>
                      ) : null}

                      {preview && !preview.readiness.ready ? (
                        <div className="mt-5 rounded-lg border border-warning/40 bg-warning/10 p-4">
                          <p className="font-medium text-warning-foreground">Action needed before review</p>
                          <ul className="mt-2 space-y-2 text-sm text-warning-foreground">
                            {preview.readiness.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" onClick={() => moveToStep(3)}><ArrowLeft className="h-4 w-4" /> Back to PED schedule</Button>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" onClick={buildReadiness} disabled={previewing || !user || !protocol}>
                            {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {previewing ? "Checking readiness…" : "Check readiness"}
                          </Button>
                          <Button size="lg" disabled={!preview?.readiness.ready} onClick={() => continueToStep(5)}>
                            Review my plan <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {draft.challengeStep === 5 ? (
                    <div>
                      <div className="flex items-start gap-3">
                        <FileText className="mt-1 h-5 w-5 text-primary" />
                        <div>
                          <h3 className="text-xl font-semibold">Review the exact plan</h3>
                          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                            This is the revision Apex Fit will freeze for the Command Center and every progress, final, or stopped-early report.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6"><PlanPreviewPanel preview={preview} loading={previewing} /></div>

                      {active ? (
                        <div className="mt-5 flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                          <p>Starting this 14-day cut will stop <strong>{active.name}</strong> and preserve it in plan history. Its entries and reports will not be deleted.</p>
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                        <Button variant="ghost" onClick={() => moveToStep(4)}><ArrowLeft className="h-4 w-4" /> Back to readiness</Button>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button variant="outline" onClick={saveAndExit}><Save className="h-4 w-4" /> Save and finish later</Button>
                          <Button size="lg" disabled={!preview?.readiness.ready || saving} onClick={createChallenge}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            {saving ? "Starting your cut…" : "Start 14-Day Cut"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {maxVisitedStep >= 3 ? (
                    <div className={draft.challengeStep === 3 ? "mt-5" : "hidden"} aria-hidden={draft.challengeStep !== 3}>
                      <PedInventoryWorkspace protocol={protocol} startDate={draft.startDate} onContextChange={updateInventoryContext} />
                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" onClick={() => moveToStep(2)}><ArrowLeft className="h-4 w-4" /> Back to diet and training</Button>
                        <Button size="lg" disabled={!protocol} onClick={() => continueToStep(4)}>
                          Continue to readiness <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </section>

                {draft.challengeStep !== 5 ? (
                  <div className="mt-3 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5" aria-live="polite"><CheckCircle2 className="h-3.5 w-3.5 text-info" /> Setup choices saved in this browser</span>
                    <button type="button" className="min-h-11 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" onClick={saveAndExit}>Save and finish later</button>
                  </div>
                ) : null}
              </div>

              <aside className="h-fit rounded-xl border border-border bg-card p-5 xl:sticky xl:top-6" aria-labelledby="plan-summary-heading">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="plan-summary-heading" className="font-semibold">14-Day Cut Summary</h3>
                  {preview?.readiness.ready ? (
                    <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Ready</span>
                  ) : (
                    <span className="rounded-full bg-info/15 px-2.5 py-1 text-xs font-medium text-info">In progress</span>
                  )}
                </div>
                <dl className="mt-4 divide-y divide-border text-sm">
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Current step</dt><dd className="text-right font-medium">{CHALLENGE_STEPS.find((step) => step.id === draft.challengeStep)?.label}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Start date</dt><dd className="text-right font-medium">{formatDateOnly(draft.startDate)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">End date</dt><dd className="text-right font-medium">{formatDateOnly(endDate)}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Duration</dt><dd className="text-right font-medium">14 days</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Profile</dt><dd className="text-right font-medium">{user ? `${user.current_weight} lb · ${user.current_bf}%` : "Needed"}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Diet and training</dt><dd className="text-right font-medium">{template ? `Revision ${template.current_revision.revision_number}` : "Loading"}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Source schedule</dt><dd className="text-right font-medium">{protocol ? `Weeks ${protocol.start_week}–${protocol.end_week}` : "Not selected"}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Inventory review</dt><dd className="text-right font-medium">{reviewEvidenceComplete ? "Complete" : "Action needed"}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Calories</dt><dd className="text-right font-medium">{targets ? `${targets.calories.toLocaleString()} average` : "Calculated at readiness"}</dd></div>
                  <div className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">Protein</dt><dd className="text-right font-medium">{targets ? `${targets.protein} g daily` : "Calculated at readiness"}</dd></div>
                </dl>
                <div className="mt-4 flex gap-2 rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>Reports use the frozen revision shown on the final Review step. Later template or inventory edits cannot silently rewrite it.</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" /> Safe setup choices are saved locally.
                </div>
              </aside>
            </div>
          </section>
        ) : null}

        {!draft.planKind ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Circle className="h-4 w-4" /> Choose a plan type above to see only the setup it needs.
          </p>
        ) : null}
      </div>
    </main>
  )
}
