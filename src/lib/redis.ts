import { createClient } from 'redis';
import { redisConfig } from './config';

// Use centralized config for Redis settings
const REDIS_URL = redisConfig.url;

export const redis = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('Too many Redis reconnection attempts');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

// Suppress repeat error logging when Redis is unavailable (dev environment)
let redisErrorLogged = false;
redis.on('error', (err) => {
  if (!redisErrorLogged) {
    console.error('Redis Client Error (suppressing further errors):', err?.message ?? err);
    redisErrorLogged = true;
  }
});
redis.on('connect', () => { console.log('Redis Client Connected'); redisErrorLogged = false; });
redis.on('ready', () => console.log('Redis Client Ready'));

// Connect to Redis only when explicitly enabled (ReComp Cycle plan P2:
// single source of truth). When disabled we never connect — every exported fn
// no-ops via redisReady() and SQLite/Python is the SOLE store. This is permanent:
// even if the Redis box comes back up, the app will not dual-write unless
// REDIS_ENABLED=true is explicitly set, so the legacy drift can never recur.
if (redisConfig.enabled) {
  (async () => {
    try {
      await redis.connect();
    } catch (err) {
      console.warn('Redis unavailable, all redis.ts calls will no-op:', (err as Error)?.message ?? err);
    }
  })();
} else {
  console.log('[redis] disabled (REDIS_ENABLED=false) — SQLite/Python is the single source of truth');
}

// Guard: every public function should early-exit when Redis isn't ready,
// so we don't pay per-call latency hitting a dead client.
function redisReady(): boolean {
  return redis.isOpen && redis.isReady;
}

