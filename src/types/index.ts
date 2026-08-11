// Core application types for Body Fat Estimator GUI

export interface UserData {
  // Personal Information
  name: string;
  age: number;
  gender: 'm' | 'f';
  height_feet: number;
  height_inches: number;
  height_cm: number;
  dob: string;

  // Current State
  current_weight: number; // lbs
  current_bf: number; // percentage

  // Goals
  goal_weight: number; // lbs
  goal_bf: number; // percentage
  start_date: string | null;
  end_date: string | null;

  // Activity & Training
  activity_level: number; // 1-5 scale
  resistance_training: boolean;
  is_athlete: boolean;
  workout_type: string; // "Bodybuilding", "Cardio", "General Fitness"
  workout_days: number; // per week
  job_activity: number; // 1-4 scale
  leisure_activity: number; // 1-4 scale
  program_reference?: ProgramReferenceSnapshot | null;
  current_program_id?: string | null; // ID of the current active program for tracking
  archived_programs?: ArchivedProgram[]; // List of archived programs for history


  // Advanced Training & Nutrition
  experience_level?: string;
  volume_score?: number;
  intensity_score?: number;
  frequency_score?: number;
  is_bodybuilder?: boolean;
  protein_intake?: number;
  diet_type?: string;
  eating_pattern?: string;
  eating_window_hours?: number;

  ped_use?: boolean;

  /**
   * PED (Performance-Enhancing Drug) stack — array of compounds the user is running.
   * Optional: old data without this field must still typecheck.
   * Empty array or undefined → engine falls back to the ped_use boolean path unchanged.
   * Contract: matches Python engine's `ped_stack` parameter exactly.
   */
  ped_stack?: { compound: string; dose_mg?: number; phase?: string }[];

  exercise_type?: string;
  sleep_quality?: string;
  // Body Measurements
  waist?: number; // inches
  hip?: number; // inches
  neck?: number; // inches

  // Goal type — drives which curve + floor + partitioning model the engine runs
  goal_type?: "cut" | "recomp" | "lean_gain" | "maintain"; // default "cut"

  // Configurable calorie floor (kcal/day). Default 1200. PSMF day floor = max(floor, protein_g*4+250)
  calorie_floor?: number; // default 1200

  // Calculated field
  timeline_weeks?: number;

  // Profile Images
  profile_picture?: string; // Base64 encoded image or URL
  profile_banner?: string; // Base64 encoded image or URL
}

export interface ProgramReferenceSnapshot {
  start_date: string;
  initial_weight: number;
  initial_bf: number;
}

// Program Archiving Types
export type ProgramStatus = 'active' | 'archived' | 'completed';

export interface ProgramSummary {
  /** Total weight change in lbs (negative = loss) */
  total_weight_change: number;
  /** Total body fat percentage change (negative = loss) */
  total_bf_change: number;
  /** Duration of program in days */
  duration_days: number;
  /** Average weekly weight loss/gain in lbs */
  average_weekly_loss: number;
  /** Number of entries recorded */
  entries_count: number;
  /** Best entry achieved during program */
  best_entry?: {
    date: string;
    weight: number;
    bf: number;
  };
  /** User notes added when archiving */
  notes?: string;
}

export interface ArchivedProgram {
  /** Unique identifier (e.g., "program-1699123456789") */
  id: string;
  /** User-editable name for the program */
  name: string;
  /** Program status */
  status: ProgramStatus;
  /** ISO date when program was created */
  created_at: string;
  /** ISO date when program was archived */
  archived_at?: string;
  /** Program start date (ISO) */
  start_date: string;
  /** Program end date (ISO, set when archived) */
  end_date?: string;
  /** Starting weight in lbs */
  initial_weight: number;
  /** Starting body fat percentage */
  initial_bf: number;
  /** Final weight captured when archived */
  final_weight?: number;
  /** Final body fat percentage captured when archived */
  final_bf?: number;
  /** Number of entries recorded during this program */
  entry_count: number;
  /** Summary statistics calculated on archive */
  summary?: ProgramSummary;
}

