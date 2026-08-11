import type { CalculationResult, UserData } from "@/types"

export interface ChallengeTemplateDay {
  day_number: number
  training: string | null
  cardio: string
  nutrition_type: string
  key_instruction: string
  required_log_fields?: string[]
}

export interface ChallengeTemplateDefinition {
  schema_version: number
  duration_days: 14
  title: string
  status: string
  nutrition: Record<string, unknown>
  days: ChallengeTemplateDay[]
  measurements?: Record<string, unknown>
  adjustment?: Record<string, unknown>
  recovery?: Record<string, unknown>
  safety?: Record<string, unknown>
}

export interface ChallengeTemplateRevision {
  id: string
  template_id: string
  revision_number: number
  structured_json: ChallengeTemplateDefinition
  raw_source: string
  source_sha256: string
  validation_status: string
  revision_note: string
  created_at?: string
}

export interface ChallengeTemplate {
  id: string
  name: string
  duration_days: 14
  status: "draft" | "active" | "archived"
  current_revision_id: string
  current_revision: ChallengeTemplateRevision
  revisions?: ChallengeTemplateRevision[]
}

export interface ProtocolCatalog {
  protocol_id: string
  version: string
  source_sha256: string
  available_weeks: number[]
  available_start_weeks: number[]
  source_files: string[]
  anti_fabrication_note?: string
  weekly_timeline_note?: string
}

export interface ProtocolInjection {
  compound: string
  source_name: string
  source_value: string
}

export interface ProtocolDay {
  day_number: number
  weekday: string
  source_week: number
  phase: string
  injections: ProtocolInjection[]
  oral_and_daily_timing: Record<string, string>
  source: string
  inventory_schedule_events?: Array<{
    day_number: number
    date: string
    compound: string
    source_name: string
    timing: string
    source_value: string
    amount: string
    unit: string
    resolution: "exact_source_value" | "reviewed_range_selection"
    allocations: Array<{
      inventory_item_id: string
      label_name?: string
      expiration_date?: string
      amount: string
      unit: string
      inventory_units: string
    }>
  }>
}

export interface ProtocolWindow {
  protocol_id: string
  version: string
  source_sha256: string
  start_week: number
  end_week: number
  days: ProtocolDay[]
  ped_stack: Array<{ compound: string; source_name: string }>
  ped_stack_by_week: Record<string, Array<{
    compound: string
    source_name: string
    source_week: number
    phase?: string
    week_on: number
    source_values: string[]
    dose_mg?: number
    dose_range?: [number, number]
    dose_unit?: string
    dose_resolution: string
  }>>
  unresolved_dose_compounds: string[]
  member_confirmation_required: boolean
  clinical_review_status: string
}

export interface PedInventoryItemInput {
  user_id: string
  label_name: string
  canonical_compound: string
  formulation: "injectable" | "oral" | "other"
  strength_value: string
  strength_unit: "mg" | "mcg"
  available_units: string
  inventory_unit: "mL" | "tablet" | "capsule"
  expiration_date: string
  lot_reference?: string | null
  source_note?: string | null
  confirmed: boolean
  status: "active" | "depleted" | "archived"
}

export interface PedInventoryItem extends PedInventoryItemInput {
  id: string
  created_at: string
  updated_at: string
}

export interface PedRangeResolution {
  compound: string
  source_value: string
  selected_value: string
  unit: "mg" | "mcg"
}

export interface PedReviewEvidence {
  reviewer_name: string
  reviewer_role: string
  review_note: string
  attested: boolean
  recorded_at?: string | null
}

export interface PedInventoryBlocker {
  code: string
  severity: "critical" | "major" | "informational"
  message: string
  compound?: string
  source_value?: string
  day_number?: number
}

export interface PedInventoryCoverage {
  ready: boolean
  validation_status: string
  medical_safety_status: "not_validated"
  required_by_compound: Array<{
    compound: string
    required_amount: string
    available_amount: string
    remaining_amount: string
    shortage_amount: string
    unit: string
    event_count: number
  }>
  scheduled_events: Array<Record<string, unknown>>
  blockers: PedInventoryBlocker[]
  range_requirements: Array<{
    compound: string
    source_name: string
    source_value: string
    minimum: string
    maximum: string
    unit: "mg" | "mcg"
    occurrence_count: number
  }>
  unused_inventory: Array<Partial<PedInventoryItem>>
}

export interface ChallengePlanDay extends ChallengeTemplateDay {
  date: string
  nutrition_target: {
    calories: number
    protein_g: number
    carbs_g?: number | null
    source_week_number: number
    prime_phase?: string
  }
  protocol_schedule: ProtocolDay
}

export interface ChallengePlanSnapshot {
  title: string
  duration_days: 14
  start_date: string
  end_date: string
  template_revision_id: string
  template_revision_number: number
  protocol_id: string
  protocol_version: string
  protocol_source_sha256: string
  protocol_start_week: number
  protocol_end_week: number
  ped_stack: Array<{ compound: string; source_name: string }>
  days: ChallengePlanDay[]
  calculation_summary: CalculationResult["summary"]
  calculation_progression: CalculationResult["progression"]
  inventory_coverage?: PedInventoryCoverage
  member_inventory_confirmed?: boolean
  ped_review?: PedReviewEvidence | null
}

export interface ChallengePreview {
  template: ChallengeTemplate
  protocol_snapshot: ProtocolWindow
  calculation_snapshot: CalculationResult
  plan_snapshot: ChallengePlanSnapshot
  inventory_coverage: PedInventoryCoverage
  readiness: { ready: boolean; blockers: string[] }
}

export interface ChallengeDailyLog {
  id?: string
  cycle_id?: string
  day_number: number
  date: string
  plan_revision: number
  calories?: number | null
  protein_g?: number | null
  steps?: number | null
  training_completed: boolean
  cardio_completed: boolean
  sleep_hours?: number | null
  resting_hr?: number | null
  bp_systolic?: number | null
  bp_diastolic?: number | null
  waist?: number | null
  photo_refs_json?: string[] | null
  notes?: string | null
}

export interface ChallengeCycle {
  id: string
  name: string
  status: string
  start_date: string
  end_date: string
  plan_mode: "two_week_cut"
  timeline_days: 14
  current_plan_revision: number
  protocol_status: string
  safety_acknowledged_at?: string | null
  plan_snapshot_json: ChallengePlanSnapshot
  protocol_snapshot_json: ProtocolWindow
}

export interface ChallengePreviewInput {
  user_data: UserData
  template_id: string
  protocol_start_week: number
  start_date: string
  safety_acknowledged: boolean
  inventory_user_id: string
  inventory_required: boolean
  range_resolutions: PedRangeResolution[]
  member_inventory_confirmed: boolean
  review_evidence?: PedReviewEvidence
}

export interface ChallengeAmendmentInput {
  effective_day: number
  reason: string
  nutrition_calories?: number
  protein_g?: number
  training?: string
  cardio?: string
  key_instruction?: string
  safety_acknowledged: boolean
}
