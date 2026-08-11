export interface StandardProgramSeed {
  name?: string | null
  current_weight?: number | null
  current_bf?: number | null
  goal_weight?: number | null
  goal_bf?: number | null
  timeline_weeks?: number | null
}

export interface StandardProgramCycle {
  id: string
  name: string
  status: 'active'
  plan_mode: 'standard'
  start_date: string
  end_date: string
  start_weight: number | null
  start_bf: number | null
  goal_weight: number | null
  goal_bf: number | null
  timeline_weeks: number
  timeline_days: number
  weighin_days: number[]
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function addUtcDays(date: string, days: number): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Build the canonical ReComp cycle that must accompany a new standard program. */
export function buildStandardCycleForProgram(
  user: StandardProgramSeed,
  options: { id: string; startDate: string },
): StandardProgramCycle {
  const timelineWeeks = Number.isFinite(user.timeline_weeks) && Number(user.timeline_weeks) > 0
    ? Math.round(Number(user.timeline_weeks))
    : 16
  const displayName = user.name?.trim() || 'Recomp'

  return {
    id: options.id,
    name: `${displayName} — ${timelineWeeks}-Week Cut`,
    status: 'active',
    plan_mode: 'standard',
    start_date: options.startDate,
    end_date: addUtcDays(options.startDate, timelineWeeks * 7),
    start_weight: finiteOrNull(user.current_weight),
    start_bf: finiteOrNull(user.current_bf),
    goal_weight: finiteOrNull(user.goal_weight),
    goal_bf: finiteOrNull(user.goal_bf),
    timeline_weeks: timelineWeeks,
    timeline_days: timelineWeeks * 7,
    weighin_days: [],
  }
}
