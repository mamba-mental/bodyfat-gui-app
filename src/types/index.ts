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
  start_date: string;
  end_date: string;

  // Activity & Training
  activity_level: number; // 1-5 scale
  resistance_training: boolean;
  is_athlete: boolean;
  workout_type: string; // "Bodybuilding", "Cardio", "General Fitness"
  workout_days: number; // per week
  job_activity: number; // 1-4 scale
  leisure_activity: number; // 1-4 scale
  experience_level: string;
  volume_score: number;
  intensity_score: number;
  frequency_score: number;
  is_bodybuilder: boolean;

  // Nutrition
  protein_intake: number; // grams
  diet_type: string; // "keto", "high_protein", "balanced", "high_carb"

  // Advanced Options
  ped_use: boolean;
  exercise_type: string; // "resistance", "cardio", "hiit"
  sleep_quality: string; // "good", "poor"
  
  // Body Measurements
  waist?: number; // inches
  hip?: number; // inches
  neck?: number; // inches
  
  // Calculated field
  timeline_weeks?: number;
  
  // Profile Images
  profile_picture?: string; // Base64 encoded image or URL
  profile_banner?: string; // Base64 encoded image or URL
}

export interface WeeklyProgression {
  date: string; // MMDDYY format
  weight: number; // lbs
  body_fat_percentage: number; // percentage
  daily_calorie_intake: number; // calories
  tdee: number; // Total Daily Energy Expenditure
  weekly_caloric_output: number; // deficit calories
  total_weight_lost: number; // cumulative lbs
  lean_mass: number; // lbs
  fat_mass: number; // lbs
  muscle_gain: number; // weekly lbs
  rmr: number; // Resting Metabolic Rate
  tef: number; // Thermic Effect of Food
  neat: number; // Non-Exercise Activity Thermogenesis
}

export interface BodyFatEntry {
  id: string;
  date: Date | string;
  weight: number;
  body_fat_percentage?: number;
  notes?: string;
  user_id: string;
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
  calculation_result?: CalculationResult;
  html_content?: string;
  pdf_path?: string;
  markdown_path?: string;
  html_path?: string;
  file_path?: string;
  file_base?: string;
}

export interface AppState {
  current_user: UserData | null;
  entries: BodyFatEntry[];
  reports: Report[];
  current_calculation: CalculationResult | null;
  loading: boolean;
  report_generation_status: string; // e.g., "Starting", "Calculating", "Calling Python", "Saving", "Complete"
  report_generation_entry_date: string | null; // Date of the entry used for the report
  error: string | null;
}

export type AppAction =
  | { type: 'SET_USER_DATA'; payload: UserData }
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
  | { type: 'CLEAR_ERROR' };

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

export interface CalculationApiResponse extends ApiResponse<CalculationResult> {}

// Export AI types
export * from './ai'
