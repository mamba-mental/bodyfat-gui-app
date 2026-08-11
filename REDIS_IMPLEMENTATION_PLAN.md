# REDIS-FIRST ARCHITECTURE - IMPLEMENTATION PLAN

> **Superseded architecture proposal.** Current Apex Fit is SQLite-authoritative; Redis is optional cache/fallback infrastructure and must not overwrite newer canonical records. See [`DATABASE_INFO.md`](DATABASE_INFO.md).

## Overview
Migrate from JSON/SQLite hybrid to Redis as the single source of truth.

## Current State
- ✅ Redis package installed (`redis@^5.6.1`)
- ✅ Redis routes exist at `/api/redis/*` (unused)
- ✅ Redis configured in `docker-compose.dev.yml` and `docker-compose.prod.yml`
- ❌ Main API routes use JSON files + SQLite sync
- ❌ Redis not used by main application

## Target Architecture
```
Frontend → Next.js API Routes → Redis (Primary)
                                    ↓
                              SQLite (Backup/Persistence)
```

## Phase 1: Data Migration (COMPLETE - Script Ready)

**Script**: `python-api/migrate_to_redis.py`

**Data Structure in Redis:**

### Users
- Key: `user:{user_id}`
- Type: String (JSON serialized)
- Example: `user:1` → `{"name": "MJ PRIME", "age": 35, ...}`

### Entries
- Key: `entry:{user_id}:{entry_id}`
- Type: Hash
- Fields: `id`, `user_id`, `date`, `weight`, `body_fat_percentage`, `notes`, `created_at`, `updated_at`
- Sorted Set: `entries:{user_id}` (for date-based queries)
- Example: `entry:1:hist_1` → `{date: "2025-01-01", weight: "200", ...}`

### Reports
- Key: `report:{user_id}:{report_id}`
- Type: Hash
- Fields: `id`, `user_id`, `title`, `date`, `data`, `file_path`, `created_at`
- Sorted Set: `reports:{user_id}` (for date-based queries)

### Calculations
- Key: `calculation:{user_id}:{calc_id}`
- Type: Hash
- Fields: `id`, `user_id`, `data`, `created_at`
- Sorted Set: `calculations:{user_id}`

## Phase 2: Update Next.js API Routes

### Files to Modify:

1. **src/lib/redis.ts** (Update)
   - Add helper functions for main operations
   - `getUser(userId)`, `saveUser(userId, data)`
   - `getEntries(userId)`, `saveEntry(userId, entry)`
   - `getReports(userId)`, `saveReport(userId, report)`
   - `getCalculations(userId)`, `saveCalculation(userId, calc)`

2. **src/app/api/data/user/route.ts**
   - Remove JSON storage calls
   - Use Redis client directly
   - Remove Python API sync (optional)

3. **src/app/api/data/entries/route.ts**
   - Remove JSON storage calls
   - Use Redis client for entries
   - Update sorted sets for date ordering

4. **src/app/api/data/reports/route.ts**
   - Remove JSON storage calls
   - Use Redis client for reports

5. **src/app/api/data/calculation/route.ts**
   - Remove JSON storage calls
   - Use Redis client for calculations

### Example Redis Operations:

```typescript
// Get user
const userData = await redis.get(`user:${userId}`);

// Save user
await redis.set(`user:${userId}`, JSON.stringify(userData));

// Get entries for user (sorted by date)
const entryIds = await redis.zRange(`entries:${userId}`, 0, -1);
const entries = await Promise.all(
  entryIds.map(id => redis.hGetAll(`entry:${userId}:${id}`))
);

// Save entry
const entryId = `entry_${Date.now()}`;
await redis.hSet(`entry:${userId}:${entryId}`, {
  id: entryId,
  user_id: userId,
  date: entry.date,
  weight: entry.weight.toString(),
  // ... other fields
});
// Add to sorted set
await redis.zAdd(`entries:${userId}`, {
  score: new Date(entry.date).getTime(),
  value: entryId
});
```

## Phase 3: Update Docker Configuration

### docker-compose.yml (Add Redis)
```yaml
services:
  apex-fit-ai:
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - python-api

  redis:
    image: redis:7.2-alpine
    container_name: apexfit-redis
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - apex-fit-redis:/data
    restart: unless-stopped
    networks:
      - apex-fit-network

volumes:
  apex-fit-redis:
    driver: local
```

## Phase 4: Remove Legacy Code

### Files to Delete:
- `src/lib/server-storage.ts` (JSON storage)
- `src/app/api/redis/*` (duplicate Redis routes - not used)

### Files to Keep (for now):
- `python-api/` (SQLite backup - can be removed later)
- `data/bodyfat.db` (backup data)

## Phase 5: Testing Checklist

- [ ] Start Redis container
- [ ] Run migration script
- [ ] Verify data in Redis: `redis-cli KEYS "*"`
- [ ] Test user data load/save
- [ ] Test entry creation/retrieval
- [ ] Test report generation
- [ ] Test calculation storage
- [ ] Verify data persists across restarts
- [ ] Performance testing

## Redis Commands for Verification

```bash
# Connect to Redis
redis-cli

# Check all keys
KEYS *

# Check user
GET user:1

# Check entries for user
ZRANGE entries:1 0 -1
HGETALL entry:1:hist_1

# Check reports
ZRANGE reports:1 0 -1
HGETALL report:1:report_123

# Check memory usage
INFO memory
```

## Benefits of Redis-First

1. **Speed**: In-memory operations are 10-100x faster than disk I/O
2. **Concurrency**: No file locking issues
3. **Scalability**: Handles high throughput better
4. **Data Structures**: Hashes, sorted sets perfect for this use case
5. **Atomic Operations**: Built-in transaction support
6. **Pub/Sub**: Real-time updates possible (future feature)

## Next Steps

1. **Start Redis**: Use `START_SERVERS_WINDOWS.bat` or Docker
2. **Run Migration**: `cd python-api && python migrate_to_redis.py`
3. **Update Routes**: Modify Next.js API routes to use Redis
4. **Test**: Verify all functionality works
5. **Cleanup**: Remove JSON storage code

## Commands to Run

```bash
# Start Redis (if using Docker)
docker-compose -f docker-compose.dev.yml up -d redis-dev

# Run migration
cd python-api
python migrate_to_redis.py

# Verify data
redis-cli -p 6380 KEYS "*"
```

---

**Status**: Ready to implement
**Priority**: High
**Estimated Time**: 2-3 hours for full migration
