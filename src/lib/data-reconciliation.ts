import type { BodyFatEntry, UserData } from '@/types';

type Nullable<T> = T | null | undefined;

/**
 * Merge a remote user payload into an existing local profile. Local fields win.
 */
export function mergeUserProfiles(localUser: Nullable<UserData>, remoteUser: Nullable<UserData>): Nullable<UserData> {
  if (localUser && remoteUser) {
    return { ...remoteUser, ...localUser };
  }
  return localUser ?? remoteUser ?? null;
}

/**
 * Normalise incoming entry data from remote sources.
 */
export function normaliseEntry(entry: any): BodyFatEntry | null {
  if (!entry || typeof entry !== 'object') return null;

  const id = entry.id ?? entry.entry_id ?? entry.uuid;
  if (typeof id !== 'string' || !id.trim()) return null;

  const toTimestamp = (value: any): string => {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  };

  return {
    id,
    date: typeof entry.date === 'string' ? entry.date : toTimestamp(entry.date),
    weight: Number(entry.weight ?? entry.weight_lbs ?? entry.body_weight ?? 0),
    body_fat_percentage: entry.body_fat_percentage ?? entry.bodyFat ?? null,
    notes: entry.notes ?? entry.comment ?? '',
    user_id: typeof entry.user_id === 'string' && entry.user_id.trim() ? entry.user_id : '1',
    created_at: toTimestamp(entry.created_at ?? entry.timestamp),
    updated_at: toTimestamp(entry.updated_at ?? entry.modified_at ?? entry.timestamp),
  };
}

export interface ReconciledEntries {
  merged: BodyFatEntry[];
  toPersist: BodyFatEntry[];
}

/**
 * Combine remote entries with an existing local cache. Local entries remain canonical;
 * new remote IDs are appended and returned via `toPersist` for storage.
 */
export function reconcileEntries(localEntries: BodyFatEntry[], remoteEntries: BodyFatEntry[]): ReconciledEntries {
  const byId = new Map<string, BodyFatEntry>();
  for (const entry of localEntries) {
    if (entry?.id) {
      byId.set(entry.id, entry);
    }
  }

  const toPersist: BodyFatEntry[] = [];
  for (const entry of remoteEntries) {
    if (!entry?.id) continue;
    if (!byId.has(entry.id)) {
      byId.set(entry.id, entry);
      toPersist.push(entry);
    }
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return Number.isNaN(bDate - aDate) ? 0 : bDate - aDate;
  });

  return { merged, toPersist };
}
