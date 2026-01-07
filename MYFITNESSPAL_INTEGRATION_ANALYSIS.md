# MyFitnessPal Integration Analysis

## Executive Summary

**Goal:** Compare user's actual calorie intake (from MyFitnessPal) against PRIME progression plan target calories.

**Challenge:** MyFitnessPal discontinued public API access in 2020. Official API only available to approved commercial partners.

**Status:** Evaluating alternative approaches

---

## Option 1: Manual CSV Import ⭐ **RECOMMENDED**

### Overview
Allow users to export their MyFitnessPal data as CSV and upload it to the app.

### Pros
- ✅ No API dependencies or authentication complexity
- ✅ Works with free MyFitnessPal accounts
- ✅ User maintains full data privacy and control
- ✅ Simple implementation (2-3 hours)
- ✅ No ongoing API maintenance or rate limiting concerns

### Cons
- ❌ Requires manual user action to export/upload
- ❌ Not real-time (periodic updates only)
- ❌ User must know how to export from MFP

### Implementation Plan

#### 1. CSV Parser Service
```typescript
// src/lib/myfitnesspal-csv-parser.ts
interface MFPEntry {
  date: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function parseMFPCSV(csvContent: string): MFPEntry[] {
  // Parse CSV with columns: Date, Calories, Protein, Carbs, Fat
  // Handle various date formats
  // Validate numeric values
  // Return structured data
}
```

#### 2. Upload Component
```typescript
// src/components/calorie-tracker/mfp-csv-upload.tsx
// File upload with drag-and-drop
// Preview parsed data before import
// Validate date ranges
// Confirm import action
```

#### 3. Storage & Comparison
```typescript
// Store in Redis under user:${userId}:calorie_entries
// Create comparison widget showing:
// - Daily: MFP actual vs PRIME target
// - Weekly averages with variance
// - Trend chart with both lines
// - Alert if variance exceeds ±500 cal for 3+ days
```

#### 4. UI/UX Flow
1. User clicks "Import Calorie Data" button
2. Modal shows instructions: "Export your data from MyFitnessPal → Diary → Export Data"
3. User uploads CSV file
4. Preview table shows parsed entries
5. Confirmation imports data to app
6. Dashboard shows comparison widget

### Estimated Time
- CSV Parser: 1 hour
- Upload Component: 1.5 hours
- Storage & API: 1 hour
- Comparison Widget: 2 hours
- **Total: 5.5 hours**

---

## Option 2: Third-Party API Integration (Cronometer)

### Overview
Integrate with Cronometer, which has a developer API and is a popular MFP alternative.

### Pros
- ✅ Official API with good documentation
- ✅ Real-time data sync
- ✅ More detailed nutrition tracking than MFP
- ✅ OAuth authentication flow available

### Cons
- ❌ Requires users to switch from MFP to Cronometer
- ❌ Cronometer has smaller user base
- ❌ API access requires paid Cronometer Gold subscription ($50/year)
- ❌ More complex OAuth implementation
- ❌ Ongoing API maintenance and rate limits

### Implementation Complexity
**Estimated Time: 12-15 hours**

---

## Option 3: Manual Entry Widget 🎯 **FALLBACK OPTION**

### Overview
Simple daily calorie logging within the app itself.

### Pros
- ✅ Full control, no external dependencies
- ✅ Works for users of any tracking app (or no app)
- ✅ Real-time updates
- ✅ Can add custom fields (e.g., meal timing, macros)

### Cons
- ❌ Duplicate data entry for existing MFP users
- ❌ Less likely to be used consistently
- ❌ No automatic historical data import

### Implementation Plan

#### Quick Entry Widget
```typescript
// src/components/calorie-tracker/daily-entry.tsx
interface DailyCalorieEntry {
  date: string
  actualCalories: number
  targetCalories: number  // from PRIME
  notes?: string
}

// Simple form:
// - Date picker (defaults to today)
// - Calorie input field
// - Shows PRIME target automatically
// - Displays variance: +/- calories
```

#### Dashboard Integration
- Card showing today's entry with variance
- Weekly trend chart
- Quick entry button always visible

### Estimated Time
**Total: 3-4 hours**

---

## Option 4: Web Scraping (NOT RECOMMENDED)

### Overview
Scrape MyFitnessPal website to extract data.

### Why We Don't Recommend This
- ❌ Violates MyFitnessPal Terms of Service
- ❌ Extremely fragile (breaks with any UI change)
- ❌ Requires user credentials (security risk)
- ❌ Could result in account bans
- ❌ Legal liability concerns
- ❌ High maintenance burden

**Status: REJECTED**

---

## Recommended Implementation Strategy

### Phase 1: Manual Entry Widget (Quick Win)
**Timeline: 1 week**
- Implement basic daily calorie logging
- Create comparison widget on dashboard
- Get user feedback

### Phase 2: CSV Import (Value Add)
**Timeline: 1 week**
- Add CSV upload functionality
- Support bulk historical import
- Enhanced comparison analytics

### Phase 3: Evaluate Third-Party APIs (Future)
**Timeline: Future consideration**
- Monitor user feedback
- Evaluate demand for real-time sync
- Consider Cronometer or other APIs if justified

---

## Technical Architecture

### Data Model
```typescript
interface CalorieEntry {
  id: string
  userId: string
  date: string  // ISO date: "2025-11-16"
  actualCalories: number
  targetCalories: number  // from PRIME progression
  source: 'manual' | 'csv_import' | 'api'
  notes?: string
  createdAt: Date
}
```

### Storage Strategy
```typescript
// Redis Keys
user:${userId}:calorie_entries:${date}  // Individual entry
user:${userId}:calorie_entries:index    // Sorted set for range queries

// SQLite Backup
CREATE TABLE calorie_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  actual_calories INTEGER NOT NULL,
  target_calories INTEGER NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, entry_date)
);
```

### API Endpoints
```
GET    /api/calorie-entries              # List entries with date range
POST   /api/calorie-entries              # Create/update entry
DELETE /api/calorie-entries/:date        # Delete entry
POST   /api/calorie-entries/import-csv   # Bulk import from CSV
GET    /api/calorie-entries/comparison   # Get variance analytics
```

### Comparison Widget Design
```
┌─────────────────────────────────────────┐
│ Calorie Tracking                        │
├─────────────────────────────────────────┤
│ Today: Nov 16, 2025                     │
│                                         │
│ Target (PRIME):  2,200 cal              │
│ Actual (Logged): 2,450 cal              │
│ Variance:        +250 cal  ⚠️           │
│                                         │
│ [Quick Entry] [Import CSV]              │
│                                         │
│ ┌─── Weekly Trend ───────────────────┐ │
│ │     Target ─── Actual ───          │ │
│ │  2.5k ╱╲                           │ │
│ │  2.0k╱  ╲╱╲                        │ │
│ │       Mon Tue Wed Thu Fri Sat Sun  │ │
│ └────────────────────────────────────┘ │
│                                         │
│ 7-day avg variance: +180 cal/day        │
│ Status: Slightly over target 📊         │
└─────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Document analysis complete
2. ⏳ **Decision needed:** Which option to implement first?
3. ⏳ Create TaskMaster tasks for chosen approach
4. ⏳ Begin implementation

---

## Resources

- MyFitnessPal CSV Export: Settings → Data & Privacy → Export Data
- Cronometer API Docs: https://cronometer.com/api/
- Alternative Apps with APIs:
  - Lose It! (no public API)
  - Nutritionix (commercial API available)
  - FatSecret (public API available)

---

**Last Updated:** 2025-11-16  
**Status:** Analysis Complete - Awaiting Implementation Decision
