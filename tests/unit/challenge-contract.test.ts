import { describe, expect, it } from 'vitest'

import fixture from '@/../tests/contracts/challenge-plan-contract.fixture.json'
import type { ChallengeAmendmentInput } from '@/types/challenge'

describe('shared standard and two-week plan contract fixture', () => {
  it('keeps standard plans week-based and the challenge exactly fourteen days', () => {
    expect(fixture.standard_plan).toMatchObject({ plan_mode: 'standard', timeline_weeks: 15 })
    expect(fixture.two_week_plan).toMatchObject({ plan_mode: 'two_week_cut', timeline_days: 14, timeline_weeks: 2 })
    expect(fixture.template_revision).toMatchObject({ revision_number: 2, duration_days: 14, validation_status: 'reviewed' })
  })

  it('matches the frontend amendment input contract', () => {
    const amendment: ChallengeAmendmentInput = fixture.amendment
    expect(amendment.effective_day).toBe(8)
    expect(amendment.safety_acknowledged).toBe(true)
  })
})
