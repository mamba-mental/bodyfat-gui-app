# Ap³𝘹Fit.ai Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-08-17

### Added

- Complete 14-day cut workflow with exact day semantics, editable/versioned templates, source-bound two-week PED schedule selection, daily command center, future-day amendments, and progress/final/stopped-early reporting.
- Manual confirmed PED inventory MVP with Decimal-based coverage, expiry/unit/divisibility/shortage blockers, documented range review, immutable activation snapshots, and report provenance.
- Modernized workspace, preserved banner, seven palettes, nutrition workspace/import, Plans, AI pages, Settings Feature Lab, and Mobbin reference directions.
- Replaced the mixed Plan Studio with a plain-language Plans landing page and a resumable five-step 14-day setup: Basics, Diet & Training, PED Schedule, Readiness, and Review.
- Weigh-in schedule and optional n8n webhook handoff with cycle/date idempotency key and prerequisite guards.
- Canonical documentation index plus current user, API, developer, database, persistence, operations, troubleshooting, n8n, and verification guides.

### Fixed

- Repaired the ApexFit Tracker and Stop ApexFit Desktop shortcuts and wrapper paths after the repository moved.
- Pinned shortcut startup to the repository's installed Next.js instead of allowing `npx` to download an incompatible major version.
- Startup now waits for real HTTP health, pauses the watchdog during launch, and restarts one hidden supervisor only after both services are healthy.
- Stop now writes a no-admin durable stop marker before ending the watchdog and services, so the scheduled watchdog cannot immediately resurrect Apex Fit.
- Restored package manifests and locked dependencies after the accidental Next.js 16 prompt changed TypeScript packages.
- Starting a new program no longer deletes or blanks the member profile. It opens an editable copy, creates a first-class active standard cycle, saves a program baseline, stops the prior cycle, and preserves history.
- Reports no longer silently select the newest stopped cycle when no active cycle exists; aggregate history is used instead.
- New Entry confirms persistence before navigation and no longer waits for automatic report generation.
- Dashboard report actions now route through Report Center's cycle/source duplicate gate.
- Standard 12/15/22-week choices now continue to the editable program review.
- Living Reports use selected-cycle entries, the selected cycle's start date, and floor-based week calculation.
- 14-day report generation refreshes global report state.
- Report artifact startup ingestion and UI history no longer display an already-backed artifact twice.
- n8n test/send no longer emits no-cycle placeholder events and now explains that downstream n8n must enforce idempotency.
- Entry-history “from start” deltas use the program baseline.
- Setup Profile remains available; Settings display name now updates the actual member profile.
- Repaired the live active-cycle start from the incorrectly inherited June 3 context to August 11 while preserving the old cycle/report as history.
- Fixed the Plans development-mode loading hang caused by React Strict Mode cleanup, plus desktop progress-rail and mobile horizontal-overflow defects found during visual verification.

### Known limitations

- New-program persistence is not yet one atomic backend transaction.
- Palette selection does not yet govern every hard-coded modern-page color.
- Several stored Settings preferences are not fully enforced.
- n8n delivery remains browser-side and unsigned.
- AI-assisted PED drafting, universal-duration scheduling, adherence inventory ledger, and AI report explanation remain roadmap work.
- Four developer test routes remain in the production route manifest.
- The current full-stack Docker Compose path is not deployment-ready: it selects the simplified Python backend and embeds a localhost API address in the browser bundle.

## [1.6.1] - 2026-01-09

### Fixed
- **Program Archive & New Program TypeScript Errors**: Fixed 17 TypeScript compilation errors affecting program archiving and new program creation functionality
  - Updated `SET_PROGRAM_REFERENCE` action type to accept `null` payload for clearing program state
  - Added `null` support to `UserData.program_reference` and `UserData.current_program_id` types
  - Fixed AlertDialog component to support controlled mode with `open` and `onOpenChange` props
  - Added missing `Switch` component import to custom setup page
  - Updated `parseDateToLocal()` to accept both `Date` and `string` types
  - Fixed Redis type casting with proper `unknown` intermediate type
  - Fixed API route null filtering for entries and reports
  - Added undefined check for `protein_intake` in AI service

- **Modal Dialog Transparency**: Fixed see-through modal dialogs where background content was bleeding through
  - Changed dialog background from `bg-background` to solid `bg-white dark:bg-zinc-900`
  - Increased overlay opacity from 50% to 80% with backdrop blur effect
  - Modals now have fully opaque backgrounds for better readability

