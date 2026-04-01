/**
 * Profile templates for the onboarding wizard.
 * Selecting a template pre-fills Steps 2-5 with sensible defaults
 * so the user only needs to enter personal info in Step 1.
 */

export interface ProfileTemplate {
  id: string
  name: string
  description: string
  /** Tailwind border/ring color class */
  colorClass: string
  /** Tailwind bg gradient classes */
  bgClass: string
  /** Tailwind text color class for the label */
  textClass: string
  /** Lucide icon name hint (rendered in the wizard) */
  icon: "dumbbell" | "heart-pulse" | "trophy"
  /** Pre-filled defaults for steps 2-5 */
  defaults: ProfileDefaults
}

export interface ProfileDefaults {
  // Step 2 — Body Measurements (only goal-adjacent; height/weight are personal)
  current_bf: string

  // Step 3 — Goals
  goal_weight: string
  goal_bf: string
  timeline_weeks: string

  // Step 4 — Activity & Training
  activity_level: string
  workout_type: string
  workout_days: string
  resistance_training: boolean
  exercise_type: string
  experience_level: string
  is_athlete: boolean
  is_bodybuilder: boolean
  job_activity: string
  leisure_activity: string
  volume_score: string
  intensity_score: string
  frequency_score: string
  ped_use: boolean

  // Step 5 — Diet & Lifestyle
  diet_type: string
  eating_pattern: string
  protein_intake: string
  sleep_quality: string
}

export const profileTemplates: ProfileTemplate[] = [
  {
    id: "bodybuilder-cutting",
    name: "Bodybuilder Cutting",
    description: "Aggressive cut for experienced lifters. High protein, resistance-focused, 12-week timeline.",
    colorClass: "border-blue-500 ring-blue-500",
    bgClass: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40",
    textClass: "text-blue-700 dark:text-blue-300",
    icon: "dumbbell",
    defaults: {
      current_bf: "25",
      goal_weight: "200",
      goal_bf: "12",
      timeline_weeks: "12",
      activity_level: "4",
      workout_type: "Bodybuilding",
      workout_days: "5",
      resistance_training: true,
      exercise_type: "resistance",
      experience_level: "Advanced",
      is_athlete: true,
      is_bodybuilder: true,
      job_activity: "1",
      leisure_activity: "2",
      volume_score: "8",
      intensity_score: "9",
      frequency_score: "5",
      ped_use: false,
      diet_type: "high_protein",
      eating_pattern: "standard",
      protein_intake: "220",
      sleep_quality: "good",
    },
  },
  {
    id: "general-weight-loss",
    name: "General Weight Loss",
    description: "Steady, sustainable fat loss for beginners. Balanced diet, moderate activity, 16-week plan.",
    colorClass: "border-emerald-500 ring-emerald-500",
    bgClass: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
    icon: "heart-pulse",
    defaults: {
      current_bf: "30",
      goal_weight: "180",
      goal_bf: "20",
      timeline_weeks: "16",
      activity_level: "2",
      workout_type: "Cardio Only",
      workout_days: "3",
      resistance_training: false,
      exercise_type: "cardio",
      experience_level: "Beginner",
      is_athlete: false,
      is_bodybuilder: false,
      job_activity: "1",
      leisure_activity: "2",
      volume_score: "4",
      intensity_score: "4",
      frequency_score: "3",
      ped_use: false,
      diet_type: "balanced",
      eating_pattern: "standard",
      protein_intake: "150",
      sleep_quality: "good",
    },
  },
  {
    id: "athletic-recomp",
    name: "Athletic Recomp",
    description: "Body recomposition for active athletes. Build muscle while losing fat over 20 weeks.",
    colorClass: "border-orange-500 ring-orange-500",
    bgClass: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40",
    textClass: "text-orange-700 dark:text-orange-300",
    icon: "trophy",
    defaults: {
      current_bf: "22",
      goal_weight: "190",
      goal_bf: "15",
      timeline_weeks: "20",
      activity_level: "4",
      workout_type: "CrossFit",
      workout_days: "5",
      resistance_training: true,
      exercise_type: "mixed",
      experience_level: "Intermediate",
      is_athlete: true,
      is_bodybuilder: false,
      job_activity: "2",
      leisure_activity: "3",
      volume_score: "7",
      intensity_score: "7",
      frequency_score: "5",
      ped_use: false,
      diet_type: "high_protein",
      eating_pattern: "intermittent_fasting",
      protein_intake: "200",
      sleep_quality: "good",
    },
  },
]
