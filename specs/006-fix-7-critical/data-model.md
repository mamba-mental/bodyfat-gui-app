# Data Model

**Feature**: Critical Issues Resolution (006-fix-7-critical)
**Date**: 2025-10-07
**Status**: Complete

## Entity Definitions

### 1. PRIME Report

**Purpose**: Comprehensive body composition analysis report generated from PRIME calculation modules

**Fields**:
- `reportId`: UUID, primary key
- `userId`: UUID, foreign key to User
- `generatedAt`: Timestamp (ISO 8601)
- `templateVersion`: String (e.g., "14-section-format")
- `calculationEngine`: String (e.g., "PRIME_Report_Generator_v3_Fast")
- `numericalData`: JSON object containing all PRIME calculations
- `pdfPath`: String, file system path to generated PDF
- `htmlPath`: String, file system path to HTML version (optional)

**Validation Rules**:
- `numericalData` must contain all required PRIME calculation fields
- Numerical accuracy within 0.0001 tolerance compared to terminal reference
- `templateVersion` must match templates/ directory structure
- `calculationEngine` must be "PRIME_Report_Generator_v3_Fast" (Constitution Article I)

**Relationships**:
- BelongsTo: User (one report per generation event)
- ReferencesMany: Entries (report uses historical entry data for calculations)

**State Transitions**:
```
[Requested] → [Generating] → [Completed]
                         ↓
                    [Failed]
```

**Constitutional Compliance**:
- Article I: Must use PRIME modules from new_prime_python_code/
- Article V: Output must match terminal version reference numerically and visually

---

### 2. Entry

**Purpose**: Historical user measurement data for body composition tracking

**Fields**:
- `entryId`: UUID, primary key
- `userId`: UUID, foreign key to User
- `recordedAt`: Timestamp (ISO 8601)
- `weight`: Float (kg or lbs)
- `bodyFatPercentage`: Float (0-100)
- `waistCircumference`: Float (cm or inches, optional)
- `height`: Float (cm or inches)
- `age`: Integer (years)
- `gender`: Enum ('male', 'female', 'other')
- `activityLevel`: Enum ('sedentary', 'light', 'moderate', 'active', 'very_active')
- `notes`: Text (optional)

**Validation Rules**:
- `weight` > 0
- `bodyFatPercentage` >= 0 AND <= 100
- `height` > 0
- `age` > 0 AND < 150
- All historical entries must be preserved (Constitution Article II)

**Relationships**:
- BelongsTo: User
- ReferencedBy: Report (reports use entry data for PRIME calculations)

**Indexes**:
- `userId, recordedAt DESC` for latest entry queries (supports auto-populate FR-012)

**Constitutional Compliance**:
- Article II: All entries persist across schema updates, no data loss allowed

---

### 3. AI Settings

**Purpose**: User configuration for AI provider selection and API key management

**Fields**:
- `settingsId`: UUID, primary key
- `userId`: UUID, foreign key to User
- `aiProvider`: Enum ('openai', 'anthropic', 'perplexity', 'custom')
- `apiKey`: String (encrypted at rest)
- `modelAssignment`: JSON object mapping task types to model IDs
- `defaultModel`: String (model ID)
- `rateLimitConfig`: JSON object (optional)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp

**Validation Rules**:
- `apiKey` must be encrypted before storage
- `aiProvider` must be one of supported providers
- `modelAssignment` structure validated against provider schema

**Relationships**:
- BelongsTo: User (one AI settings record per user)

**Storage Strategy**:
- Persistent storage (database)
- Accessible via /settings/ai route (FR-009)

**Security Requirements**:
- API keys encrypted at rest
- Never logged or exposed in error messages

---

### 4. Theme Preference

**Purpose**: User color scheme preference (light/dark/system)

**Fields**:
- `preferenceId`: UUID, primary key
- `userId`: UUID, foreign key to User (nullable for unauthenticated)
- `theme`: Enum ('light', 'dark', 'system')
- `persistenceMethod`: Enum ('localStorage', 'database', 'cookie')
- `lastUpdated`: Timestamp

**Validation Rules**:
- `theme` must be one of: 'light', 'dark', 'system'
- For authenticated users: `userId` must be set, `persistenceMethod` = 'database' + 'cookie'
- For unauthenticated users: `userId` = null, `persistenceMethod` = 'localStorage'

**Relationships**:
- BelongsTo: User (optional, nullable for guest users)

