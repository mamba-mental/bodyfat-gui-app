import { describe, expect, it } from "vitest"

import {
  challengeEndDate,
  createDefaultPlanWizardDraft,
  parsePlanWizardDraft,
  serializePlanWizardDraft,
} from "@/lib/plan-wizard"

describe("guided Plans wizard state", () => {
  it("calculates an exact 14-day inclusive date range without UTC shifting", () => {
    expect(challengeEndDate("2026-08-11")).toBe("2026-08-24")
    expect(challengeEndDate("2026-12-25")).toBe("2027-01-07")
  })

  it("uses a plain first-run decision state", () => {
    const draft = createDefaultPlanWizardDraft(9)
    expect(draft).toMatchObject({
      planKind: null,
      standardWeeks: 15,
      challengeStep: 1,
      startWeek: 9,
    })
    expect(draft.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("restores safe setup choices and clamps final review to readiness", () => {
    const restored = parsePlanWizardDraft(
      JSON.stringify({
        planKind: "challenge",
        standardWeeks: 22,
        challengeStep: 5,
        startDate: "2026-08-15",
        startWeek: 10,
      }),
      [8, 9, 10],
      8,
    )

    expect(restored).toEqual({
      planKind: "challenge",
      standardWeeks: 22,
      challengeStep: 4,
      startDate: "2026-08-15",
      startWeek: 10,
    })
  })

  it("rejects malformed or unavailable persisted selections", () => {
    const restored = parsePlanWizardDraft(
      JSON.stringify({
        planKind: "other",
        standardWeeks: 99,
        challengeStep: 90,
        startDate: "08/11/2026",
        startWeek: 99,
      }),
      [7, 8],
      7,
    )

    expect(restored.planKind).toBeNull()
    expect(restored.standardWeeks).toBe(15)
    expect(restored.challengeStep).toBe(4)
    expect(restored.startWeek).toBe(7)
    expect(restored.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it("round-trips the browser-safe draft fields", () => {
    const draft = {
      ...createDefaultPlanWizardDraft(6),
      planKind: "standard" as const,
      standardWeeks: 12 as const,
      challengeStep: 3 as const,
      startDate: "2026-08-11",
    }

    expect(parsePlanWizardDraft(serializePlanWizardDraft(draft), [6, 7], 6)).toEqual(draft)
  })
})
