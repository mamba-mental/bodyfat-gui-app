import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

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

redis.on('error', (err) => console.error('Redis Client Error', err));
redis.on('connect', () => console.log('Redis Client Connected'));
redis.on('ready', () => console.log('Redis Client Ready'));

// Connect to Redis
(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// User data management
export async function saveUserData(userId: string, userData: any) {
  try {
    await redis.set(`user:${userId}`, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}

export async function getUserData(userId: string) {
  try {
    const data = await redis.get(`user:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Body fat entries management
export async function saveEntry(userId: string, entry: any) {
  try {
    const entryKey = `entry:${userId}:${entry.id}`;
    await redis.set(entryKey, JSON.stringify(entry));
    
    // Add to user's entry list
    await redis.sAdd(`user:${userId}:entries`, entry.id);
    
    // Add to sorted set by date for chronological ordering
    const timestamp = new Date(entry.date).getTime();
    await redis.zAdd(`user:${userId}:entries:sorted`, {
      score: timestamp,
      value: entry.id
    });
    
    return true;
  } catch (error) {
    console.error('Error saving entry:', error);
    return false;
  }
}

export async function getUserEntries(userId: string) {
  try {
    // Get all entry IDs sorted by date
    const entryIds = await redis.zRange(`user:${userId}:entries:sorted`, 0, -1);
    
    if (!entryIds || entryIds.length === 0) {
      return [];
    }
    
    // Get all entries
    const entries = await Promise.all(
      entryIds.map(async (id) => {
        const data = await redis.get(`entry:${userId}:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );
    
    return entries.filter(Boolean);
  } catch (error) {
    console.error('Error getting user entries:', error);
    return [];
  }
}

export async function deleteEntry(userId: string, entryId: string) {
  try {
    // Remove from Redis
    await redis.del(`entry:${userId}:${entryId}`);
    await redis.sRem(`user:${userId}:entries`, entryId);
    await redis.zRem(`user:${userId}:entries:sorted`, entryId);
    
    return true;
  } catch (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
}

// Reports management
export async function saveReport(userId: string, report: any) {
  try {
    const reportKey = `report:${userId}:${report.id}`;
    await redis.set(reportKey, JSON.stringify(report));
    
    // Add to user's report list
    await redis.sAdd(`user:${userId}:reports`, report.id);
    
    // Add to sorted set by date
    const timestamp = new Date(report.generated_at).getTime();
    await redis.zAdd(`user:${userId}:reports:sorted`, {
      score: timestamp,
      value: report.id
    });
    
    return true;
  } catch (error) {
    console.error('Error saving report:', error);
    return false;
  }
}

export async function getUserReports(userId: string) {
  try {
    // Get all report IDs sorted by date
    const reportIds = await redis.zRange(`user:${userId}:reports:sorted`, 0, -1, { REV: true });
    
    if (!reportIds || reportIds.length === 0) {
      return [];
    }
    
    // Get all reports
    const reports = await Promise.all(
      reportIds.map(async (id) => {
        const data = await redis.get(`report:${userId}:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );
    
    return reports.filter(Boolean);
  } catch (error) {
    console.error('Error getting user reports:', error);
    return [];
  }
}

// Last calculation storage
export async function saveLastCalculation(userId: string, calculation: any) {
  try {
    await redis.set(`user:${userId}:lastCalculation`, JSON.stringify(calculation));
    return true;
  } catch (error) {
    console.error('Error saving last calculation:', error);
    return false;
  }
}

export async function getLastCalculation(userId: string) {
  try {
    const data = await redis.get(`user:${userId}:lastCalculation`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting last calculation:', error);
    return null;
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
    await redis.del(
      `user:${userId}`,
      `user:${userId}:entries`,
      `user:${userId}:entries:sorted`,
      `user:${userId}:reports`,
      `user:${userId}:reports:sorted`,
      `user:${userId}:lastCalculation`
    );
    
    return true;
  } catch (error) {
    console.error('Error clearing user data:', error);
    return false;
  }
}