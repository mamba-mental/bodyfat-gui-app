/**
 * Data Sync Orchestrator
 *
 * Implements write-through caching with SQLite as source of truth and Redis as cache.
 *
 * Strategy:
 * - Writes go to BOTH Redis AND SQLite (write-through)
 * - Reads try Redis first, fallback to SQLite
 * - Cache miss populates Redis from SQLite
 * - Startup warms Redis cache from SQLite
 * - Conflict resolution: SQLite wins (source of truth)
 */

import { BodyFatEntry, Report, UserData } from '@/types';
import { config } from './config';

// Python API base URL from config
const PYTHON_API_URL = config.pythonApi.url;

/**
 * DataSync class orchestrates data synchronization between Redis (cache) and SQLite (persistence)
 */
export class DataSync {
  private userId: string;

  constructor(userId: string = 'default') {
    this.userId = userId;
  }

  // ==================== ENTRY OPERATIONS ====================

  /**
   * Get entries with Redis-first, SQLite fallback pattern
   */
  async getEntries(): Promise<BodyFatEntry[]> {
    try {
      // Try Redis first via Next.js API route
      const redisResponse = await fetch('/api/data/entries', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (redisResponse.ok) {
        // If the wrapper couldn't reach the Python source it sets x-python-warning
        // and returns cache-only data — which may be a stale subset. In that case
        // fall through to the Python source of truth instead of trusting the cache.
        const warning = redisResponse.headers.get('x-python-warning');
        const redisEntries = await redisResponse.json();
        if (!warning && redisEntries && redisEntries.length > 0) {
          return redisEntries;
        }
        if (warning) {
          console.warn('[DataSync] /api/data/entries served cache-only data (x-python-warning):', warning);
        }
      }
    } catch (error) {
      console.warn('[DataSync] Redis read failed, falling back to SQLite:', error);
    }

    // Fallback to SQLite via Python API
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/entries`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (sqliteResponse.ok) {
        const sqliteEntries = await sqliteResponse.json();
        // Do NOT warm-write back to /api/data/entries here: that round-trip
        // strips cycle_id and re-tags entries to the active cycle (P2). Python
        // is canonical; just return what it served.
        return sqliteEntries || [];
      }
    } catch (error) {
      console.error('[DataSync] SQLite read failed:', error);
    }

    return [];
  }

  /**
   * Save entry with write-through to both Redis and SQLite
   */
  async saveEntry(entry: BodyFatEntry): Promise<{ success: boolean; error?: string; entry?: BodyFatEntry }> {
    const errors: string[] = [];
    // F2: capture the SERVER-resolved row so the canonical cycle_id (assigned by
    // the Python repository when the client posts without one) flows back to
    // client state. Without this, the reducer holds a cycle-orphaned weigh-in.
    let persisted: BodyFatEntry | undefined;

    // Write to SQLite first (source of truth)
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!sqliteResponse.ok) {
        const errorData = await sqliteResponse.json().catch(() => ({}));
        errors.push(`SQLite write failed: ${errorData.detail || sqliteResponse.statusText}`);
      } else {
        // Python returns { success, message, entry } — unwrap the resolved row.
        const payload = await sqliteResponse.json().catch(() => null);
        const row = payload?.entry ?? payload;
        if (row && typeof row === 'object' && 'id' in row) {
          persisted = row as BodyFatEntry;
        }
      }
    } catch (error) {
      errors.push(`SQLite write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Write to Redis (cache)
    try {
      const redisResponse = await fetch('/api/data/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!redisResponse.ok) {
        const errorData = await redisResponse.json().catch(() => ({}));
        errors.push(`Redis write failed: ${errorData.error || redisResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`Redis write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      entry: persisted,
    };
  }

  /**
   * Delete entry from both Redis and SQLite
   */
  async deleteEntry(entryId: string): Promise<{ success: boolean; error?: string }> {
    const errors: string[] = [];

    // Delete from SQLite first (source of truth)
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!sqliteResponse.ok) {
        errors.push(`SQLite delete failed: ${sqliteResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`SQLite delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Delete from Redis (cache)
    try {
      const redisResponse = await fetch(`/api/entries/${entryId}`, {
        method: 'DELETE',
      });

      if (!redisResponse.ok) {
        errors.push(`Redis delete failed: ${redisResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`Redis delete error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  // ==================== USER DATA OPERATIONS ====================

  /**
   * Get user data with Redis-first, SQLite fallback pattern
   */
  async getUserData(): Promise<UserData | null> {
    console.log('[DataSync] getUserData: Starting data fetch...');
    try {
      // Try Redis first via Next.js API route
      console.log('[DataSync] getUserData: Trying Redis via /api/user...');
      const redisResponse = await fetch('/api/data/user', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[DataSync] getUserData: Redis response status:', redisResponse.status);
      if (redisResponse.ok) {
        const userData = await redisResponse.json();
        console.log('[DataSync] getUserData: Got data from Redis:', userData);
        if (userData && Object.keys(userData).length > 0) {
          return userData;
        }
      }
    } catch (error) {
      console.warn('[DataSync] Redis user read failed, falling back to SQLite:', error);
    }

    // Fallback to SQLite via Python API
    try {
      console.log('[DataSync] getUserData: Trying Python API at', `${PYTHON_API_URL}/api/data/user`);
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/user`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('[DataSync] getUserData: Python API response status:', sqliteResponse.status);
      if (sqliteResponse.ok) {
        const userData = await sqliteResponse.json();
        console.log('[DataSync] getUserData: Got data from Python API:', userData);

        // Warm Redis cache with SQLite data
        if (userData) {
          await this.warmUserCache(userData);
        }

        return userData;
      } else {
        console.error('[DataSync] getUserData: Python API returned non-OK status:', sqliteResponse.status);
      }
    } catch (error) {
      console.error('[DataSync] SQLite user read failed:', error);
    }

    console.error('[DataSync] getUserData: Returning null - all fetch attempts failed');
    return null;
  }

  /**
   * Save user data with write-through to both Redis and SQLite
   */
  async saveUserData(userData: UserData): Promise<{ success: boolean; error?: string }> {
    const errors: string[] = [];

    // Write to SQLite first (source of truth)
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!sqliteResponse.ok) {
        errors.push(`SQLite user write failed: ${sqliteResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`SQLite user write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Write to Redis (cache)
    try {
      const redisResponse = await fetch('/api/data/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!redisResponse.ok) {
        errors.push(`Redis user write failed: ${redisResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`Redis user write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  // ==================== REPORT OPERATIONS ====================

  /**
   * Get reports with Redis-first, SQLite fallback pattern
   */
  async getReports(): Promise<Report[]> {
    try {
      // Try Redis first via Next.js API route
      const redisResponse = await fetch('/api/data/reports', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (redisResponse.ok) {
        const reports = await redisResponse.json();
        if (reports && reports.length > 0) {
          return reports;
        }
      }
    } catch (error) {
      console.warn('[DataSync] Redis reports read failed, falling back to SQLite:', error);
    }

    // Fallback to SQLite via Python API
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/reports`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (sqliteResponse.ok) {
        const reports = await sqliteResponse.json();
        // Do NOT warm-write back to /api/data/reports here: that round-trip
        // nulls report cycle_ids (P2). Python is canonical; return as-is.
        return reports || [];
      }
    } catch (error) {
      console.error('[DataSync] SQLite reports read failed:', error);
    }

    return [];
  }

  /**
   * Save report with write-through to both Redis and SQLite
   */
  async saveReport(report: Report): Promise<{ success: boolean; error?: string }> {
    const errors: string[] = [];

    // Write to SQLite first (source of truth)
    try {
      const sqliteResponse = await fetch(`${PYTHON_API_URL}/api/data/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      if (!sqliteResponse.ok) {
        errors.push(`SQLite report write failed: ${sqliteResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`SQLite report write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Write to Redis (cache)
    try {
      const redisResponse = await fetch('/api/data/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      if (!redisResponse.ok) {
        errors.push(`Redis report write failed: ${redisResponse.statusText}`);
      }
    } catch (error) {
      errors.push(`Redis report write error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Full sync: Pull all data from SQLite (source of truth) and update Redis cache
   * Use this on app startup or manual "Sync Data" button
   */
  async syncFromSQLite(): Promise<{
    success: boolean;
    syncedEntries: number;
    syncedReports: number;
    error?: string;
  }> {
    const errors: string[] = [];
    let syncedEntries = 0;
    let syncedReports = 0;

    // Sync entries
    try {
      const sqliteEntries = await fetch(`${PYTHON_API_URL}/api/data/entries`);
      if (sqliteEntries.ok) {
        const entries = await sqliteEntries.json();
        if (entries && entries.length > 0) {
          await this.warmEntriesCache(entries);
          syncedEntries = entries.length;
        }
      }
    } catch (error) {
      errors.push(`Entries sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sync reports
    try {
      const sqliteReports = await fetch(`${PYTHON_API_URL}/api/data/reports`);
      if (sqliteReports.ok) {
        const reports = await sqliteReports.json();
        if (reports && reports.length > 0) {
          await this.warmReportsCache(reports);
          syncedReports = reports.length;
        }
      }
    } catch (error) {
      errors.push(`Reports sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Sync user data
    try {
      const sqliteUser = await fetch(`${PYTHON_API_URL}/api/data/user`);
      if (sqliteUser.ok) {
        const userData = await sqliteUser.json();
        if (userData) {
          await this.warmUserCache(userData);
        }
      }
    } catch (error) {
      errors.push(`User data sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      syncedEntries,
      syncedReports,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Get sync status - compare Redis and SQLite counts
   */
  async getSyncStatus(): Promise<{
    redisEntries: number;
    sqliteEntries: number;
    redisReports: number;
    sqliteReports: number;
    inSync: boolean;
  }> {
    let redisEntries = 0;
    let sqliteEntries = 0;
    let redisReports = 0;
    let sqliteReports = 0;

    // Get Redis counts
    try {
      const redisEntriesResponse = await fetch('/api/data/entries');
      if (redisEntriesResponse.ok) {
        const entries = await redisEntriesResponse.json();
        redisEntries = entries?.length || 0;
      }

      const redisReportsResponse = await fetch('/api/data/reports');
      if (redisReportsResponse.ok) {
        const reports = await redisReportsResponse.json();
        redisReports = reports?.length || 0;
      }
    } catch (error) {
      console.warn('[DataSync] Failed to get Redis counts:', error);
    }

    // Get SQLite counts
    try {
      const sqliteEntriesResponse = await fetch(`${PYTHON_API_URL}/api/data/entries`);
      if (sqliteEntriesResponse.ok) {
        const entries = await sqliteEntriesResponse.json();
        sqliteEntries = entries?.length || 0;
      }

      const sqliteReportsResponse = await fetch(`${PYTHON_API_URL}/api/data/reports`);
      if (sqliteReportsResponse.ok) {
        const reports = await sqliteReportsResponse.json();
        sqliteReports = reports?.length || 0;
      }
    } catch (error) {
      console.warn('[DataSync] Failed to get SQLite counts:', error);
    }

    return {
      redisEntries,
      sqliteEntries,
      redisReports,
      sqliteReports,
      inSync: redisEntries === sqliteEntries && redisReports === sqliteReports,
    };
  }

  // ==================== CACHE WARMING HELPERS ====================

  private async warmEntriesCache(entries: BodyFatEntry[]): Promise<void> {
    try {
      // Use the bulk sync endpoint if available, otherwise save one by one
      const response = await fetch('/api/sync/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      if (!response.ok) {
        // Fallback: save entries individually
        for (const entry of entries) {
          await fetch('/api/data/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
        }
      }
    } catch (error) {
      console.error('[DataSync] Failed to warm entries cache:', error);
    }
  }

  private async warmReportsCache(reports: Report[]): Promise<void> {
    try {
      // Use the bulk sync endpoint if available, otherwise save one by one
      const response = await fetch('/api/sync/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
      });

      if (!response.ok) {
        // Fallback: save reports individually
        for (const report of reports) {
          await fetch('/api/data/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
          });
        }
      }
    } catch (error) {
      console.error('[DataSync] Failed to warm reports cache:', error);
    }
  }

  private async warmUserCache(userData: UserData): Promise<void> {
    try {
      await fetch('/api/data/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
    } catch (error) {
      console.error('[DataSync] Failed to warm user cache:', error);
    }
  }
}

// Export singleton instance for convenience
export const dataSync = new DataSync();

// Export helper function for sync on startup.
//
// DISABLED (ReComp Cycle plan, P2): this used to call syncFromSQLite(), which
// re-POSTed every entry and report back through /api/data/* on each page load to
// "warm" the Redis cache. Those POSTs round-trip through Python's Pydantic models
// (and the JS normaliseEntry), neither of which carried `cycle_id` — so on every
// load all entries got re-tagged to the ACTIVE cycle and report cycle_ids were
// nulled (the data corruption PRIME saw: "stats won't stay correct"). Python is
// the single source of truth and reads come straight from it, so there is nothing
// to warm. Kept as a no-op so existing call sites stay valid until P2 removes them.
export async function initializeDataSync(): Promise<void> {
  // Intentionally a no-op. Do NOT re-introduce a load-time write-back loop.
}
