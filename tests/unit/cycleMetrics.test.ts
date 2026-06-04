import { describe, expect, it } from 'vitest';
import { activeCycleMetrics, cycleScopedCalcUser } from '@/lib/cycleMetrics';
import type { Cycle } from '@/hooks/use-cycles';

/**
 * F3+F5 — Dashboard + current-weight scoped to the active cycle (single source).
 *
 * BDD:
 *   Feature: The dashboard reads one source of truth — the active cycle
 *     Scenario: Current weight is the active cycle's latest weigh-in
 *       Given an active cycle "PRIME.TIME-06.2026" starting at 266.8 lb
 *       And a weigh-in of 264.0 lb logged in that cycle
 *       And an unrelated 200 lb profile blob and a 300 lb weigh-in in another cycle
 *       When the dashboard derives metrics
 *       Then current weight is 264.0 (the active cycle's latest), not 200 or 300
 *       And the start baseline is the active cycle's 266.8 lb
 *
 * Was RED: useDashboardData derived currentWeight from program_id-scoped entries
 * with a profile-blob fallback and read startWeight from program_reference — the
 * "3 current-weights" divergent-source bug.
 */

const activeCycle: Cycle = {
  id: 'cyc-0626',
  name: 'PRIME.TIME-06.2026',
  status: 'active',
  start_date: '2026-06-03',
  start_weight: 266.8,
  start_bf: 39.2,
  goal_weight: 217,
  goal_bf: 13,
  timeline_weeks: 16,
};

const profileFallback = {
  current_weight: 200,
  current_bf: 25,
  goal_weight: 180,
  goal_bf: 12,
};

const mk = (id: string, date: string, weight: number, bf: number, cycle_id: string | null) =>
  ({ id, date, weight, body_fat_percentage: bf, cycle_id } as any);

describe('activeCycleMetrics', () => {
  it('current weight = active cycle latest weigh-in, not profile or other cycle', () => {
    const entries = [
      mk('e2', '2026-06-10', 264.0, 38.5, 'cyc-0626'), // active, latest
      mk('e1', '2026-06-03', 266.8, 39.2, 'cyc-0626'), // active, baseline
      mk('x1', '2026-05-01', 300.0, 45.0, 'cyc-old'),  // other cycle — must be excluded
    ];
    const m = activeCycleMetrics(entries, activeCycle, profileFallback);

    expect(m.currentWeight).toBe(264.0);
    expect(m.currentBF).toBe(38.5);
    expect(m.cycleEntries).toHaveLength(2);
  });

  it('start baseline comes from the active cycle, not program_reference/profile', () => {
    const entries = [mk('e1', '2026-06-03', 266.8, 39.2, 'cyc-0626')];
    const m = activeCycleMetrics(entries, activeCycle, profileFallback);

    expect(m.startWeight).toBe(266.8);
    expect(m.startBF).toBe(39.2);
    expect(m.goalWeight).toBe(217);
    expect(m.goalBF).toBe(13);
  });

  it('empty active cycle falls back to the cycle baseline, NOT the profile blob', () => {
    const m = activeCycleMetrics([], activeCycle, profileFallback);

    // No weigh-ins yet -> current weight is the cycle's own start baseline,
    // never the unrelated 200 lb profile blob.
    expect(m.currentWeight).toBe(266.8);
    expect(m.currentBF).toBe(39.2);
    expect(m.cycleEntries).toHaveLength(0);
  });

  it('sorts newest-first regardless of input order', () => {
    const entries = [
      mk('e1', '2026-06-03', 266.8, 39.2, 'cyc-0626'),
      mk('e3', '2026-06-17', 261.0, 37.8, 'cyc-0626'),
      mk('e2', '2026-06-10', 264.0, 38.5, 'cyc-0626'),
    ];
    const m = activeCycleMetrics(entries, activeCycle, profileFallback);
    expect(m.currentWeight).toBe(261.0); // 06-17 is latest
    expect(m.cycleEntries[0].id).toBe('e3');
  });

  it('no active cycle -> falls back to the profile blob', () => {
    const entries = [mk('x1', '2026-05-01', 300.0, 45.0, 'cyc-old')];
    const m = activeCycleMetrics(entries, null, profileFallback);

    expect(m.currentWeight).toBe(200);
    expect(m.startWeight).toBe(200);
    expect(m.goalWeight).toBe(180);
    expect(m.cycleEntries).toHaveLength(0);
  });
});

/**
 * F4+F7 — the report and the dashboard /calculate must feed fetchCalculation the
 * SAME inputs. cycleScopedCalcUser is the one builder both call, so the report's
 * numbers can never diverge from the dashboard's again.
 */
describe('cycleScopedCalcUser', () => {
  const user = {
    name: 'PRIME', current_weight: 200, current_bf: 25, // profile blob
    goal_weight: 180, goal_bf: 12, start_date: '2025-01-01',
  } as any;

  it('injects the active cycle latest weigh-in + cycle baseline as calc inputs', () => {
    const entries = [
      mk('e2', '2026-06-10', 264.0, 38.5, 'cyc-0626'),
      mk('e1', '2026-06-03', 266.8, 39.2, 'cyc-0626'),
    ];
    const out = cycleScopedCalcUser(user, entries, activeCycle);

    expect(out.current_weight).toBe(264.0);     // cycle latest, NOT 200 profile
    expect(out.current_bf).toBe(38.5);
    expect(out.goal_weight).toBe(217);          // cycle goal
    expect(out.start_date).toBe('2026-06-03');  // cycle start, NOT clobbered to today
  });

  it('is identity when there is no active cycle (legacy unaffected)', () => {
    const out = cycleScopedCalcUser(user, [], null);
    expect(out.current_weight).toBe(200);
    expect(out.start_date).toBe('2025-01-01');
  });

  it('does not mutate the input userData (immutability)', () => {
    const entries = [mk('e1', '2026-06-03', 266.8, 39.2, 'cyc-0626')];
    cycleScopedCalcUser(user, entries, activeCycle);
    expect(user.current_weight).toBe(200); // original untouched
  });
});