export interface WeeklyProgression {
  date: string; // MMDDYY format
  weight: number; // lbs
  body_fat_percentage: number; // percentage
  daily_calorie_intake: number; // calories — training-day headline (see weekly_average_calories for the blended avg)
  tdee: number; // Total Daily Energy Expenditure
  weekly_caloric_output: number; // deficit calories
  total_weight_lost: number; // cumulative lbs
  lean_mass: number; // lbs
  fat_mass: number; // lbs
  muscle_gain: number; // weekly lbs
  rmr: number; // Resting Metabolic Rate
  tef: number; // Thermic Effect of Food
  neat: number; // Non-Exercise Activity Thermogenesis

  // --- New fields from the upgraded calc engine (all optional for back-compat) ---
  week_number?: number; // 1-based week index
  training_calories?: number; // calories on resistance-training days
  rest_calories?: number; // calories on rest / low-activity days
  psmf_calories?: number; // Protein-Sparing Modified Fast day calories
  protein_g?: number; // daily protein in grams (scaled to lean mass)
  phase?: string; // diet phase label — RESET | ADAPT | CYCLE | PEAK
  weekly_average_calories?: number; // blended weekly mean across all day types
  calorie_floor?: number; // configurable calorie floor used for this week (default 1200)
  weekly_fat_loss_lb?: number; // estimated fat-only loss for the week (lbs)
  p_ratio?: number; // fat:lean partitioning ratio (Forbes / PED-adjusted); 0–1, fraction going to fat
  rmr_method?: string; // which RMR equation was used — e.g. "mifflin" | "ten_haaf" | "cunningham"
  below_rmr?: boolean; // true when intake drops below RMR (flagged as "by design" on PED protocols)
  feasibility?: "on_track" | "aggressive" | "ceiling_capped"; // plan pacing assessment
  /** Per-week TAPERING training-day intake from the phase-decay reference curve (RESET→ADAPT→CYCLE→PEAK).
   *  Additive display-only field added by the report generator (BUG #9/#12 fix).
   *  Falls back to daily_calorie_intake when absent (older engine output / gain-maintain mode). */
  reference_training_calories?: number;
}

export interface BodyFatEntry {
  id: string;
  date: Date | string;
  weight: number;
  body_fat_percentage?: number;
  notes?: string;
  photo?: string; // Base64-encoded progress photo (optional)
  user_id: string;
  program_id?: string; // Links entry to a specific program for tracking
  cycle_id?: string | null; // ReComp Cycle this entry belongs to (P3-P6)
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CalculationResult {
  user_data: UserData;
  progression: WeeklyProgression[];
  summary: {
    total_weight_loss: number;
    body_fat_reduction: number;
    muscle_gain: number;
    timeline_weeks: number;
  };
  confidence_score?: number;
  ai_analysis?: string;
}

export interface Report {
  id: string;
  user_id: string;
  title: string;
  generated_at: Date | string;
  entry_date?: string; // Date of the entry used for this report
  calculation_result?: CalculationResult;
  html_content?: string;
  pdf_path?: string;
  markdown_path?: string;
  html_path?: string;
  file_path?: string;
  file_base?: string;
  cycle_id?: string | null; // ReComp Cycle this report belongs to (P3/P4)
  source_fingerprint?: string | null; // P7 report-gating fingerprint of the source data
  report_type?: 'living' | 'two_week_cut' | string;
  report_mode?: 'progress' | 'final' | 'stopped_early' | string;
  plan_revision?: number;
  template_revision_id?: string;
  protocol_id?: string;
  protocol_version?: string;
  completion?: { days_logged: number; days_total: number };
  markdown_content?: string;
}

export interface AppState {
  current_user: UserData | null;
  program_reference: ProgramReferenceSnapshot | null;
  entries: BodyFatEntry[];

