# Project Context

## Purpose
Body composition tracking application that provides comprehensive health metrics and PRIME (Precision-Refined Integrated Metabolic Estimation) analysis for users monitoring their fitness journey.

## Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **TypeScript** - Type-safe development
- **React 19** - Component architecture
- **Tailwind CSS** - Utility-first styling
- **Turndown** - HTML to Markdown conversion for report downloads
- **jsPDF** - Client-side PDF generation

### Backend
- **Python FastAPI** - High-performance API server
- **SQLite** - Persistent data storage
- **Redis** - Session and cache management

### Deployment
- **Docker Compose** - Multi-container orchestration
- **Portainer** - Container management interface
- **Containers**:
  - `apex-fit-dev` - Next.js frontend (port 7899)
  - `apex-fit-python-api-dev` - FastAPI backend (port 3005)
  - `apex-fit-redis-dev` - Redis cache

## Project Conventions

### Code Style
- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **File naming**: kebab-case for files, PascalCase for components
- **Imports**: Absolute imports using `@/` path alias

### Architecture Patterns
- **React Context API**: State management via `app-context.tsx` and `theme-context.tsx`
- **Server/Client Hydration**: Data fetching patterns for Next.js SSR/CSR
- **Component Structure**: Separation of concerns with dedicated components, hooks, contexts, and lib utilities
- **API Routes**: Next.js API routes proxy to Python FastAPI backend

### Testing Strategy
- Contract tests for API schema validation
- Integration tests for Python-JavaScript interactions
- E2E tests using Playwright
- Test-First Development (TDD) with Red-Green-Refactor cycle
- Coverage target: >80% for critical paths

### Git Workflow
- **Main Branch**: `master`
- **Current Branch**: `fix/issues`
- Feature branches for new development
- Test verification before commits

## Domain Context

### Health & Fitness Metrics
- Body composition calculations (body fat percentage, lean mass)
- PRIME analysis engine for metabolic estimations
- Historical tracking of measurements over time
- Dashboard widgets for visualizing progress

### PRIME Engine
- Python-based report generation system
- 14-section comprehensive health analysis
- Numerical precision requirements (0.0001 tolerance)
- Template-based PDF generation

## Important Constraints

### Recent Fixes (Commit 8eaec05 - 2025-11-16)
1. ✅ **Report Generation Flow**: Fixed blocked generation by removing premature useMountedRef guards
2. ✅ **Download Buttons**: Implemented Turndown library for proper HTML→MD conversion; unified PDF generation
3. ✅ **Profile Banner Display**: Fixed CSS (object-cover) and added sizing guidance tooltip
4. ✅ **Status Diagnostics**: Added live report generation status tracking with entry date display

### Current Technical Issues (Active Investigation)
1. **Dashboard Widgets Empty**: Widgets rendering without data despite Redis/API having correct values
2. **Profile Persistence**: User profile data not persisting between browser sessions
3. **React Lifecycle Guards**: Task 19 in-progress - need to add mounted checks to remaining async components

### Data Integrity
- **Zero Data Loss**: All 12 historical entries must be preserved in database
- **Database Path**: `data/bodyfat.db` (SQLite)
- **PRIME Modules**: Located in `new_prime_python_code/`

### Performance Requirements
- Report generation: <5 seconds
- Dashboard load: Should be interactive within seconds
- API response times: <500ms for standard queries

### Constitutional Compliance
- Test-First Development (TDD) mandatory
- File size: ≤300 lines per file
- Function size: ≤50 lines per function

## External Dependencies

### Python API Endpoints
- `POST /api/calculate` - Body composition calculations
- `POST /api/generate-report` - PRIME report generation
- `GET/POST /api/data/*` - Data persistence operations

### Storage Systems
- **Redis**: Session data, cache, temporary state
- **SQLite**: Persistent user data, historical entries
- **File System**: PRIME templates in `templates/` directory

### Development Tools
- **Docker Compose**: Container orchestration
- **Portainer**: Web-based container management
- **npm/Node.js**: Frontend build and development

### State Management Flow
```
User Interaction → React Context (app-context.tsx/theme-context.tsx)
                 → Next.js API Routes
                 → FastAPI Backend (port 8001)
                 → Redis (port 6385) / SQLite
                 → Response → Context Update → UI Re-render
```

### Report Generation Flow (Updated 2025-11-16)
```
Generate Button Click → app-context.tsx:generateNewReport()
                     → Update status: "Starting report generation..."
                     → Fetch latest entry data
                     → POST /api/data/calculation (backend)
                     → Update status: "Requesting detailed report from Python service..."
                     → POST /api/generate-report (Python API)
                     → Save report to Redis/SQLite
                     → Update status: "Report generated and saved successfully."
                     → Dispatch ADD_REPORT action
                     → UI updates with new report
```

### Download Button Flow (Updated 2025-11-16)
```
Download Click → Get report.html_content (from Python)
              → HTML: Direct download as blob
              → Markdown: Convert via Turndown → Download
              → PDF: generatePDFFromHTML(html_content) → Download
```

### Known Hydration Patterns
- Server-side data fetching in layout/page components
- Client-side state hydration via React Context providers
- Potential mismatch causing empty widget renders
