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
}

export interface ChallengePreview {
  template: ChallengeTemplate
  protocol_snapshot: ProtocolWindow
  calculation_snapshot: CalculationResult
  plan_snapshot: ChallengePlanSnapshot
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