  reports: Report[];
  current_calculation: CalculationResult | null;
  loading: boolean;
  report_generation_status: string; // e.g., "Starting", "Calculating", "Calling Python", "Saving", "Complete"
  report_generation_entry_date: string | null; // Date of the entry used for the report
  error: string | null;
  /** Canonical-source reconciliation state. Null/undefined = no prompt pending. */
  cycle_sync?: CycleSyncState | null;
}

// ---------------------------------------------------------------------------
// Canonical-source reconciliation — profile vs active-cycle drift detection
// ---------------------------------------------------------------------------

/**
 * A single field where the user's profile snapshot and the active cycle
 * disagree. Both values are preserved so the user can choose either as the
 * canonical source in the selection matrix.
 */
export interface ProfileCycleDriftItem {
  /** Internal field identifier — used as the React key and for writes. */
  field: 'goal_weight' | 'goal_bf' | 'current_weight' | 'current_bf' | 'timeline_weeks'
  /** Human-readable label (PRIME is AuDHD — spell it out fully). */
  label: string
  /** The value currently stored in the user profile blob. */
  profileValue: number
  /** The value currently stored in the active cycle. */
  cycleValue: number
}

/**
 * Which source the user picked for a given field in the reconciler matrix.
 * Defaults to 'cycle' (cycle is the architectural source of truth), but the
 * user can override per field.
 */
export type DriftFieldSource = 'profile' | 'cycle'

/**
 * Per-field selection record built by the reconciler matrix before the user
 * clicks "Apply". Maps the drift item's `field` to the chosen source.
 */
export type DriftSelection = Partial<Record<ProfileCycleDriftItem['field'], DriftFieldSource>>

/**
 * Mode the reconciler is opened in:
 *  - 'drift'      — passive detection: profile and cycle drifted apart silently.
 *  - 'intentional'— the user just saved an Update Profile edit; offer to apply
 *                   the same changes to the active cycle.
 */
export type CycleSyncMode = 'drift' | 'intentional'

/** App-level state for the cycle-sync / drift-reconciler UI. */
export interface CycleSyncState {
  /** When non-empty, the reconciler should be shown to the user. */
  driftItems: ProfileCycleDriftItem[]
  /** The active cycle id the drift is against. */
  cycleId: string | null
  /** Whether this prompt was triggered by an intentional profile edit. */
  mode: CycleSyncMode
  /** Whether the user explicitly dismissed this reconciler instance. */
  dismissed: boolean
}

export type AppAction =
  | { type: 'SET_USER_DATA'; payload: UserData }
  | { type: 'SET_PROGRAM_REFERENCE'; payload: ProgramReferenceSnapshot | null }
  | { type: 'ADD_ENTRY'; payload: BodyFatEntry }
  | { type: 'SET_ENTRIES'; payload: BodyFatEntry[] }
  | { type: 'UPDATE_ENTRY'; payload: BodyFatEntry }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'SET_CALCULATION_RESULT'; payload: CalculationResult }
  | { type: 'ADD_REPORT'; payload: Report }
  | { type: 'SET_REPORTS'; payload: Report[] }
  | { type: 'DELETE_REPORT'; payload: string }
  | { type: 'SET_REPORT_GENERATION_STATUS'; payload: { status: string; entryDate?: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  // Program Archiving actions
  | { type: 'ARCHIVE_PROGRAM'; payload: ArchivedProgram }
  | { type: 'SET_ARCHIVED_PROGRAMS'; payload: ArchivedProgram[] }
  // Canonical-source reconciliation actions
  | { type: 'SET_CYCLE_SYNC_PROMPT'; payload: CycleSyncState }
  | { type: 'DISMISS_CYCLE_SYNC_PROMPT' };

// Form-specific types
export interface UserFormData extends Omit<UserData, 'height_cm'> {
  // For form handling - height_cm will be calculated
}

export interface EntryFormData {
  date: Date;
  weight: number;
  body_fat_percentage?: number;
  notes?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CalculationApiResponse extends ApiResponse<CalculationResult> { }

// Export AI types
export * from './ai'