// User data management
export async function saveUserData(userId: string, userData: any) {
  if (!redisReady()) return false;
  try {
    await redis.set(`user:${userId}`, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}

export async function getUserData(userId: string) {
  if (!redisReady()) return null;
  try {
    const data = await redis.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Body fat entries management (aligned with migrate_to_redis.py)
export async function saveEntry(userId: string, entry: any) {
  if (!redisReady()) return false;
  try {
    const entryKey = `entry:${userId}:${entry.id}`;

    // Store as a hash for compatibility with migrated data
    const toStore: Record<string, string> = {
      id: String(entry.id),
      user_id: String(userId),
      date: entry.date ?? '',
      weight: entry.weight != null ? String(entry.weight) : '',
      body_fat_percentage:
        entry.body_fat_percentage != null ? String(entry.body_fat_percentage) : '',
      notes: entry.notes ?? '',
      created_at: entry.created_at ?? '',
      updated_at: entry.updated_at ?? '',
    };

    await redis.hSet(entryKey, toStore);

    // Add to sorted set by date for chronological ordering
    const timestamp = new Date(entry.date).getTime();
    await redis.zAdd(`entries:${userId}`, {
      score: isNaN(timestamp) ? Date.now() : timestamp,
      value: String(entry.id),
    });

    return true;
  } catch (error) {
    console.error('Error saving entry:', error);
    return false;
  }
}

export async function getUserEntries(userId: string) {
  if (!redisReady()) return [];
  try {
    // Get all entry IDs sorted by date (most recent first)
    const entryIds = await redis.zRange(`entries:${userId}`, 0, -1, { REV: true });

    if (!entryIds || entryIds.length === 0) {
      return [];
    }

    // PERFORMANCE FIX: Use pipeline to batch all hGetAll calls
    // Before: 13+ Redis calls for 12 entries (1 zRange + 12 hGetAll)
    // After: 2 Redis calls total (1 zRange + 1 pipeline with 12 hGetAll)
    const pipeline = redis.multi();
    for (const id of entryIds) {
      pipeline.hGetAll(`entry:${userId}:${id}`);
    }

    const results = await pipeline.exec();

    const entries = entryIds.map((id, index) => {
      const data = results[index] as unknown as Record<string, string> | null;
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        id: data.id ?? id,
        user_id: data.user_id ?? String(userId),
        date: data.date,
        weight: data.weight != null ? Number(data.weight) : undefined,
        body_fat_percentage:
          data.body_fat_percentage != null
            ? Number(data.body_fat_percentage)
            : undefined,
        notes: data.notes ?? '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    });

    return entries.filter(Boolean);
  } catch (error) {
    console.error('Error getting user entries:', error);
    return [];
  }
}

export async function deleteEntry(userId: string, entryId: string) {
  if (!redisReady()) return false;
  try {
    const key = `entry:${userId}:${entryId}`;

    await redis.del(key);
    await redis.zRem(`entries:${userId}`, entryId);

    return true;
  } catch (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
}


// Reports management (aligned with migrate_to_redis.py)
export async function saveReport(userId: string, report: any) {
  if (!redisReady()) return false;
  try {
    const reportKey = `report:${userId}:${report.id}`;

    const toStore: Record<string, string> = {
      id: String(report.id),
      user_id: String(userId),
      title: report.title ?? '',
      date: report.date ?? report.generated_at ?? '',
      data: report.data ? JSON.stringify(report.data) : '',
      file_path: report.file_path ?? '',
      created_at: report.created_at ?? report.generated_at ?? '',
      generated_at: report.generated_at ?? '',
    };

    await redis.hSet(reportKey, toStore);

    const rawDate = toStore.date || toStore.generated_at;
    const timestamp = new Date(rawDate).getTime();
    await redis.zAdd(`reports:${userId}`, {
      score: isNaN(timestamp) ? Date.now() : timestamp,
      value: String(report.id),
    });

    return true;
  } catch (error) {
    console.error('Error saving report:', error);
    return false;
  }
}

export async function getUserReports(userId: string) {
  if (!redisReady()) return [];
  try {
    const reportIds = await redis.zRange(`reports:${userId}`, 0, -1, { REV: true });

    if (!reportIds || reportIds.length === 0) {
      return [];
    }

    // PERFORMANCE FIX: Use pipeline to batch all hGetAll calls
    // Before: N+1 Redis calls (1 zRange + N hGetAll)
    // After: 2 Redis calls total (1 zRange + 1 pipeline)
    const pipeline = redis.multi();
    for (const id of reportIds) {
      pipeline.hGetAll(`report:${userId}:${id}`);
    }

    const results = await pipeline.exec();

    const reports = reportIds.map((id, index) => {
      const data = results[index] as unknown as Record<string, string> | null;
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      let parsedData: any = undefined;
      if (data.data) {
        try {
          parsedData = JSON.parse(data.data);
        } catch {
          parsedData = data.data;
        }
      }

      return {
        id: data.id ?? id,
        user_id: data.user_id ?? String(userId),
        title: data.title ?? '',
        date: data.date ?? data.generated_at,
        data: parsedData,
        file_path: data.file_path ?? '',
        created_at: data.created_at,
        generated_at: data.generated_at,
      };
    });

    return reports.filter(Boolean);
  } catch (error) {
    console.error('Error getting user reports:', error);
    return [];
  }
}

export async function deleteReport(userId: string, reportId: string) {
  if (!redisReady()) return false;
  try {
    const key = `report:${userId}:${reportId}`;

    await redis.del(key);
    await redis.zRem(`reports:${userId}`, reportId);

    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    return false;
  }
}


// Last calculation storage
export async function saveLastCalculation(userId: string, calculation: any) {
  if (!redisReady()) return false;
  try {
    // Simple string storage for last calculation
    await redis.set(`user:${userId}:lastCalculation`, JSON.stringify(calculation));
    return true;
  } catch (error) {
    console.error('Error saving last calculation:', error);
    return false;
  }
}

export async function getLastCalculation(userId: string) {
  if (!redisReady()) return null;
  try {
    const data = await redis.get(`user:${userId}:lastCalculation`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting last calculation:', error);
    return null;
  }
}

// Clear all data for a user
export async function clearAllUserData(userId: string) {
  if (!redisReady()) return true;
  try {
    const id = String(userId);

    // Get all IDs first
    const [entryIds, reportIds, calcIds] = await Promise.all([
      redis.zRange(`entries:${id}`, 0, -1),
      redis.zRange(`reports:${id}`, 0, -1),
      redis.zRange(`calculations:${id}`, 0, -1),
    ]);

    // PERFORMANCE FIX: Collect all keys to delete and use batch delete
    // Before: N sequential delete operations
    // After: 1 batch delete operation
    const keysToDelete = [
      `user:${id}`,
      `user:${id}:lastCalculation`,
      `entries:${id}`,
      `reports:${id}`,
      `calculations:${id}`,
      ...entryIds.map(entryId => `entry:${id}:${entryId}`),
      ...reportIds.map(reportId => `report:${id}:${reportId}`),
      ...calcIds.map(calcId => `calculation:${id}:${calcId}`),
    ];

    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
    }

    return true;
  } catch (error) {
    console.error('Error clearing all user data:', error);
    return false;
  }
}

// Export all user data
export async function exportUserData(userId: string) {

  try {
    const userData = await getUserData(userId);
    const entries = await getUserEntries(userId);
    const reports = await getUserReports(userId);
    const lastCalculation = await getLastCalculation(userId);

    return {
      userData,
      entries,
      reports,
      lastCalculation,
      exportedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error exporting user data:', error);
    return null;
  }
}

// Import user data
export async function importUserData(userId: string, data: any) {
  try {
    // Save user data
    if (data.userData) {
      await saveUserData(userId, data.userData);
    }

    // Save entries
    if (data.entries && Array.isArray(data.entries)) {
      for (const entry of data.entries) {
        await saveEntry(userId, entry);
      }
    }

    // Save reports
    if (data.reports && Array.isArray(data.reports)) {
      for (const report of data.reports) {
        await saveReport(userId, report);
      }
    }

    // Save last calculation
    if (data.lastCalculation) {
      await saveLastCalculation(userId, data.lastCalculation);
    }

    return true;
  } catch (error) {
    console.error('Error importing user data:', error);
    return false;
  }
}

// Clear all user data
export async function clearUserData(userId: string) {
  if (!redisReady()) return true;
  try {
    // Get all entries and reports to delete
    const entryIds = await redis.sMembers(`user:${userId}:entries`);
    const reportIds = await redis.sMembers(`user:${userId}:reports`);

    // Delete all entries
    for (const entryId of entryIds) {
      await redis.del(`entry:${userId}:${entryId}`);
    }

    // Delete all reports
    for (const reportId of reportIds) {
      await redis.del(`report:${userId}:${reportId}`);
    }

    // Delete user data and indexes
    await redis.del([
      `user:${userId}`,
      `user:${userId}:entries`,
      `user:${userId}:entries:sorted`,
      `user:${userId}:reports`,
      `user:${userId}:reports:sorted`,
      `user:${userId}:lastCalculation`
    ]);

    return true;
  } catch (error) {
    console.error('Error clearing user data:', error);
    return false;
  }
}