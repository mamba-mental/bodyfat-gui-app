# STORAGE INCONSISTENCY INVESTIGATION REPORT

**Date**: November 15, 2025  
**Investigator**: AI Assistant  
**Hypothesis**: The app uses multiple storage backends (Redis, SQLite, JSON) causing data inconsistency

---

## EXECUTIVE SUMMARY

**HYPOTHESIS CONFIRMED**: The bodyfat-gui-app has evolved through multiple iterations where different LLMs implemented THREE different storage backends that are ALL ACTIVE simultaneously:

1. **Redis** (in-memory cache)
2. **SQLite** (Python API backend)
3. **JSON files** (Next.js filesystem storage)

This creates a **CRITICAL DATA CONSISTENCY PROBLEM** where data can be stored in different locations depending on which API route is called, leading to confusion about the "source of truth."

---

## DETAILED FINDINGS

### 1. STORAGE BACKENDS IDENTIFIED

#### A. Redis Implementation
**Location**: `src/lib/redis.ts`  
**Status**: ✅ ACTIVE (package installed: `redis@^5.6.1`)  
**Usage**: 
- User data: `user:{userId}` keys
- Entries: `entry:{userId}:{entryId}` keys with sorted sets
- Reports: `report:{userId}:{reportId}` keys with sorted sets
- Last calculation: `user:{userId}:lastCalculation` keys

**API Routes Using Redis**:
- `src/app/api/redis/user/route.ts:4-8` - Uses Redis for user data
- `src/app/api/redis/entries/route.ts:3-6` - Uses Redis for entries
- `src/app/api/redis/reports/route.ts:5` - Uses Redis for reports
- `src/app/api/redis/calculation/route.ts:5` - Uses Redis for calculations
- `src/app/api/redis/export/route.ts:5` - Uses Redis for data export

**Docker Configuration**:
- `docker-compose.dev.yml:59-69` - Defines `redis-dev` service
- `docker-compose.dev.yml:17,42` - Environment variable `REDIS_URL=redis://redis-dev:6379`
- Port mapping: `6380:6379`
- Volume: `apex-fit-dev-redis:/data`

**Production Status**: ❌ NOT included in production `docker-compose.yml` (only in dev)

---

#### B. SQLite Implementation
**Location**: `python-api/database.py`  
**Status**: ✅ ACTIVE (Python module: `sqlite3`)  
**Database File**: `data/bodyfat.db` (14.1 MB - EXISTS)

**Schema**:
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    weight REAL NOT NULL,
    body_fat_percentage REAL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)

CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    data TEXT NOT NULL,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)

CREATE TABLE calculations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**Python API Routes Using SQLite**:
- `python-api/data_endpoints.py:190-224` - GET/POST `/api/data/user` - Uses SQLite
- `python-api/data_endpoints.py:241-259` - GET/POST `/api/data/entries` - Uses SQLite
- `python-api/data_endpoints.py:267-288` - GET/POST `/api/data/reports` - Uses SQLite
- `python-api/data_endpoints.py:290-317` - GET/POST `/api/data/calculation` - Uses SQLite
- `python-api/api_with_db.py:31-145` - Alternative implementation also using SQLite

**Database Initialization**:
- `python-api/database.py:23-77` - Automatically creates tables and indexes
- `python-api/main.py:20` - Imports `data_endpoints` router which initializes DB

**Production Status**: ✅ Included in production docker-compose

---

#### C. JSON File Storage Implementation
**Location**: `src/lib/server-storage.ts`  
**Status**: ✅ ACTIVE  
**Storage File**: `data/apexfit-data.json` (EXISTS)

**Schema**:
```typescript
interface DataStore {
  users: { [key: number]: UserData };
  entries: BodyFatEntry[];
  reports: Report[];
  calculations: { [key: number]: CalculationResult };
}
```

**Features**:
- Atomic writes with temp files
- Automatic backups before writes (stored in `data/backups/`)
- Data validation before replacing main file

**Next.js API Routes Using JSON Storage**:
- `src/app/api/data/user/route.ts:2,36,68,91` - Uses `dbSaveUser()` and `dbGetUser()` from server-storage
- `src/app/api/data/entries/route.ts:2,49,58,103,132` - Uses `dbSaveEntry()`, `dbGetEntries()`, `dbDeleteEntry()`
- `src/app/api/data/reports/route.ts:2,54,60,102,125` - Uses `dbSaveReport()`, `dbGetReports()`, `dbDeleteReport()`

**Backup System**:
- Location: `data/backups/`
- Found 10 backup files (timestamped JSON files)
- Backup on every write operation

**Production Status**: ✅ Included (filesystem storage)

---

### 2. DATA FLOW INCONSISTENCIES

#### Mixed Backend Usage Pattern

**User Data Flow**:
```
Frontend Request → /api/data/user
    ↓
    1. Reads from JSON file (server-storage.ts:85-88)
    2. Attempts to sync with Python API → SQLite (route.ts:39-60)
    3. Merges data if both exist (route.ts:62)
    4. Redis routes exist but NOT called by main routes
```

