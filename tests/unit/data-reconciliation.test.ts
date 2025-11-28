import { describe, expect, it } from 'vitest';
import type { BodyFatEntry, UserData } from '@/types';
import { mergeUserProfiles, normaliseEntry, reconcileEntries } from '@/lib/data-reconciliation';

describe('mergeUserProfiles', () => {
  const localUser: UserData = {
    name: 'Local User',
    age: 35,
    gender: 'm',
    height_feet: 5,
    height_inches: 11,
    height_cm: 180,
    dob: '1990-01-01',
    current_weight: 200,
    current_bf: 20,
    goal_weight: 180,
    goal_bf: 12,
    start_date: '2025-01-01',
    end_date: '2025-06-01',
    activity_level: 3,
    resistance_training: true,
    is_athlete: false,
    workout_type: 'General Fitness',
    workout_days: 4,
    job_activity: 2,
    leisure_activity: 2,
    experience_level: 'intermediate',
    volume_score: 5,
    intensity_score: 5,
    frequency_score: 5,
    is_bodybuilder: false,
    protein_intake: 160,
    diet_type: 'balanced',
    ped_use: false,
    exercise_type: 'resistance',
    sleep_quality: 'good',
    timeline_weeks: 16,
  };

  it('prefers local values when both sources exist', () => {
    const remoteUser = {
      ...localUser,
      current_weight: 190,
      start_date: "",
      end_date: "",
    };

    const merged = mergeUserProfiles(localUser, remoteUser);
    expect(merged?.current_weight).toBe(localUser.current_weight);
    expect(merged?.start_date).toBe(localUser.start_date);
    expect(merged?.end_date).toBe(localUser.end_date);
  });

  it('returns remote when local is missing', () => {
    const remoteOnly = { ...localUser, name: 'Remote' };
    const merged = mergeUserProfiles(null, remoteOnly);
    expect(merged).toStrictEqual(remoteOnly);
  });

  it('returns null when both are absent', () => {
    expect(mergeUserProfiles(undefined, null)).toBeNull();
  });
});

describe('normaliseEntry', () => {
  it('normalises fields and fills timestamps', () => {
    const entry = normaliseEntry({
      id: 'abc',
      date: '2025-07-20',
      weight: '199.5',
      body_fat_percentage: 21.5,
      notes: 'Test',
    });

    expect(entry).toBeTruthy();
    expect(entry?.id).toBe('abc');
    expect(entry?.weight).toBeCloseTo(199.5);
    expect(entry?.user_id).toBe('1');
    expect(new Date(entry!.created_at).getTime()).not.toBeNaN();
  });

  it('returns null when id is missing', () => {
    expect(normaliseEntry({})).toBeNull();
  });
});

describe('reconcileEntries', () => {
  const makeEntry = (id: string, weight: number, date: string): BodyFatEntry => ({
    id,
    date,
    weight,
    body_fat_percentage: 20,
    notes: '',
    user_id: '1',
    created_at: date,
    updated_at: date,
  });

  it('keeps local entries when remote is empty', () => {
    const local = [makeEntry('a', 200, '2025-07-01')];
    const { merged, toPersist } = reconcileEntries(local, []);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toStrictEqual(local[0]);
    expect(toPersist).toHaveLength(0);
  });

  it('appends new remote entries without overwriting locals', () => {
    const local = [makeEntry('a', 200, '2025-07-01')];
    const remote = [makeEntry('b', 198, '2025-07-08')];

    const { merged, toPersist } = reconcileEntries(local, remote);
    expect(merged.map((e) => e.id)).toEqual(['b', 'a']);
    expect(toPersist.map((e) => e.id)).toEqual(['b']);
  });

  it('ignores remote duplicates that match existing ids', () => {
    const local = [makeEntry('a', 200, '2025-07-01')];
    const remote = [makeEntry('a', 199, '2025-07-02')];

    const { merged, toPersist } = reconcileEntries(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].weight).toBe(200);
    expect(toPersist).toHaveLength(0);
  });
});