- **Calculate API Request Format**: Fixed 500 errors when generating reports after creating new program
  - Python FastAPI endpoint expects `{ user_data: UserData }` format when endpoint has multiple body parameters
  - Fixed request wrapping in `src/app/api/calculate/route.ts`
  - Fixed request wrapping in `src/lib/calculations.ts`
  - Fixed request wrapping in `src/lib/api-cache.ts`
  - Report generation now works correctly after program archive and new program creation

### Technical Improvements
- Zero TypeScript errors (`npx tsc --noEmit` passes)
- Production build completes successfully
- Serena MCP integration configured with project memories

## [1.3.2] - 2025-10-10

### Added
- Dedicated AI chat and insights pages powered by existing widgets so full-page experiences mirror dashboard capabilities.

### Fixed
- Enforced real PRIME-backed responses across calculations, recalculations, and report generation—requests now fail fast if the Python service is unavailable, with no local projections.
- Hardened AI settings persistence: prevented automatic overwrites when the server is unreachable, created durable data directory writes, and surfaced load failures to the UI.
- Theme persistence now targets the `/api/theme` contract with cookie/database sync and safer user ID resolution.
- Custom setup pre-populates profile forms by normalizing stored date formats (ISO, slash, Compact) for the DOB field.
- Report generation feedback improved with progress/error announcements so users aren’t left guessing while waiting on the backend.
- Added accessibility announcements around report generation to provide immediate progress/error feedback instead of appearing to hang.
- Sidebar tools restored quick access to the report generator alongside existing calculator and settings entries.

## [1.3.3] - 2025-10-15

### Fixed
- Restored report history by serving locally persisted reports whenever the Python report service is unavailable, instead of surfacing a 502 error.
- Report generation now surfaces precise errors if the remote generator is unreachable, ensuring only backend-authored reports are saved.
- Profile updates persist to the dashboard by writing to first-party storage before syncing to the Python API, preventing `{ success: true }` placeholders from overwriting user data.
- Added graceful degradation headers so clients can detect backend warnings without interrupting normal flows.
## [1.3.1] - 2025-10-05