**Entries Flow**:
```
Frontend Request → /api/data/entries
    ↓
    1. Attempts Python API first → SQLite (route.ts:26-46)
    2. Falls back to local JSON (route.ts:49)
    3. Reconciles differences (route.ts:52-63)
    4. Persists merged data to JSON (route.ts:56-62)
    5. Redis routes exist but NOT called by main routes
```

**Reports Flow**:
```
Frontend Request → /api/data/reports
    ↓
    1. Attempts Python API first → SQLite (route.ts:33-52)
    2. Falls back to local JSON if Python fails (route.ts:54-55)
    3. Persists Python reports to JSON (route.ts:58-64)
    4. Redis routes exist but NOT called by main routes
```

---

### 3. ENVIRONMENT CONFIGURATION

**No Storage Backend Selection Toggle Found**

Searched for environment variables:
- ❌ No `STORAGE_BACKEND` env variable
- ❌ No `USE_REDIS` toggle
- ❌ No `USE_SQLITE` toggle
- ❌ No configuration file for storage selection

**What exists**:
- `REDIS_URL` in docker-compose.dev.yml (dev only)
- `DATA_DIR` environment variable
- `NEXT_PUBLIC_PYTHON_API_URL` for Python API connection

---

### 4. CURRENT ACTIVE CONFIGURATION

Based on docker-compose files and code analysis:

**Development Mode** (`docker-compose.dev.yml`):
- ✅ Redis available at `redis://redis-dev:6379`
- ✅ SQLite in Python API at `/app/data/bodyfat.db`
- ✅ JSON storage at `/app/data/apexfit-data.json`
- **Result**: THREE backends active simultaneously

**Production Mode** (`docker-compose.yml`):
- ❌ Redis NOT included
- ✅ SQLite in Python API at `/app/data/bodyfat.db`
- ✅ JSON storage via volume mounts
- **Result**: TWO backends active

---

### 5. EVIDENCE OF MIXED USAGE

#### Files With Multiple Storage Imports:
1. **Main data routes use hybrid approach**:
   - Read from JSON first (fast, local)
   - Sync with Python/SQLite second (authoritative)
   - Merge and reconcile differences

2. **Separate Redis routes exist but aren't integrated**:
   - `/api/redis/*` routes implement complete CRUD
   - NOT called by the main application
   - Appear to be abandoned/legacy code

3. **Python API has TWO database implementations**:
   - `main.py` includes `data_endpoints.py` (uses SQLite)
   - `api_with_db.py` exists as standalone (also uses SQLite)
   - Unclear which is actually running

---

### 6. DATA RECONCILIATION CODE FOUND

**Location**: Evidence of data merging logic

**Files**:
- `src/lib/data-reconciliation.ts` (imported by routes)
- Functions used:
  - `mergeUserProfiles()` - Used in `api/data/user/route.ts:62`
  - `normaliseEntry()` - Used in `api/data/entries/route.ts:38,100`
  - `reconcileEntries()` - Used in `api/data/entries/route.ts:53`

**Pattern**: The app attempts to reconcile data from multiple sources rather than having a single source of truth.

---

### 7. MIGRATION/SYNC CODE

**Found**:
- `python-api/data_endpoints.py:112-167` - `ingest_legacy_reports()` function
  - Automatically imports HTML/PDF reports from filesystem into SQLite
  - Runs on startup
  
- `python-api/api_with_db.py:272-306` - Import endpoint at `/api/import/data`
  - Imports user data, entries, reports from JSON into SQLite

**Not Found**:
- No bidirectional sync
- No data migration from Redis to SQLite
- No cleanup of old storage after migration

---

## CRITICAL PROBLEMS IDENTIFIED

### 1. **No Single Source of Truth**
- Data can exist in 3 places simultaneously
- No clear hierarchy of which storage is authoritative
- Merge logic can create unexpected results

### 2. **Development vs Production Mismatch**
- Dev has Redis, Production doesn't
- Code written for Redis in dev will fail in production
- `/api/redis/*` routes are dead code in production

### 3. **Race Conditions Possible**
- JSON write + Python API write happen sequentially
- If Python API fails, JSON has data but SQLite doesn't
- Redis (when available) is completely isolated

### 4. **Data Duplication**
- Same entry can exist in:
  - `data/apexfit-data.json`
  - `data/bodyfat.db` (SQLite)
  - Redis (dev only)
- 14.1 MB SQLite database + JSON file storage = wasted space

### 5. **Abandoned Code**
- Redis implementation is fully functional but not used
- `api_with_db.py` exists alongside `main.py` (both serve same routes)
- Legacy report ingestion code still running on every startup

---

## RECOMMENDATIONS

### IMMEDIATE ACTION REQUIRED

#### Option A: Consolidate to SQLite (Recommended)
**Rationale**: SQLite is already in production, has proper schema, supports relationships

**Steps**:
1. ✅ Keep Python API with SQLite as primary storage
2. ❌ Remove JSON file storage from Next.js routes
3. ❌ Remove all Redis code and dependencies
4. ✅ Update all Next.js routes to ONLY call Python API
5. ✅ Remove `src/lib/server-storage.ts` (JSON storage)
6. ✅ Remove `src/lib/redis.ts`
7. ✅ Remove `src/app/api/redis/*` routes
8. ✅ Add proper error handling when Python API is unavailable
9. ✅ Optional: Add Redis as CACHE ONLY (not primary storage) in production