**Persistence Strategy** (Hybrid - Constitution Article III):
- **Unauthenticated**: localStorage only
- **Authenticated**: Database (cross-device sync) + SSR cookie (initial page load) + localStorage (fast client-side)

**State Synchronization**:
```
User selects theme
  ↓
localStorage updated (immediate)
  ↓
Database updated (authenticated only)
  ↓
Cookie set (authenticated only, SSR support)
```

**Constitutional Compliance**:
- Article III: Hybrid persistence balances performance, sync, and SSR compatibility

---

### 5. Changelog Entry

**Purpose**: Project version history and release documentation

**Fields**:
- `version`: String (semantic versioning, e.g., "v1.3.1")
- `releaseDate`: Date (YYYY-MM-DD)
- `category`: Enum ('Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security')
- `description`: Text (markdown supported)
- `issueReferences`: Array of Strings (GitHub issue/PR links)
- `breakingChanges`: Boolean (default false)

**Validation Rules**:
- `version` must follow semantic versioning (MAJOR.MINOR.PATCH)
- `category` must be one of conventional changelog categories
- Patch versions (x.x.PATCH) should primarily use 'Fixed' category

**Relationships**:
- None (documentation entity, not relational)

**File Format**: Markdown (CHANGELOG.md at repository root)

**Update Strategy**:
- Manual updates based on git commit history analysis (research.md Decision #4)
- Parse commits since last release tag
- Group by category
- Reference functional requirements and issue numbers

---

### 6. Profile Banner

**Purpose**: User-uploaded banner image for profile page display

**Fields**:
- `bannerId`: UUID, primary key
- `userId`: UUID, foreign key to User
- `originalFilename`: String
- `storedPath`: String (file system path)
- `mimeType`: String (e.g., "image/jpeg", "image/png")
- `uploadedAt`: Timestamp
- `originalWidth`: Integer (pixels)
- `originalHeight`: Integer (pixels)
- `displayAspectRatio`: String (e.g., "16:9", "21:9")

**Validation Rules**:
- `mimeType` must be supported image format (JPEG, PNG, WebP, SVG)
- File size < 5MB
- Minimum dimensions: 800x200 pixels

**Display Requirements** (FR-020, FR-021, FR-022):
- CSS `object-fit: contain` prevents warping
- CSS `aspect-ratio` maintains standard dimensions
- Responsive across screen sizes

**Relationships**:
- BelongsTo: User

**Storage**:
- File system: public/uploads/banners/{userId}/{bannerId}.{ext}
- Database: Metadata only

---

## Database Schema Changes

**Required Changes**: NONE

**Rationale**: All 8 issues are bug fixes on existing functionality. No schema migrations needed.

**Existing Schema** (SQLite at data/bodyfat.db):
- `users` table
- `entries` table (12 historical entries confirmed)
- `reports` table
- `ai_settings` table
- `theme_preferences` table
- `profile_banners` table

**Data Integrity**:
- All existing entries preserved (Constitution Article II)
- No breaking changes to API contracts
- Backward compatible with existing user data

---

## API Contracts Reference

See `contracts/` directory for detailed OpenAPI specifications:
- `contracts/report-generation.yaml` - Report generation endpoints
- `contracts/entry-management.yaml` - Entry CRUD operations
- `contracts/ai-settings.yaml` - AI configuration endpoints
- `contracts/theme-persistence.yaml` - Theme preference endpoints

---

## Constitutional Compliance Matrix

| Entity | Article I | Article II | Article III | Article IV | Article V |
|--------|-----------|------------|-------------|------------|-----------|
| PRIME Report | ✅ Uses PRIME modules | ✅ Preserves data | N/A | ✅ Contract tests required | ✅ Matches terminal reference |
| Entry | N/A | ✅ No data loss | N/A | ✅ Integration tests required | N/A |
| AI Settings | N/A | ✅ Persistent storage | ✅ Page accessible | ✅ E2E tests required | N/A |
| Theme Preference | N/A | ✅ Hybrid persistence | ✅ Hybrid approach | ✅ Integration tests required | N/A |
| Changelog Entry | N/A | N/A | N/A | N/A | N/A |
| Profile Banner | N/A | ✅ Metadata persists | N/A | ✅ Integration tests required | N/A |

---

**Data Model Complete**: All entities defined, validation rules specified, constitutional compliance verified.
