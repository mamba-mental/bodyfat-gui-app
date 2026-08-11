export const PLAN_WIZARD_STORAGE_KEY = "apexfit.plan-wizard.v1"

export type PlanKind = "standard" | "challenge" | null
export type StandardPlanWeeks = 12 | 15 | 22
export type ChallengePlanStep = 1 | 2 | 3 | 4 | 5

export interface PlanWizardDraft {
  planKind: PlanKind
  standardWeeks: StandardPlanWeeks
  challengeStep: ChallengePlanStep
  startDate: string
  startWeek: number
}

export const CHALLENGE_STEPS: ReadonlyArray<{
  id: ChallengePlanStep
  label: string
  shortLabel: string
}> = [
  { id: 1, label: "Basics", shortLabel: "Basics" },
  { id: 2, label: "Diet & Training", shortLabel: "Diet" },
  { id: 3, label: "PED Schedule", shortLabel: "PEDs" },
  { id: 4, label: "Readiness", shortLabel: "Ready" },
  { id: 5, label: "Review", shortLabel: "Review" },
]

export function todayLocalISO(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function addCalendarDays(dateOnly: string, days: number): string {
  const parts = dateOnly.split("-").map(Number)
  if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) return dateOnly
  const [year, month, day] = parts
  const local = new Date(year, month - 1, day)
  local.setDate(local.getDate() + days)
  return todayLocalISO(local)
}

export function challengeEndDate(startDate: string): string {
  return addCalendarDays(startDate, 13)
}

export function formatDateOnly(dateOnly?: string | null): string {
  if (!dateOnly) return "Not set"
  const parts = dateOnly.split("-").map(Number)
  if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) return dateOnly
  const [year, month, day] = parts
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

export function createDefaultPlanWizardDraft(startWeek = 1): PlanWizardDraft {
  return {
    planKind: null,
    standardWeeks: 15,
    challengeStep: 1,
    startDate: todayLocalISO(),
    startWeek,
  }
}

export function parsePlanWizardDraft(
  raw: string | null,
  availableStartWeeks: readonly number[],
  fallbackStartWeek: number,
): PlanWizardDraft {
  const fallback = createDefaultPlanWizardDraft(fallbackStartWeek)
  if (!raw) return fallback

  try {
    const value = JSON.parse(raw) as Partial<PlanWizardDraft>
    const planKind: PlanKind = value.planKind === "standard" || value.planKind === "challenge"
      ? value.planKind
      : null
    const standardWeeks: StandardPlanWeeks = value.standardWeeks === 12 || value.standardWeeks === 22
      ? value.standardWeeks
      : 15
    const requestedStep = typeof value.challengeStep === "number" ? value.challengeStep : 1
    // Exact previews and review evidence are not persisted in browser storage.
    // Resume at Readiness at the latest so canonical data can be rechecked.
    const challengeStep = Math.max(1, Math.min(4, Math.trunc(requestedStep))) as ChallengePlanStep
    const startDate = typeof value.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.startDate)
      ? value.startDate
      : fallback.startDate
    const startWeek = typeof value.startWeek === "number" && availableStartWeeks.includes(value.startWeek)
      ? value.startWeek
      : fallbackStartWeek

    return { planKind, standardWeeks, challengeStep, startDate, startWeek }
  } catch {
    return fallback
  }
}

export function serializePlanWizardDraft(draft: PlanWizardDraft): string {
  return JSON.stringify(draft)
}