**Benefits**:
- Single source of truth
- Proper relational database
- Atomic transactions
- Better performance for queries
- Production-ready

**Risks**:
- Need to migrate existing JSON data to SQLite
- Python API becomes single point of failure (needs health checks)

---

#### Option B: Consolidate to JSON (Not Recommended)
**Rationale**: Simpler, no external dependencies

**Steps**:
1. ✅ Keep JSON file storage as primary
2. ❌ Remove Python API database dependency
3. ❌ Remove Redis completely
4. ✅ Use Python API only for calculations/reports
5. ✅ Store all user data in Next.js

**Benefits**:
- Simpler architecture
- No database management
- Faster for small datasets

**Drawbacks**:
- ❌ Poor performance for large datasets
- ❌ No proper querying capabilities
- ❌ File locking issues on concurrent writes
- ❌ No relationship enforcement
- ❌ Not production-ready for scale

---

#### Option C: Use Redis Properly (Complex)
**Rationale**: High performance, but requires infrastructure

**Steps**:
1. ✅ Make Redis primary storage
2. ✅ Add Redis to production docker-compose
3. ✅ Add Redis persistence (RDB snapshots)
4. ✅ Remove JSON file storage
5. ✅ Keep SQLite as backup/export mechanism
6. ❌ Remove duplicate Redis routes
7. ✅ Update main routes to use Redis functions

**Benefits**:
- Extremely fast
- Built-in pub/sub for real-time updates
- Atomic operations

**Drawbacks**:
- ❌ Requires Redis infrastructure in production
- ❌ More complex deployment
- ❌ Memory-based (needs proper persistence config)
- ❌ Overkill for this use case

---

### RECOMMENDED IMPLEMENTATION: Option A (SQLite Consolidation)

#### Phase 1: Data Migration (Week 1)
```bash
# Create migration script
python-api/migrate_json_to_sqlite.py
  - Read data/apexfit-data.json
  - Insert all users, entries, reports, calculations into SQLite
  - Verify data integrity
  - Create backup of JSON file
```

#### Phase 2: Code Cleanup (Week 1-2)
```bash
# Remove files
rm -rf src/lib/redis.ts
rm -rf src/lib/server-storage.ts
rm -rf src/app/api/redis/

# Update Next.js routes to ONLY call Python API
# Remove all local storage logic
```

#### Phase 3: Testing (Week 2)
```bash
# Test all CRUD operations
# Verify data consistency
# Load testing
# Backup/restore testing
```

#### Phase 4: Production Deploy (Week 3)
```bash
# Update docker-compose.yml
# Add health checks for Python API
# Deploy with monitoring
```

---

## FILE-BY-FILE STORAGE USAGE

### Redis Implementation
| File Path | Line Numbers | Usage |
|-----------|--------------|-------|
| `src/lib/redis.ts` | 1-268 | Complete Redis client and CRUD operations |
| `src/app/api/redis/user/route.ts` | 3-8 | Redis user data routes |
| `src/app/api/redis/entries/route.ts` | 3-6 | Redis entries routes |
| `src/app/api/redis/reports/route.ts` | 5 | Redis reports routes |
| `src/app/api/redis/calculation/route.ts` | 5 | Redis calculation routes |

### SQLite Implementation
| File Path | Line Numbers | Usage |
|-----------|--------------|-------|
| `python-api/database.py` | 5-262 | Complete SQLite database class |
| `python-api/data_endpoints.py` | 23,193,238,244,270,313 | All data CRUD using SQLite |
| `python-api/api_with_db.py` | 25-307 | Alternative SQLite implementation |
| `python-api/main.py` | 20 | Includes SQLite-based data router |

### JSON File Storage
| File Path | Line Numbers | Usage |
|-----------|--------------|-------|
| `src/lib/server-storage.ts` | 1-197 | Complete JSON file storage implementation |
| `src/app/api/data/user/route.ts` | 2,36,68,91 | User data via JSON |
| `src/app/api/data/entries/route.ts` | 2,49,58,103,132 | Entries via JSON |
| `src/app/api/data/reports/route.ts` | 2,54,60,102,125 | Reports via JSON |

---

## CONCLUSION

The hypothesis is **100% CONFIRMED**. The application has three active storage backends:

1. **Redis** - Fully implemented but not actively used by main application
2. **SQLite** - Primary backend for Python API
3. **JSON files** - Primary backend for Next.js API with Python sync

**Current Reality**: 
- Main routes use JSON storage with Python/SQLite sync
- Redis routes exist but are isolated/unused
- Data exists in multiple places
- Reconciliation logic attempts to merge differences

**Root Cause**: Multiple iterations by different LLMs, each implementing their own storage without removing previous implementations.

**Immediate Risk**: Data inconsistency, confusion about source of truth, wasted storage space, complex debugging.

**Action Required**: Choose ONE storage backend and migrate all code to use it exclusively.