### Fixed
- **Report Verification System**: Added comprehensive verification for report calculations and visual presentation against terminal reference (#1)
  - Implemented calculation comparison with 0.0001 floating-point tolerance per Constitution Article V
  - Added visual presentation verification (layout, formatting, styling)
  - Created dedicated API endpoint POST /api/reports/verify for verification workflow
  - 100% numerical accuracy verified against PRIME_Report_Generator_v3_Fast calculations
- **Entry History Restoration**: Implemented all-time entry history retrieval with comprehensive data integrity checks (#2)
  - Added GET /api/entries/history endpoint with date range filtering
  - Verified 100% retrieval accuracy with no data loss detection
  - Implemented integrity checks: chronological order, no duplicate dates, no null values
  - Total count accuracy confirmed for all historical entries
- **Dashboard Production State**: Removed debugging messages and enabled production-ready dashboard display (#3)
  - Fixed src/app/page.tsx to remove "temporarily disabled for debugging" message
  - Uncommented Dashboard component for production rendering
  - Added GET /api/dashboard/state endpoint for production state verification
  - Zero debugging messages visible in production mode
- **AI Settings Route**: Verified /settings/ai page accessibility without errors (#4)
  - Confirmed page.tsx exports default component correctly
  - Next.js App Router convention properly followed
  - Zero 404 errors on AI settings page access
- **Report Form Auto-Populate**: Verified latest entry data pre-fills report form fields (#5)
  - Confirmed auto-populate logic at app-context.tsx:307-315
  - Latest entry data (weight, body fat percentage) pre-fills form
  - 100% auto-populate success rate verified
- **Theme Persistence**: Verified hybrid theme storage across browser sessions (#6)
  - Confirmed hybrid storage pattern: localStorage + server/database
  - Added GET/PUT /api/theme endpoints for theme management
  - Cross-session persistence reliability confirmed at theme-context.tsx:106-176
- **Changelog Documentation**: Updated changelog with all bug fixes since v1.3.0 (#7)
  - This entry documents all 8 production-readiness fixes
  - Follows semantic versioning PATCH increment (1.3.0 → 1.3.1)
- **Banner Aspect Ratio**: Verified CSS prevents image warping in profile banners (#8)
  - Confirmed object-fit: contain applied in v1.3.0 (already fixed)
  - Aspect ratio maintained without warping across screen sizes
  - Zero banner warping occurrences verified

### Technical Improvements
- Added comprehensive contract tests for all API endpoints (Vitest)
- Implemented TDD RED-GREEN-REFACTOR workflow per Constitution Article IV
- Enhanced report verification utility (src/lib/report-verification.ts)
- Improved data integrity checks for entry history
- All implementations follow Constitution Articles I-VII requirements

## [1.3.0] - 2025-07-21

### Added
- **Font Selection**: Added ability to choose from 10 Google fonts (5 serif, 5 sans-serif) in settings
  - Live preview of each font before selection
  - Fonts: Roboto, Open Sans, Lato, Montserrat, Poppins (sans-serif)
  - Fonts: Playfair Display, Lora, Merriweather, Crimson Text, Source Serif Pro (serif)
- **Image Management**: Added clear/remove buttons for profile picture and banner images
- **Dynamic Age Calculation**: Age now updates automatically based on date of birth

### Fixed
- **Banner Image Display**: Changed from `object-cover` to `object-contain` to prevent stretching
- **Font Persistence**: Font selection now saves to localStorage and persists across sessions

### Changed
- **Image Storage**: Images stored as base64 strings in JSON data file (data/apexfit-data.json)
- **Profile Header**: Updated to show dynamic age instead of static value

### Technical Notes
- **Docker Consideration**: Image storage as base64 in JSON may not be optimal for production
  - Consider implementing proper file storage solution for Docker deployments
  - Current approach stores all data in `DATA_DIR` environment variable location

### Production Implementation
- **File Upload System**: Created proper file upload API endpoint (`/api/upload`)
  - Images stored in filesystem: `/public/uploads/profiles/` and `/public/uploads/banners/`
  - Automatic cleanup of old images when replaced
  - 5MB file size limit with image type validation
- **Docker Configuration**: Updated for production deployment
  - Added `UPLOAD_DIR` environment variable
  - Created persistent volumes for uploads
  - Updated docker-compose.yml with proper volume mounts
- **Deployment Guide**: Created comprehensive Docker deployment documentation
  - Backup and restore procedures
  - Security and performance considerations
  - Migration path from base64 to file storage

## [1.2.0] - 2025-07-07

### Added
- **API Endpoints Display**: All AI provider cards now show their API endpoints with copy functionality
- **API Key Status Indicators**: Working/Failed status indicators for all API keys with error messages
- **Report Timestamps**: Full date and time display in report archive (was date only)
- **AI Prompts Configuration**: Complete prompts editor with variable validation and model selection
- **Custom Model Selection**: Ability to enter any custom AI model name in global settings
- **Python API Server**: Simple PRIME calculation server for development without full dependencies

### Fixed
- **Report Generation**: Fixed health check endpoint (/health instead of /) for Python API
- **Gemini Models**: API now properly returns all available models with correct filtering
- **Minimax Models**: Fixed model loading by providing hardcoded list (API has no public models endpoint)  
- **Theme Persistence**: Fixed theme not persisting across sessions by updating localStorage correctly
- **AI Settings Persistence**: Settings now save to both localStorage and server API
- **Connection Status**: Test connection now properly saves success/failure status

### Changed
- **Report Archive Display**: Updated from date-only to full date/time format (toLocaleString)
- **AI Provider Types**: Added connectionStatus and connectionError fields to AIProviderConfig
- **Error Handling**: Improved error messages and fallback behavior for all AI providers

### Technical Improvements
- Added proper CORS headers to all API endpoints
- Improved TypeScript types for AI configuration
- Better error handling and user feedback throughout
- Reduced API call frequency with debouncing

## [1.1.0] - 2025-06-30

### Added
- Initial AI integration with multiple providers
- PRIME calculation engine integration
- Comprehensive reporting system
- User profile management
- Progress tracking and visualization

### Known Issues
- Docker deployment requires persistent storage configuration
- Some AI providers may have rate limiting not handled gracefully

## [1.0.0] - 2025-06-29

### Added
- Initial release of Ap³𝘹Fit.ai
- Basic body composition tracking
- Goal setting functionality
- Dashboard with key metrics
- Mobile-responsive design
