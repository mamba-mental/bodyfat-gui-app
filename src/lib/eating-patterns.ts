const PATTERN_TO_WINDOW: Record<string, number> = {
  standard: 12,
  none: 12,
  "16_8": 8,
  intermittent_fasting: 8,
  omad: 1,
}

export type EatingPattern = keyof typeof PATTERN_TO_WINDOW | string

export function getEatingWindowHours(pattern?: string | null): number {
  if (!pattern) {
    return 12
  }
  return PATTERN_TO_WINDOW[pattern] ?? 12
}

export function getEatingPatternOptions() {
  return [
    { value: "standard", label: "Standard (3+ meals)", windowHours: 12 },
    { value: "intermittent_fasting", label: "Intermittent Fasting (16:8)", windowHours: 8 },
    { value: "omad", label: "One Meal A Day (OMAD)", windowHours: 1 },
  ]
}
